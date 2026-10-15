# System Architecture: AI Research Assistant with RAG

This document details the architectural design, ingestion pipeline, data model, vector search retrieval, security boundaries, and deployment topology for the **AI Research Assistant with RAG**.

---

## 1. High-Level Architecture Diagram

```mermaid
flowchart TB
    subgraph Client ["Frontend (React + Vite + Tailwind CSS)"]
        UI_Left["Left Panel: Document Viewer\n& Section Analyzer"]
        UI_Right["Right Panel: Bento Grid Notes\n& AI Insights Hub"]
        UI_Modals["Modals: Matrix, Lit Review,\nEval Dashboard, Web Research"]
    end

    subgraph Gateway ["FastAPI Application Gateway"]
        SecurityMW["Security & Rate Limiting Middleware\n(ID/Metrics only, no leak)"]
        AuthRouter["Auth Router (JWT / BCrypt)"]
        DocRouter["Documents Router (MIME validation & OCR)"]
        ChatRouter["Chat & RAG Router (Grounded stream)"]
        FeatureRouter["Matrix & Lit Review Router"]
        EvalRouter["Evaluation Dashboard Router"]
    end

    subgraph CoreEngine ["RAG & Ingestion Engine"]
        DocParser["Document Parser\n(pypdf / python-docx / OCR fallback)"]
        Chunker["Sliding Window Chunker\n(Preserves page_number & doc_id)"]
        Embedder["Embedding Engine\n(all-MiniLM-L6-v2)"]
        CitationEngine["Citation Verifier\n(Matches bracketed refs to chunks)"]
        LLMProvider["LLM Provider Abstraction\n(OpenAI / Gemini / Grok / Ollama / In-Process)"]
        WebCrawler["Web Search Service\n(Tavily / DuckDuckGo / arXiv)"]
    end

    subgraph Storage ["Persistent Data Layer"]
        SQLiteDB[("SQLite via SQLAlchemy\nUsers, Docs, Sessions, Messages, EvalRuns")]
        ChromaStore[("Persistent ChromaDB\nVectors + Page & Owner Metadata")]
        FileSystem[("Disk Storage\nPDFs & Uploaded Papers")]
    end

    Client --> Gateway
    Gateway --> CoreEngine
    CoreEngine --> Storage
```

---

## 2. Ingestion & Retrieval Flow

```mermaid
sequenceDiagram
    autonumber
    actor User as Researcher
    participant UI as Frontend App
    participant API as FastAPI Backend
    participant Parser as Doc Parser + OCR
    participant Chunker as Text Chunker
    participant VectorStore as ChromaDB
    participant LLM as LLM Provider
    participant Verifier as Citation Verifier

    User->>UI: Uploads Paper (PDF/DOCX/TXT)
    UI->>API: POST /api/documents/upload
    API->>API: Validate Magic Bytes & Size Limits
    API->>Parser: Extract text page-by-page (OCR if scanned)
    Parser-->>API: Pages with exact page_number metadata
    API->>Chunker: Split pages into overlapping chunks
    API->>VectorStore: Embed chunks & store with owner_id + doc_id
    API-->>UI: Document Ingested & Ready

    User->>UI: Types "Analyze this section" / Query
    UI->>API: POST /api/chat/query
    API->>VectorStore: Search top_k chunks (where owner_id == user.id)
    VectorStore-->>API: Relevant Passages & Page Numbers
    API->>LLM: Send Grounding Prompt with delimited untrusted context
    LLM-->>API: Raw Grounded Answer with bracketed citations [Paper, p. X]
    API->>Verifier: Verify citations against retrieved chunks
    Verifier-->>API: Verified citations + sanitized text
    API-->>UI: Display Answer with interactive citation chips
```

---

## 3. Data Model & PostgreSQL + pgvector Migration Path

The database is built on SQLAlchemy declarative models:
- **`User`**: Multi-tenant user authentication and ownership boundary.
- **`Document`**: Document metadata, file path, page count, OCR status.
- **`DocumentChunk`**: Page number, chunk text, chunk index, owner ID.
- **`ChatSession` & `ChatMessage`**: Session history, role, content, citation JSON.
- **`EvaluationRun`**: Historical benchmark run metrics and per-test diagnostics.

### Migration Path to PostgreSQL + pgvector
Migrating to enterprise PostgreSQL + pgvector requires zero schema rewrite:
1. Update connection string: `DATABASE_URL=postgresql://user:pass@host:5432/research_db`.
2. Install `psycopg2-binary` and `pgvector`.
3. In `backend/models/database.py`, add `from pgvector.sqlalchemy import Vector` and map `embedding = Column(Vector(384))` on `DocumentChunk`.
4. Update `VectorStoreService` to query via SQLAlchemy `order_by(DocumentChunk.embedding.cosine_distance(query_vector))`.

---

## 4. Security Architecture & Guardrails

1. **Content-Type Magic Bytes Validation**: Sniffs raw binary headers (`%PDF`, `PK\x03\x04`) preventing extension spoofing.
2. **Tenant Isolation**: Every vector query enforces `where={"owner_id": current_user.id}`.
3. **Untrusted Context Delimitation**: Extracted text is wrapped in `<<<UNTRUSTED_DOCUMENT_CONTEXT>>>` blocks; instructions within documents are prevented from hijacking the LLM.
4. **Privacy-Preserving Logging**: Only document IDs, token counts, and request latencies are logged. File contents are never output to server logs.
