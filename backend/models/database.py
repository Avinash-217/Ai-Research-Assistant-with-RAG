"""Database engine and SQLAlchemy ORM models."""
import os
import json
from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlalchemy import (
    create_engine, Column, Integer, String, Text, Boolean, DateTime,
    ForeignKey, Float
)
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from backend.core.config import get_settings

settings = get_settings()

# Ensure data directory exists
os.makedirs(os.path.dirname(settings.DATABASE_URL.replace("sqlite:///", "")), exist_ok=True)
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.CHROMA_PERSIST_DIR, exist_ok=True)

engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    documents = relationship("Document", back_populates="owner", cascade="all, delete-orphan")
    chat_sessions = relationship("ChatSession", back_populates="owner", cascade="all, delete-orphan")
    eval_runs = relationship("EvaluationRun", back_populates="owner", cascade="all, delete-orphan")


class Document(Base):
    __tablename__ = "documents"

    id = Column(String(64), primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    title = Column(String(255), nullable=False)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, default=0)
    mime_type = Column(String(100), default="application/pdf")
    page_count = Column(Integer, default=1)
    ocr_applied = Column(Boolean, default=False)
    ocr_confidence = Column(Float, default=1.0)
    summary = Column(Text, nullable=True)
    key_findings = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User", back_populates="documents")
    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")


class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id = Column(String(64), primary_key=True, index=True)
    document_id = Column(String(64), ForeignKey("documents.id"), index=True, nullable=False)
    owner_id = Column(Integer, index=True, nullable=False)
    page_number = Column(Integer, nullable=False)
    chunk_index = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    embedding_id = Column(String(64), nullable=True)

    document = relationship("Document", back_populates="chunks")


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(String(64), primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    title = Column(String(255), default="New Research Chat")
    selected_doc_ids = Column(Text, default="[]")  # JSON list of doc ids
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    owner = relationship("User", back_populates="chat_sessions")
    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan")

    def get_selected_doc_ids(self) -> List[str]:
        try:
            return json.loads(self.selected_doc_ids)
        except Exception:
            return []


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(String(64), primary_key=True, index=True)
    session_id = Column(String(64), ForeignKey("chat_sessions.id"), index=True, nullable=False)
    role = Column(String(20), nullable=False)  # user, assistant, system
    content = Column(Text, nullable=False)
    citations = Column(Text, default="[]")  # JSON list of citation objects
    mode = Column(String(50), default="rag")  # rag, web, comparison, lit_review
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("ChatSession", back_populates="messages")

    def get_citations(self) -> List[Dict[str, Any]]:
        try:
            return json.loads(self.citations)
        except Exception:
            return []


class EvaluationRun(Base):
    __tablename__ = "evaluation_runs"

    id = Column(String(64), primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    test_suite_name = Column(String(100), default="Standard RAG Benchmark")
    total_tests = Column(Integer, default=0)
    passed_tests = Column(Integer, default=0)
    hit_rate = Column(Float, default=0.0)
    mrr = Column(Float, default=0.0)
    groundedness = Column(Float, default=0.0)
    citation_accuracy = Column(Float, default=0.0)
    avg_latency_ms = Column(Float, default=0.0)
    details_json = Column(Text, default="[]")
    created_at = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User", back_populates="eval_runs")


def init_db():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
