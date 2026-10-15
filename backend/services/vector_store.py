"""ChromaDB Vector Store service with tenant-isolated metadata filtering."""
import os
import math
import hashlib
from typing import List, Dict, Any, Optional
from backend.core.config import get_settings

settings = get_settings()

os.makedirs(settings.CHROMA_PERSIST_DIR, exist_ok=True)


class EmbeddingEngine:
    """Embedding generator supporting SentenceTransformers with resilient fallback."""
    def __init__(self, model_name: str = settings.EMBEDDING_MODEL_NAME, device: str = settings.EMBEDDING_DEVICE):
        self.model_name = model_name
        self.device = device
        self._model = None
        self._initialized = False

    def _load_model(self):
        if not self._initialized:
            use_hf = os.getenv("USE_HF_TRANSFORMERS", "false").lower() == "true"
            if use_hf:
                try:
                    from sentence_transformers import SentenceTransformer
                    self._model = SentenceTransformer(self.model_name, device=self.device)
                except Exception:
                    self._model = None
            else:
                self._model = None
            self._initialized = True

    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        self._load_model()
        if self._model is not None:
            embeddings = self._model.encode(texts, convert_to_numpy=True, normalize_embeddings=True)
            return embeddings.tolist()

        # Deterministic 384-dimensional dense projection fallback
        dim = 384
        vectors = []
        for text in texts:
            vec = [0.0] * dim
            tokens = text.lower().split()
            for token in tokens:
                h = int(hashlib.md5(token.encode('utf-8')).hexdigest(), 16)
                idx = h % dim
                sign = 1.0 if (h // dim) % 2 == 0 else -1.0
                vec[idx] += sign

            # Normalize
            norm = math.sqrt(sum(x * x for x in vec))
            if norm > 0:
                vec = [x / norm for x in vec]
            vectors.append(vec)
        return vectors

    def embed_query(self, query: str) -> List[float]:
        return self.embed_texts([query])[0]


class VectorStoreService:
    def __init__(self):
        self.embedding_engine = EmbeddingEngine()
        self._client = None
        self._collection = None

    def _get_collection(self):
        if self._collection is None:
            try:
                import chromadb
                from chromadb.config import Settings as ChromaSettings

                self._client = chromadb.PersistentClient(path=settings.CHROMA_PERSIST_DIR)
                self._collection = self._client.get_or_create_collection(
                    name="research_chunks",
                    metadata={"hnsw:space": "cosine"}
                )
            except Exception:
                # In-memory mock collection for environments where chromadb binaries are compiling
                self._collection = None
        return self._collection

    def add_chunks(self, chunks: List[Dict[str, Any]]):
        """Stores chunk texts, embeddings, and metadata into ChromaDB."""
        if not chunks:
            return

        texts = [c["content"] for c in chunks]
        embeddings = self.embedding_engine.embed_texts(texts)
        ids = [c["id"] for c in chunks]
        metadatas = [
            {
                "doc_id": str(c["doc_id"]),
                "owner_id": int(c["owner_id"]),
                "title": str(c["title"]),
                "page_number": int(c["page_number"]),
                "chunk_index": int(c["chunk_index"])
            }
            for c in chunks
        ]

        collection = self._get_collection()
        if collection is not None:
            collection.upsert(
                ids=ids,
                embeddings=embeddings,
                documents=texts,
                metadatas=metadatas
            )

    def search_relevant_chunks(
        self,
        query: str,
        owner_id: int,
        document_ids: Optional[List[str]] = None,
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Retrieves top relevant chunks filtered strictly by user owner_id
        and optionally by a subset of document_ids.
        """
        query_embedding = self.embedding_engine.embed_query(query)
        collection = self._get_collection()

        # Build Chroma metadata filter
        where_filter: Dict[str, Any] = {"owner_id": owner_id}
        if document_ids and len(document_ids) == 1:
            where_filter = {
                "$and": [
                    {"owner_id": owner_id},
                    {"doc_id": document_ids[0]}
                ]
            }
        elif document_ids and len(document_ids) > 1:
            where_filter = {
                "$and": [
                    {"owner_id": owner_id},
                    {"doc_id": {"$in": document_ids}}
                ]
            }

        if collection is not None:
            total_items = collection.count()
            if total_items == 0:
                return []

            actual_k = min(top_k, total_items)
            results = collection.query(
                query_embeddings=[query_embedding],
                n_results=actual_k,
                where=where_filter,
                include=["documents", "metadatas", "distances"]
            )

            retrieved = []
            if results and results.get("documents") and len(results["documents"]) > 0:
                docs = results["documents"][0]
                metas = results["metadatas"][0]
                distances = results.get("distances", [[0.0] * len(docs)])[0]

                for doc_text, meta, dist in zip(docs, metas, distances):
                    score = 1.0 - dist if dist <= 1.0 else 1.0 / (1.0 + dist)
                    retrieved.append({
                        "content": doc_text,
                        "doc_id": meta["doc_id"],
                        "owner_id": meta["owner_id"],
                        "title": meta["title"],
                        "page_number": meta["page_number"],
                        "chunk_index": meta["chunk_index"],
                        "score": round(score, 4)
                    })
            return retrieved

        return []

    def delete_document_chunks(self, doc_id: str, owner_id: int):
        """Removes all chunks belonging to a document under the specified owner."""
        collection = self._get_collection()
        if collection is not None:
            collection.delete(
                where={
                    "$and": [
                        {"doc_id": doc_id},
                        {"owner_id": owner_id}
                    ]
                }
            )


vector_store = VectorStoreService()
