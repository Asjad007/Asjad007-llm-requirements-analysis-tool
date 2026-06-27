import json
import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AnalysisResult, Requirement, UserReview
from app.review_status import normalize_review_status
from app.schemas import HistoryItem

router = APIRouter(prefix="/api/history", tags=["History"])
logger = logging.getLogger(__name__)


def build_history_item(result, latest_review):
    review_decision = normalize_review_status(latest_review.decision if latest_review else None)
    reviewer_notes = None
    final_type = None
    final_priority = None
    final_acceptance_criteria = None
    final_test_cases = None

    if latest_review:
        reviewer_notes = latest_review.reviewer_notes or latest_review.review_notes
        final_type = latest_review.final_type or latest_review.modified_requirement_type
        final_priority = latest_review.final_priority or latest_review.modified_priority
        final_acceptance_criteria = latest_review.final_acceptance_criteria or latest_review.modified_acceptance_criteria
        final_test_cases = latest_review.final_test_cases or latest_review.modified_test_case

    field_level_decisions = None

    if latest_review and latest_review.field_level_decisions:
        try:
            field_level_decisions = json.loads(latest_review.field_level_decisions)
        except json.JSONDecodeError:
            field_level_decisions = None

    return HistoryItem(
        analysis_id=result.id,
        requirement_id=result.requirement_id,
        project_id=result.requirement.project_id if result.requirement else None,
        project_name=result.requirement.project.name if result.requirement and result.requirement.project else None,
        original_text=result.requirement.requirement_text if result.requirement else "",
        requirement_type=result.requirement_type,
        ambiguity_status=result.ambiguity_status,
        ambiguity_explanation=result.ambiguity_explanation,
        priority_level=result.priority_level,
        priority_reason=result.priority_reason,
        acceptance_criteria=result.acceptance_criteria,
        test_case=result.test_case,
        confidence_score=getattr(result, "confidence_score", None),
        improvement_suggestion=getattr(result, "improvement_suggestion", None),
        review_decision=review_decision,
        analysis_method=getattr(result, "analysis_method", None),
        literature_basis=getattr(result, "literature_basis", None),

        created_at=result.created_at,
        review_id=latest_review.id if latest_review else None,
        reviewer_notes=reviewer_notes,
        rejection_reason=latest_review.rejection_reason if latest_review else None,
        reviewed_at=latest_review.reviewed_at if latest_review else None,
        review_created_at=latest_review.created_at if latest_review else None,
        review_updated_at=latest_review.updated_at if latest_review else None,
        final_refined_requirement=latest_review.final_refined_requirement if latest_review else None,
        final_type=final_type,
        final_priority=final_priority,
        final_ambiguity_status=latest_review.final_ambiguity_status if latest_review else None,
        final_acceptance_criteria=final_acceptance_criteria,
        final_test_cases=final_test_cases,
        field_level_decisions=field_level_decisions,
        refined_analysis_result_id=latest_review.refined_analysis_result_id if latest_review else None,
        review_notes=reviewer_notes,
        modified_requirement_type=final_type,
        modified_priority=final_priority,
        modified_acceptance_criteria=final_acceptance_criteria,
        modified_test_case=final_test_cases,
        modified_into_analysis_id=latest_review.refined_analysis_result_id if latest_review else None,
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
    except Exception as exc:
        logger.exception("Failed to load history items", exc_info=exc)
        raise HTTPException(
            status_code=500,
            detail="Failed to load history records. Please try again later.",
        ) from exc


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

    requirement = result.requirement

    try:
        db.query(UserReview).filter(UserReview.analysis_result_id == analysis_id).delete()
        db.delete(result)
        db.flush()

        if requirement is not None:
            remaining_analysis = (
                db.query(AnalysisResult)
                .filter(AnalysisResult.requirement_id == requirement.id)
                .first()
            )

            if remaining_analysis is None:
                db.delete(requirement)

        db.commit()
    except Exception as exc:
        db.rollback()
        logger.exception("Failed to delete history item %s", analysis_id, exc_info=exc)
        raise HTTPException(
            status_code=500,
            detail="Failed to delete history record. Please try again later.",
        ) from exc

    return {"message": "History item deleted successfully"}
