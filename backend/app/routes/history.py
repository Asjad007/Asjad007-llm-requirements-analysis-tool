import re

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AnalysisResult, Requirement, UserReview
from app.schemas import HistoryItem

router = APIRouter(prefix="/api/history", tags=["History"])


def extract_modified_into_id(review_notes):
    """
    Extracts the generated updated analysis ID from review notes.
    Example note:
    Human modified original REQ-026 and generated updated analysis REQ-027.
    """
    if not review_notes:
        return None

    matches = re.findall(r"REQ-(\d+)", review_notes)

    if len(matches) >= 2:
        try:
            return int(matches[-1])
        except ValueError:
            return None

    return None


def build_history_item(result, latest_review):
    return HistoryItem(
        analysis_id=result.id,
        requirement_id=result.requirement_id,
        original_text=result.requirement.requirement_text if result.requirement else "",
        requirement_type=result.requirement_type,
        ambiguity_status=result.ambiguity_status,
        priority_level=result.priority_level,
        confidence_score=getattr(result, "confidence_score", None),
        improvement_suggestion=getattr(result, "improvement_suggestion", None),
        review_decision=latest_review.decision if latest_review else None,

        review_notes=latest_review.review_notes if latest_review else None,
        modified_requirement_type=latest_review.modified_requirement_type if latest_review else None,
        modified_priority=latest_review.modified_priority if latest_review else None,
        modified_acceptance_criteria=latest_review.modified_acceptance_criteria if latest_review else None,
        modified_test_case=latest_review.modified_test_case if latest_review else None,
        modified_into_analysis_id=extract_modified_into_id(latest_review.review_notes) if latest_review else None,

        created_at=result.created_at,
    )


@router.get("", response_model=list[HistoryItem])
def get_history(db: Session = Depends(get_db)):
    try:
        results = (
            db.query(AnalysisResult)
            .join(Requirement, AnalysisResult.requirement_id == Requirement.id)
            .order_by(AnalysisResult.created_at.desc())
            .all()
        )
    except Exception:
        return []

    history_items = []

    for result in results:
        latest_review = (
            db.query(UserReview)
            .filter(UserReview.analysis_result_id == result.id)
            .order_by(UserReview.reviewed_at.desc())
            .first()
        )

        history_items.append(build_history_item(result, latest_review))

    return history_items


@router.get("/{analysis_id}", response_model=HistoryItem)
def get_history_item(analysis_id: int, db: Session = Depends(get_db)):
    result = db.query(AnalysisResult).filter(AnalysisResult.id == analysis_id).first()

    if not result:
        raise HTTPException(status_code=404, detail="Analysis result not found")

    latest_review = (
        db.query(UserReview)
        .filter(UserReview.analysis_result_id == result.id)
        .order_by(UserReview.reviewed_at.desc())
        .first()
    )

    return build_history_item(result, latest_review)


@router.delete("/{analysis_id}")
def delete_history_item(analysis_id: int, db: Session = Depends(get_db)):
    result = db.query(AnalysisResult).filter(AnalysisResult.id == analysis_id).first()

    if not result:
        raise HTTPException(status_code=404, detail="Analysis result not found")

    db.query(UserReview).filter(UserReview.analysis_result_id == analysis_id).delete()
    db.delete(result)
    db.commit()

    return {"message": "History item deleted successfully"}