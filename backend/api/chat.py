"""Chat and RAG query orchestration API router."""
import uuid
import json
import re
import asyncio
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from backend.models.database import get_db, ChatSession, ChatMessage, User
from backend.models.schemas import ChatQueryRequest, ChatMessageResponse, ChatSessionResponse, CitationItem
from backend.core.security import get_current_user_optional
from backend.services.vector_store import vector_store
from backend.services.llm_provider import llm_provider
from backend.services.citation_verifier import CitationVerifier
from backend.services.web_search import web_search

router = APIRouter(prefix="/api/chat", tags=["Chat & RAG"])


@router.post("/query", response_model=ChatMessageResponse)
async def query_rag(
    req: ChatQueryRequest,
    current_user: User = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    RAG Query Endpoint:
    1. Embeds question and retrieves relevant chunks filtered by owner_id and document_ids.
    2. Gathers web sources if mode == 'web'.
    3. Calls LLM with strict grounding prompt.
    4. Verifies inline citations against retrieved passages.
    5. Saves and returns response.
    """
    session_id = req.session_id
    if not session_id:
        # Create session if none passed
        new_session = ChatSession(
            id=f"sess_{uuid.uuid4().hex[:12]}",
            owner_id=current_user.id,
            title=req.question[:40] + ("..." if len(req.question) > 40 else ""),
            selected_doc_ids=json.dumps(req.document_ids or [])
        )
        db.add(new_session)
        db.commit()
        session_id = new_session.id

    # 1. Retrieve relevant chunks from Vector Store
    retrieved_chunks = vector_store.search_relevant_chunks(
        query=req.question,
        owner_id=current_user.id,
        document_ids=req.document_ids,
        top_k=req.top_k
    )

    # 2. Web search integration if mode == 'web'
    web_citations = []
    if req.mode == "web":
        web_results = await web_search.search(req.question, max_results=3)
        for w in web_results:
            retrieved_chunks.append({
                "content": w["passage"],
                "doc_id": "web_source",
                "owner_id": current_user.id,
                "title": w["source_title"],
                "page_number": 1,
                "chunk_index": 0,
                "score": 0.95,
                "url": w.get("url")
            })
            web_citations.append(CitationItem(
                source_title=w["source_title"],
                page_number=1,
                passage=w["passage"],
                document_id="web_source",
                source_type="web",
                url=w.get("url"),
                verified=True,
                confidence=0.95
            ))

    # 3. Generate grounded answer via LLM Provider
    raw_answer = await llm_provider.generate_response(
        query=req.question,
        context_chunks=retrieved_chunks,
        mode=req.mode
    )

    # 4. Verify citations
    sanitized_answer, verified_citations = CitationVerifier.verify_and_ground_citations(
        answer_text=raw_answer,
        retrieved_chunks=retrieved_chunks
    )

    # Merge web citations if web mode
    all_citations = verified_citations + [c.dict() for c in web_citations]

    # 5. Persist ChatMessage
    msg_id = f"msg_{uuid.uuid4().hex[:12]}"
    chat_msg = ChatMessage(
        id=msg_id,
        session_id=session_id,
        role="assistant",
        content=sanitized_answer,
        citations=json.dumps(all_citations),
        mode=req.mode
    )
    db.add(chat_msg)
    db.commit()

    return ChatMessageResponse(
        id=msg_id,
        session_id=session_id,
        role="assistant",
        content=sanitized_answer,
        citations=[CitationItem(**c) for c in all_citations],
        mode=req.mode,
        created_at=chat_msg.created_at
    )


@router.post("/stream")
async def stream_rag(
    req: ChatQueryRequest,
    current_user: User = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    RAG Streaming Endpoint (SSE):
    Streams generated answer tokens in real time with typewriter latency,
    followed by verified citation payloads.
    """
    session_id = req.session_id
    if not session_id:
        new_session = ChatSession(
            id=f"sess_{uuid.uuid4().hex[:12]}",
            owner_id=current_user.id,
            title=req.question[:40] + ("..." if len(req.question) > 40 else ""),
            selected_doc_ids=json.dumps(req.document_ids or [])
        )
        db.add(new_session)
        db.commit()
        session_id = new_session.id

    # 1. Retrieve relevant chunks from Vector Store
    retrieved_chunks = vector_store.search_relevant_chunks(
        query=req.question,
        owner_id=current_user.id,
        document_ids=req.document_ids,
        top_k=req.top_k
    )

    # 2. Web search integration if mode == 'web'
    web_citations = []
    if req.mode == "web":
        web_results = await web_search.search(req.question, max_results=3)
        for w in web_results:
            retrieved_chunks.append({
                "content": w["passage"],
                "doc_id": "web_source",
                "owner_id": current_user.id,
                "title": w["source_title"],
                "page_number": 1,
                "chunk_index": 0,
                "score": 0.95,
                "url": w.get("url")
            })
            web_citations.append(CitationItem(
                source_title=w["source_title"],
                page_number=1,
                passage=w["passage"],
                document_id="web_source",
                source_type="web",
                url=w.get("url"),
                verified=True,
                confidence=0.95
            ))

    async def event_generator():
        raw_answer = await llm_provider.generate_response(
            query=req.question,
            context_chunks=retrieved_chunks,
            mode=req.mode
        )
        sanitized_answer, verified_citations = CitationVerifier.verify_and_ground_citations(
            answer_text=raw_answer,
            retrieved_chunks=retrieved_chunks
        )
        all_citations = verified_citations + [c.dict() for c in web_citations]

        # Stream tokens
        tokens = re.findall(r'\S+|\n|\s+', sanitized_answer)
        for token in tokens:
            yield f"data: {json.dumps({'type': 'token', 'token': token})}\n\n"
            await asyncio.sleep(0.012)

        # Persist ChatMessage
        msg_id = f"msg_{uuid.uuid4().hex[:12]}"
        chat_msg = ChatMessage(
            id=msg_id,
            session_id=session_id,
            role="assistant",
            content=sanitized_answer,
            citations=json.dumps(all_citations),
            mode=req.mode
        )
        db.add(chat_msg)
        db.commit()

        # Send final completion event
        done_payload = {
            "type": "done",
            "id": msg_id,
            "session_id": session_id,
            "role": "assistant",
            "content": sanitized_answer,
            "citations": all_citations,
            "mode": req.mode
        }
        yield f"data: {json.dumps(done_payload)}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.get("/sessions", response_model=List[ChatSessionResponse])
def get_sessions(
    current_user: User = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    sessions = db.query(ChatSession).filter(
        ChatSession.owner_id == current_user.id
    ).order_by(ChatSession.updated_at.desc()).all()

    output = []
    for s in sessions:
        output.append(ChatSessionResponse(
            id=s.id,
            title=s.title,
            selected_doc_ids=s.get_selected_doc_ids(),
            created_at=s.created_at,
            updated_at=s.updated_at,
            messages=[]
        ))
    return output


@router.get("/sessions/{session_id}/messages", response_model=List[ChatMessageResponse])
def get_session_messages(
    session_id: str,
    current_user: User = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    session = db.query(ChatSession).filter(
        ChatSession.id == session_id,
        ChatSession.owner_id == current_user.id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    messages = db.query(ChatMessage).filter(
        ChatMessage.session_id == session_id
    ).order_by(ChatMessage.created_at.asc()).all()

    return [
        ChatMessageResponse(
            id=m.id,
            session_id=m.session_id,
            role=m.role,
            content=m.content,
            citations=[CitationItem(**c) for c in m.get_citations()],
            mode=m.mode,
            created_at=m.created_at
        )
        for m in messages
    ]
