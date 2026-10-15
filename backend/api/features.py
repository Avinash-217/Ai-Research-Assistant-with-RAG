"""Advanced Research Features API router: Comparison Matrix & Literature Review."""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.models.database import get_db, User
from backend.models.schemas import (
    ComparisonMatrixRequest, ComparisonMatrixResponse, ComparisonMatrixRow,
    LitReviewRequest, LitReviewResponse
)
from backend.core.security import get_current_user_optional
from backend.services.comparison_service import comparison_service
from backend.services.lit_review_service import lit_review_service

router = APIRouter(prefix="/api/features", tags=["Research Features"])


@router.post("/matrix", response_model=ComparisonMatrixResponse)
def generate_comparison_matrix(
    req: ComparisonMatrixRequest,
    current_user: User = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """Generates comparison matrix table comparing problem, methodology, dataset, results, limitations, future scope."""
    rows_data = comparison_service.generate_matrix(
        document_ids=req.document_ids,
        db=db,
        owner_id=current_user.id
    )
    return ComparisonMatrixResponse(
        rows=[ComparisonMatrixRow(**r) for r in rows_data],
        generated_at=datetime.utcnow()
    )


@router.post("/lit-review", response_model=LitReviewResponse)
def generate_literature_review(
    req: LitReviewRequest,
    current_user: User = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """Produces structured literature review highlighting common findings, disagreements, and research gaps."""
    review = lit_review_service.generate_review(
        document_ids=req.document_ids,
        db=db,
        owner_id=current_user.id,
        focus_topic=req.focus_topic
    )
    return LitReviewResponse(**review)
