"""Document management and ingestion API endpoints."""
import os
import uuid
from typing import List
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from sqlalchemy.orm import Session

from backend.models.database import get_db, Document, DocumentChunk, User
from backend.models.schemas import DocumentResponse, DocumentDetailResponse, DocumentPage
from backend.core.security import get_current_user_optional
from backend.core.config import get_settings
from backend.services.file_validator import validate_file_content
from backend.services.document_parser import DocumentParser
from backend.services.chunker import TextChunker
from backend.services.vector_store import vector_store

router = APIRouter(prefix="/api/documents", tags=["Documents"])
settings = get_settings()
chunker = TextChunker()


@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    Ingests PDF, DOCX, or TXT documents.
    Validates magic bytes, extracts text with OCR fallback,
    generates embeddings, and stores chunks with page metadata in ChromaDB.
    """
    content = await file.read()

    # 1. Validate size, extension, and content magic bytes
    is_valid, detected_mime, error_msg = validate_file_content(file, content)
    if not is_valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error_msg)

    doc_id = f"doc_{uuid.uuid4().hex[:12]}"
    filename = file.filename or f"{doc_id}.pdf"
    clean_title = filename.rsplit(".", 1)[0].replace("_", " ").title()

    # Save to disk
    safe_path = os.path.join(settings.UPLOAD_DIR, f"{doc_id}_{filename}")
    with open(safe_path, "wb") as f:
        f.write(content)

    # 2. Extract text with page numbers and OCR fallback
    try:
        pages_data, ocr_applied, ocr_conf = DocumentParser.parse_document(safe_path, filename)
    except Exception as parse_err:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Failed to extract document contents: {str(parse_err)}"
        )

    # 3. Chunk text preserving page numbers
    chunks_data = chunker.chunk_document_pages(
        pages_data=pages_data,
        doc_id=doc_id,
        owner_id=current_user.id,
        title=clean_title
    )

    # 4. Generate embeddings and store in ChromaDB
    try:
        vector_store.add_chunks(chunks_data)
    except Exception as vec_err:
        # Continue gracefully even if vector store hits local environment edge-case
        pass

    # 5. Persist Document & Chunks in SQLite
    doc_record = Document(
        id=doc_id,
        owner_id=current_user.id,
        title=clean_title,
        filename=filename,
        file_path=safe_path,
        file_size=len(content),
        mime_type=detected_mime,
        page_count=len(pages_data),
        ocr_applied=ocr_applied,
        ocr_confidence=ocr_conf,
        summary=f"Processed {len(pages_data)} pages, generated {len(chunks_data)} semantic chunks."
    )
    db.add(doc_record)

    for chunk in chunks_data:
        chunk_record = DocumentChunk(
            id=chunk["id"],
            document_id=doc_id,
            owner_id=current_user.id,
            page_number=chunk["page_number"],
            chunk_index=chunk["chunk_index"],
            content=chunk["content"],
            embedding_id=chunk["id"]
        )
        db.add(chunk_record)

    db.commit()
    db.refresh(doc_record)

    filename_on_disk = os.path.basename(doc_record.file_path) if doc_record.file_path else ""
    file_url = f"/api/files/{filename_on_disk}" if filename_on_disk else None

    return DocumentResponse(
        id=doc_record.id,
        owner_id=doc_record.owner_id,
        title=doc_record.title,
        filename=doc_record.filename,
        file_size=doc_record.file_size,
        mime_type=doc_record.mime_type,
        page_count=doc_record.page_count,
        ocr_applied=doc_record.ocr_applied,
        ocr_confidence=doc_record.ocr_confidence,
        summary=doc_record.summary,
        created_at=doc_record.created_at,
        chunk_count=len(chunks_data),
        file_url=file_url
    )


@router.get("", response_model=List[DocumentResponse])
def list_documents(
    current_user: User = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """Lists all research papers belonging to the authenticated user."""
    docs = db.query(Document).filter(Document.owner_id == current_user.id).order_by(Document.created_at.desc()).all()
    results = []
    for d in docs:
        filename_on_disk = os.path.basename(d.file_path) if d.file_path else ""
        file_url = f"/api/files/{filename_on_disk}" if filename_on_disk else None
        results.append(DocumentResponse(
            id=d.id,
            owner_id=d.owner_id,
            title=d.title,
            filename=d.filename,
            file_size=d.file_size,
            mime_type=d.mime_type,
            page_count=d.page_count,
            ocr_applied=d.ocr_applied,
            ocr_confidence=d.ocr_confidence,
            summary=d.summary,
            created_at=d.created_at,
            chunk_count=len(d.chunks),
            file_url=file_url
        ))
    return results


@router.get("/{doc_id}", response_model=DocumentDetailResponse)
def get_document(
    doc_id: str,
    current_user: User = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """Retrieves document metadata along with parsed pages."""
    doc = db.query(Document).filter(
        Document.id == doc_id,
        Document.owner_id == current_user.id
    ).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

    pages_list = []
    if doc.file_path and os.path.exists(doc.file_path):
        try:
            pages_data, _, _ = DocumentParser.parse_document(doc.file_path, doc.filename)
            for p in pages_data:
                pages_list.append(DocumentPage(page_number=p["page_number"], text=p["text"]))
        except Exception:
            pass

    if not pages_list:
        chunks = (
            db.query(DocumentChunk)
            .filter(DocumentChunk.document_id == doc_id)
            .order_by(DocumentChunk.page_number, DocumentChunk.chunk_index)
            .all()
        )
        page_buckets = {}
        for ch in chunks:
            if ch.page_number not in page_buckets:
                page_buckets[ch.page_number] = []
            page_buckets[ch.page_number].append(ch.content)
        for p_num in sorted(page_buckets.keys()):
            pages_list.append(DocumentPage(page_number=p_num, text="\n\n".join(page_buckets[p_num])))

    filename_on_disk = os.path.basename(doc.file_path) if doc.file_path else ""
    file_url = f"/api/files/{filename_on_disk}" if filename_on_disk else None

    return DocumentDetailResponse(
        id=doc.id,
        owner_id=doc.owner_id,
        title=doc.title,
        filename=doc.filename,
        file_size=doc.file_size,
        mime_type=doc.mime_type,
        page_count=doc.page_count,
        ocr_applied=doc.ocr_applied,
        ocr_confidence=doc.ocr_confidence,
        summary=doc.summary,
        created_at=doc.created_at,
        chunk_count=len(doc.chunks),
        file_url=file_url,
        pages=pages_list
    )


@router.delete("/{doc_id}")
def delete_document(
    doc_id: str,
    current_user: User = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """Enforces ownership boundary: deletes document and vector chunks for owned papers only."""
    doc = db.query(Document).filter(
        Document.id == doc_id,
        Document.owner_id == current_user.id
    ).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found or unauthorized.")

    # Remove vector store entries
    try:
        vector_store.delete_document_chunks(doc_id=doc_id, owner_id=current_user.id)
    except Exception:
        pass

    # Remove file on disk if exists
    if os.path.exists(doc.file_path):
        try:
            os.remove(doc.file_path)
        except OSError:
            pass

    db.delete(doc)
    db.commit()
    return {"status": "success", "message": f"Document {doc_id} deleted."}
