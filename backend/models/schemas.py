"""Pydantic request and response schemas."""
from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, EmailStr


# --- Auth Schemas ---
class UserRegister(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: str = Field(..., min_length=5, max_length=100)
    password: str = Field(..., min_length=6)


class UserLogin(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    is_active: bool
    created_at: datetime


# --- Document Schemas ---
class DocumentPage(BaseModel):
    page_number: int
    text: str


class DocumentResponse(BaseModel):
    id: str
    owner_id: int
    title: str
    filename: str
    file_size: int
    mime_type: str
    page_count: int
    ocr_applied: bool
    ocr_confidence: float
    summary: Optional[str] = None
    created_at: datetime
    chunk_count: Optional[int] = 0
    file_url: Optional[str] = None


class DocumentDetailResponse(DocumentResponse):
    pages: List[DocumentPage] = []


# --- Citation & RAG Schemas ---
class CitationItem(BaseModel):
    source_title: str
    page_number: int
    passage: str
    document_id: Optional[str] = None
    source_type: str = "document"  # "document" or "web"
    url: Optional[str] = None
    verified: bool = True
    confidence: float = 1.0


class ChatQueryRequest(BaseModel):
    question: str = Field(..., min_length=1)
    session_id: Optional[str] = None
    document_ids: Optional[List[str]] = None  # None or empty = all user docs
    mode: str = "rag"  # "rag", "web", "comparison", "lit_review"
    top_k: int = 5


class ChatMessageResponse(BaseModel):
    id: str
    session_id: str
    role: str
    content: str
    citations: List[CitationItem] = []
    mode: str
    created_at: datetime


class ChatSessionResponse(BaseModel):
    id: str
    title: str
    selected_doc_ids: List[str]
    created_at: datetime
    updated_at: datetime
    messages: List[ChatMessageResponse] = []


# --- Advanced Feature Schemas ---
class ComparisonMatrixRequest(BaseModel):
    document_ids: List[str] = Field(..., min_length=1)


class ComparisonMatrixRow(BaseModel):
    document_id: str
    title: str
    problem_statement: str
    methodology: str
    dataset: str
    results: str
    limitations: str
    future_scope: str
    citations: List[CitationItem] = []


class ComparisonMatrixResponse(BaseModel):
    rows: List[ComparisonMatrixRow]
    generated_at: datetime


class LitReviewRequest(BaseModel):
    document_ids: List[str] = Field(..., min_length=1)
    focus_topic: Optional[str] = None


class LitReviewResponse(BaseModel):
    title: str
    markdown_content: str
    key_findings: List[str]
    disagreements: List[str]
    research_gaps: List[str]
    citations: List[CitationItem]
    generated_at: datetime


# --- Evaluation Schemas ---
class EvaluationRunRequest(BaseModel):
    test_suite_name: Optional[str] = "Standard RAG Benchmark"


class EvaluationItemResult(BaseModel):
    test_id: str
    category: str  # factual, citation, unanswerable, multi_paper, conflict, irrelevant, prompt_injection
    question: str
    passed: bool
    groundedness_score: float
    citation_score: float
    latency_ms: float
    details: str
    citations: List[CitationItem] = []


class EvaluationRunResponse(BaseModel):
    id: str
    test_suite_name: str
    total_tests: int
    passed_tests: int
    hit_rate: float
    mrr: float
    groundedness: float
    citation_accuracy: float
    avg_latency_ms: float
    results: List[EvaluationItemResult]
    created_at: datetime
