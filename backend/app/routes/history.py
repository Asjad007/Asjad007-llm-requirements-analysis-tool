from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AnalysisResult, Requirement, UserReview
from app.schemas import HistoryItem

router = APIRouter(prefix="/api/history", tags=["History"])


@router.get("", response_model=list[HistoryItem])
def get_history(db: Session = Depends(get_db)):
    results = (
        db.query(AnalysisResult)
        .join(Requirement, AnalysisResult.requirement_id == Requirement.id)
        .order_by(AnalysisResult.created_at.desc())
        .all()
    )

    history_items = []

    for result in results:
        latest_review = (
            db.query(UserReview)
            .filter(UserReview.analysis_result_id == result.id)
            .order_by(UserReview.reviewed_at.desc())
            .first()
        )

        history_items.append(
            HistoryItem(
                analysis_id=result.id,
                requirement_id=result.requirement_id,
                original_text=result.requirement.requirement_text,
                requirement_type=result.requirement_type,
                ambiguity_status=result.ambiguity_status,
                priority_level=result.priority_level,
                confidence_score=result.confidence_score,
                improvement_suggestion=result.improvement_suggestion,
                review_decision=latest_review.decision if latest_review else None,
                created_at=result.created_at,
            )
        )

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

    return HistoryItem(
        analysis_id=result.id,
        requirement_id=result.requirement_id,
        original_text=result.requirement.requirement_text,
        requirement_type=result.requirement_type,
        ambiguity_status=result.ambiguity_status,
        priority_level=result.priority_level,
        confidence_score=result.confidence_score,
        improvement_suggestion=result.improvement_suggestion,
        review_decision=latest_review.decision if latest_review else None,
        created_at=result.created_at,
    )


@router.delete("/{analysis_id}")
def delete_history_item(analysis_id: int, db: Session = Depends(get_db)):
    result = db.query(AnalysisResult).filter(AnalysisResult.id == analysis_id).first()

    if not result:
        raise HTTPException(status_code=404, detail="Analysis result not found")

    db.query(UserReview).filter(UserReview.analysis_result_id == analysis_id).delete()
    db.delete(result)
    db.commit()

    return {"message": "History item deleted successfully"}