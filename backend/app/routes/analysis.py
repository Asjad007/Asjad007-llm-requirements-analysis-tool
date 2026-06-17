from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AnalysisResult, Requirement, UserReview
from app.schemas import AnalysisResponse, RequirementCreate, ReviewCreate, ReviewResponse
from app.config import settings

from app.services.mock_analysis_service import analyse_requirement as mock_analyse
from app.services.llm_service import generate_analysis

import json

router = APIRouter(prefix="/api/analysis", tags=["Analysis"])


def parse_llm_output(raw_output: str):
    """
    Ensures LLM response is converted to dict safely.
    """
    try:
        return json.loads(raw_output)
    except Exception:
        # fallback if model returns non-JSON
        return {
            "requirement_type": "Unknown",
            "ambiguity_status": "Unknown",
            "ambiguity_explanation": raw_output,
            "priority_level": "Medium",
            "priority_reason": "Auto fallback parsing",
            "acceptance_criteria": "",
            "test_case": "",
            "improvement_suggestion": "",
            "confidence_score": 0.5,
            "analysis_method": "Fallback parser",
            "literature_basis": "N/A"
        }


@router.post("/analyse", response_model=AnalysisResponse)
def analyse_requirement_endpoint(payload: RequirementCreate, db: Session = Depends(get_db)):
    
    # 1. Save requirement
    requirement = Requirement(
        requirement_text=payload.requirement_text,
        source_type=payload.source_type
    )
    db.add(requirement)
    db.commit()
    db.refresh(requirement)

    # 2. Choose analysis mode (IMPORTANT FIX)
    if settings.USE_MOCK_LLM:
        analysis_output = mock_analyse(payload.requirement_text)
    else:
        raw_output = generate_analysis(payload.requirement_text)
        analysis_output = parse_llm_output(raw_output)

    # 3. Store analysis result
    analysis_result = AnalysisResult(
        requirement_id=requirement.id,
        requirement_type=analysis_output.get("requirement_type"),
        ambiguity_status=analysis_output.get("ambiguity_status"),
        ambiguity_explanation=analysis_output.get("ambiguity_explanation"),
        priority_level=analysis_output.get("priority_level"),
        priority_reason=analysis_output.get("priority_reason"),
        acceptance_criteria=analysis_output.get("acceptance_criteria"),
        test_case=analysis_output.get("test_case"),
        improvement_suggestion=analysis_output.get("improvement_suggestion"),
        confidence_score=analysis_output.get("confidence_score"),
        analysis_method=analysis_output.get("analysis_method"),
        literature_basis=analysis_output.get("literature_basis")
    )

    db.add(analysis_result)
    db.commit()
    db.refresh(analysis_result)

    # 4. Return response
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
    analysis_result = db.query(AnalysisResult).filter(
        AnalysisResult.id == analysis_id
    ).first()

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