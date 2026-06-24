from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import AnalysisResult, Requirement, UserReview
from app.schemas import AnalysisResponse, RequirementCreate, ReviewCreate, ReviewResponse
from app.services.mock_analysis_service import analyse_requirement as mock_analyse
from app.services.llm_service import generate_analysis

router = APIRouter(prefix="/api/analysis", tags=["Analysis"])


class ModifyReanalyseRequest(BaseModel):
    modified_requirement_text: str
    review_notes: Optional[str] = None


def split_requirements(text: str) -> List[str]:
    if not text or not text.strip():
        return []

    lines = [line.strip() for line in text.splitlines() if line.strip()]
    requirements = []

    for line in lines:
        cleaned = line.strip()

        for prefix in ["-", "*", "•"]:
            if cleaned.startswith(prefix):
                cleaned = cleaned[len(prefix):].strip()

        parts = cleaned.split(" ", 1)
        if len(parts) == 2:
            first = parts[0].strip()
            if first.endswith(".") or first.endswith(")"):
                numeric_part = first[:-1]
                if numeric_part.isdigit():
                    cleaned = parts[1].strip()

        if cleaned:
            requirements.append(cleaned)

    if not requirements:
        requirements = [text.strip()]

    return requirements


def run_llm_or_mock(requirement_text: str):
    if settings.USE_MOCK_LLM:
        return mock_analyse(requirement_text)

    return generate_analysis(requirement_text)


def build_analysis_response(requirement: Requirement, analysis_result: AnalysisResult) -> AnalysisResponse:
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


def analyse_and_save_requirement(
    requirement_text: str,
    source_type: str,
    db: Session
) -> AnalysisResponse:
    requirement = Requirement(
        requirement_text=requirement_text.strip(),
        source_type=source_type
    )

    db.add(requirement)
    db.commit()
    db.refresh(requirement)

    analysis_output = run_llm_or_mock(requirement.requirement_text)

    analysis_result = AnalysisResult(
        requirement_id=requirement.id,
        requirement_type=analysis_output.get("requirement_type", "Unclear"),
        ambiguity_status=analysis_output.get("ambiguity_status", "Ambiguous"),
        ambiguity_explanation=analysis_output.get("ambiguity_explanation", ""),
        priority_level=analysis_output.get("priority_level", "Medium"),
        priority_reason=analysis_output.get("priority_reason", ""),
        acceptance_criteria=analysis_output.get("acceptance_criteria", ""),
        test_case=analysis_output.get("test_case", ""),
        improvement_suggestion=analysis_output.get("improvement_suggestion", ""),
        confidence_score=analysis_output.get("confidence_score", 0.5),
        analysis_method=analysis_output.get("analysis_method", ""),
        literature_basis=analysis_output.get("literature_basis", "")
    )

    db.add(analysis_result)
    db.commit()
    db.refresh(analysis_result)

    return build_analysis_response(requirement, analysis_result)


@router.post("/analyse", response_model=AnalysisResponse)
def analyse_requirement_endpoint(
    payload: RequirementCreate,
    db: Session = Depends(get_db)
):
    return analyse_and_save_requirement(
        requirement_text=payload.requirement_text,
        source_type=payload.source_type,
        db=db
    )


@router.post("/batch", response_model=List[AnalysisResponse])
def analyse_batch_requirements(
    payload: RequirementCreate,
    db: Session = Depends(get_db)
):
    detected_requirements = split_requirements(payload.requirement_text)

    if not detected_requirements:
        raise HTTPException(status_code=400, detail="No valid requirements found")

    results = []

    for requirement_text in detected_requirements:
        result = analyse_and_save_requirement(
            requirement_text=requirement_text,
            source_type=payload.source_type,
            db=db
        )
        results.append(result)

    return results


@router.post("/modify-reanalyse/{analysis_id}", response_model=AnalysisResponse)
def modify_and_reanalyse_requirement(
    analysis_id: int,
    payload: ModifyReanalyseRequest,
    db: Session = Depends(get_db)
):
    original_analysis = (
        db.query(AnalysisResult)
        .filter(AnalysisResult.id == analysis_id)
        .first()
    )

    if not original_analysis:
        raise HTTPException(status_code=404, detail="Original analysis result not found")

    if not payload.modified_requirement_text or not payload.modified_requirement_text.strip():
        raise HTTPException(status_code=400, detail="Modified requirement text cannot be empty")

    modified_response = analyse_and_save_requirement(
        requirement_text=payload.modified_requirement_text.strip(),
        source_type="human_modified",
        db=db
    )

    human_note = payload.review_notes.strip() if payload.review_notes else ""

    version_note = (
        f"Human modified original REQ-{str(analysis_id).zfill(3)} "
        f"and generated updated analysis REQ-{str(modified_response.analysis_id).zfill(3)}."
    )

    combined_review_notes = (
        f"{human_note}\n{version_note}" if human_note else version_note
    )

    review = UserReview(
        analysis_result_id=analysis_id,
        decision="Modified",
        modified_requirement_type=modified_response.requirement_type,
        modified_priority=modified_response.priority_level,
        modified_acceptance_criteria=modified_response.acceptance_criteria,
        modified_test_case=modified_response.test_case,
        review_notes=combined_review_notes
    )

    db.add(review)
    db.commit()
    db.refresh(review)

    return modified_response


@router.post("/review/{analysis_id}", response_model=ReviewResponse)
def review_analysis_result(
    analysis_id: int,
    payload: ReviewCreate,
    db: Session = Depends(get_db)
):
    analysis_result = (
        db.query(AnalysisResult)
        .filter(AnalysisResult.id == analysis_id)
        .first()
    )

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