"""Text chunker preserving accurate page numbers and document metadata."""
import re
from typing import List, Dict, Any


class TextChunker:
    def __init__(self, chunk_size: int = 500, chunk_overlap: int = 100):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    def chunk_document_pages(
        self,
        pages_data: List[Dict[str, Any]],
        doc_id: str,
        owner_id: int,
        title: str
    ) -> List[Dict[str, Any]]:
        """
        Splits pages into overlapping chunks while preserving exact page number metadata.
        Returns: List of chunk dictionaries ready for embedding and Chroma storage.
        """
        all_chunks = []
        global_chunk_idx = 0

        for page in pages_data:
            page_num = page["page_number"]
            text = page["text"]

            if not text:
                continue

            # Split text by paragraphs / sentences
            sentences = re.split(r'(?<=[.?!])\s+', text)
            current_chunk = []
            current_len = 0

            for sentence in sentences:
                sentence_len = len(sentence)
                if current_len + sentence_len > self.chunk_size and current_chunk:
                    chunk_text = " ".join(current_chunk).strip()
                    if chunk_text:
                        all_chunks.append({
                            "id": f"{doc_id}_p{page_num}_c{global_chunk_idx}",
                            "doc_id": doc_id,
                            "owner_id": owner_id,
                            "title": title,
                            "page_number": page_num,
                            "chunk_index": global_chunk_idx,
                            "content": chunk_text
                        })
                        global_chunk_idx += 1

                    # Keep last sentence for overlap
                    overlap_sentences = []
                    overlap_len = 0
                    for s in reversed(current_chunk):
                        if overlap_len + len(s) < self.chunk_overlap:
                            overlap_sentences.insert(0, s)
                            overlap_len += len(s)
                        else:
                            break
                    current_chunk = overlap_sentences
                    current_len = overlap_len

                current_chunk.append(sentence)
                current_len += sentence_len

            # Flush remaining chunk on this page
            if current_chunk:
                chunk_text = " ".join(current_chunk).strip()
                if chunk_text:
                    all_chunks.append({
                        "id": f"{doc_id}_p{page_num}_c{global_chunk_idx}",
                        "doc_id": doc_id,
                        "owner_id": owner_id,
                        "title": title,
                        "page_number": page_num,
                        "chunk_index": global_chunk_idx,
                        "content": chunk_text
                    })
                    global_chunk_idx += 1

        return all_chunks
