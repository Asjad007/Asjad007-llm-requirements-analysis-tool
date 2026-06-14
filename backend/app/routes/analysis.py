from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AnalysisResult, Requirement, UserReview
from app.schemas import AnalysisResponse, RequirementCreate, ReviewCreate, ReviewResponse
from app.services.mock_analysis_service import analyse_requirement

router = APIRouter(prefix="/api/analysis", tags=["Analysis"])


@router.post("/analyse", response_model=AnalysisResponse)
def analyse_requirement_endpoint(payload: RequirementCreate, db: Session = Depends(get_db)):
    requirement = Requirement(
        requirement_text=payload.requirement_text,
        source_type=payload.source_type
    )
    db.add(requirement)
    db.commit()
    db.refresh(requirement)

    analysis_output = analyse_requirement(payload.requirement_text)

    analysis_result = AnalysisResult(
        requirement_id=requirement.id,
        requirement_type=analysis_output["requirement_type"],
        ambiguity_status=analysis_output["ambiguity_status"],
        ambiguity_explanation=analysis_output["ambiguity_explanation"],
        priority_level=analysis_output["priority_level"],
        priority_reason=analysis_output["priority_reason"],
        acceptance_criteria=analysis_output["acceptance_criteria"],
        test_case=analysis_output["test_case"],
        improvement_suggestion=analysis_output.get("improvement_suggestion"),
        confidence_score=analysis_output.get("confidence_score"),
        analysis_method=analysis_output.get("analysis_method"),
        literature_basis=analysis_output.get("literature_basis")
    )

    db.add(analysis_result)
    db.commit()
    db.refresh(analysis_result)

    return AnalysisResponse(
        analysis_id=analysis_result.id,
        requirement_id=requirement.id,
        original_text=requirement.requirement_text,
        requirement_type=analysis_result.requirement_type,
        ambiguity_status=analysis_result.ambiguity_status,
        ambiguity_explanation=analysis_result.ambiguity_explanation,
        priority_level=analysis_result.priority_level,
        priority_reason=analysis_result.priority_reason,
        acceptance_criteria=analysis_result.acceptance_criteria,
        test_case=analysis_result.test_case,
        improvement_suggestion=analysis_result.improvement_suggestion,
        confidence_score=analysis_result.confidence_score,
        analysis_method=analysis_result.analysis_method,
        literature_basis=analysis_result.literature_basis,
        created_at=analysis_result.created_at
    )


@router.post("/review/{analysis_id}", response_model=ReviewResponse)
def review_analysis_result(
    analysis_id: int,
    payload: ReviewCreate,
    db: Session = Depends(get_db)
):
    analysis_result = db.query(AnalysisResult).filter(AnalysisResult.id == analysis_id).first()

    if not analysis_result:
        raise HTTPException(status_code=404, detail="Analysis result not found")

    review = UserReview(
        analysis_result_id=analysis_id,
        decision=payload.decision,
        modified_requirement_type=payload.modified_requirement_type,
        modified_priority=payload.modified_priority,
        modified_acceptance_criteria=payload.modified_acceptance_criteria,
        modified_test_case=payload.modified_test_case,
        review_notes=payload.review_notes
    )

    db.add(review)
    db.commit()
    db.refresh(review)

    return ReviewResponse(
        review_id=review.id,
        analysis_result_id=review.analysis_result_id,
        decision=review.decision,
        reviewed_at=review.reviewed_at
    )