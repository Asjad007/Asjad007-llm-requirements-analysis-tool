from typing import List, Optional, Dict, Any
import json

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import AnalysisResult, Project, Requirement, UserReview
from app.review_status import REVIEW_STATUSES, normalize_review_status_or_raise
from app.schemas import AnalysisResponse, DocumentExtractionResponse, RequirementCreate, ReviewCreate, ReviewResponse
from app.services.document_extraction_service import detect_document_extension, extract_document_text
from app.services.llm_service import generate_analysis
from app.services.mock_analysis_service import analyse_requirement as mock_analyse
from app.services.requirement_extraction_service import clean_requirement_candidate, extract_requirements_from_text

router = APIRouter(prefix="/api/analysis", tags=["Analysis"])

FIELD_LEVEL_KEYS = [
    "classification",
    "priority",
    "ambiguity",
    "acceptance_criteria",
    "test_cases",
]


class ModifyReanalyseRequest(BaseModel):
    modified_requirement_text: str
    reviewer_notes: Optional[str] = None


def stringify_llm_field(value: Any) -> str:
    if value is None:
        return ""

    if isinstance(value, list):
        return "\n".join(str(item) for item in value)

    if isinstance(value, dict):
        return "\n".join(f"{key}: {val}" for key, val in value.items())

    return str(value)


def safe_confidence_score(value: Any) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.5


def run_llm_or_mock(requirement_text: str, project_context: Optional[dict] = None):
    if settings.USE_MOCK_LLM:
        return mock_analyse(requirement_text)

    return generate_analysis(requirement_text, project_context)


def build_default_field_level_decisions(decision: str):
    return {key: decision for key in FIELD_LEVEL_KEYS}


def serialise_field_level_decisions(field_level_decisions: Optional[Dict[str, str]]):
    if not field_level_decisions:
        return None

    cleaned: Dict[str, str] = {}

    for key in FIELD_LEVEL_KEYS:
        value = field_level_decisions.get(key) if isinstance(field_level_decisions, dict) else None
        if not value:
            continue

        cleaned[key] = normalize_review_status_or_raise(value)

    return json.dumps(cleaned) if cleaned else None


def build_analysis_response(requirement: Requirement, analysis_result: AnalysisResult) -> AnalysisResponse:
    
    return AnalysisResponse(
        analysis_id=analysis_result.id,
        requirement_id=requirement.id,
        project_id=requirement.project_id,
        project_name=requirement.project.name if requirement.project else None,
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
        created_at=analysis_result.created_at,
    )


def analyse_and_save_requirement(
    requirement_text: str,
    source_type: str,
    project: Project,
    db: Session,
) -> AnalysisResponse:
    requirement = Requirement(
        project_id=project.id,
        requirement_text=requirement_text.strip(),
        source_type=source_type,
    )

    db.add(requirement)
    db.commit()
    db.refresh(requirement)

    analysis_output = run_llm_or_mock(
        requirement.requirement_text,
        {
            "id": project.id,
            "name": project.name,
            "description": project.description,
            "domain_system_type": project.domain_system_type,
        },
    )

    analysis_result = AnalysisResult(
        requirement_id=requirement.id,
        requirement_type=stringify_llm_field(analysis_output.get("requirement_type", "Unclear")),
        ambiguity_status=stringify_llm_field(analysis_output.get("ambiguity_status", "Ambiguous")),
        ambiguity_explanation=stringify_llm_field(analysis_output.get("ambiguity_explanation", "")),
        priority_level=stringify_llm_field(analysis_output.get("priority_level", "Medium")),
        priority_reason=stringify_llm_field(analysis_output.get("priority_reason", "")),
        acceptance_criteria=stringify_llm_field(analysis_output.get("acceptance_criteria", "")),
        test_case=stringify_llm_field(analysis_output.get("test_case", "")),
        improvement_suggestion=stringify_llm_field(analysis_output.get("improvement_suggestion", "")),
        confidence_score=safe_confidence_score(analysis_output.get("confidence_score", 0.5)),
        analysis_method=stringify_llm_field(analysis_output.get("analysis_method", "")),
        literature_basis=stringify_llm_field(analysis_output.get("literature_basis", "")),
    )

    db.add(analysis_result)
    db.commit()
    db.refresh(analysis_result)

    return build_analysis_response(requirement, analysis_result)


@router.post("/extract-document", response_model=DocumentExtractionResponse)
async def extract_requirement_document(file: UploadFile = File(...)):
    extension = detect_document_extension(file.filename or "")
    file_bytes = await file.read()

    if not file_bytes:
        raise HTTPException(status_code=400, detail="The uploaded document is empty.")

    extracted_text = extract_document_text(file, file_bytes)

    if not extracted_text:
        raise HTTPException(status_code=400, detail="No readable text was found in the uploaded document.")

    requirements = extract_requirements_from_text(extracted_text)

    if not requirements:
        raise HTTPException(status_code=400, detail="No requirements could be extracted from the uploaded document.")

    return DocumentExtractionResponse(
        filename=file.filename or "document",
        file_type=extension.lstrip(".").upper(),
        extracted_text=extracted_text,
        requirements=requirements,
        requirement_count=len(requirements),
    )


@router.post("/analyse", response_model=AnalysisResponse)
def analyse_requirement_endpoint(
    payload: RequirementCreate,
    db: Session = Depends(get_db),
):
    project = db.query(Project).filter(Project.id == payload.project_id).first()

    if not project:
        raise HTTPException(status_code=404, detail="Selected project not found")

    return analyse_and_save_requirement(
        requirement_text=payload.requirement_text,
        source_type=payload.source_type,
        project=project,
        db=db,
    )


@router.post("/batch", response_model=List[AnalysisResponse])
def analyse_batch_requirements(
    payload: RequirementCreate,
    db: Session = Depends(get_db),
):
    detected_requirements = []

    for requirement in payload.requirements or []:
        cleaned_requirement = clean_requirement_candidate(requirement)
        if cleaned_requirement:
            detected_requirements.append(cleaned_requirement)

    if not detected_requirements:
        detected_requirements = extract_requirements_from_text(payload.requirement_text)

    if not detected_requirements:
        raise HTTPException(status_code=400, detail="No valid requirements found")

    project = db.query(Project).filter(Project.id == payload.project_id).first()

    if not project:
        raise HTTPException(status_code=404, detail="Selected project not found")

    results = []

    for requirement_text in detected_requirements:
        result = analyse_and_save_requirement(
            requirement_text=requirement_text,
            source_type=payload.source_type,
            project=project,
            db=db,
        )
        results.append(result)

    return results


@router.post("/modify-reanalyse/{analysis_id}", response_model=AnalysisResponse)
def modify_and_reanalyse_requirement(
    analysis_id: int,
    payload: ModifyReanalyseRequest,
    db: Session = Depends(get_db),
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

    if not original_analysis.requirement or not original_analysis.requirement.project:
        raise HTTPException(status_code=400, detail="Original requirement is not linked to a project")

    modified_response = analyse_and_save_requirement(
        requirement_text=payload.modified_requirement_text.strip(),
        source_type="human_modified",
        project=original_analysis.requirement.project,
        db=db,
    )

    modified_analysis = (
        db.query(AnalysisResult)
        .filter(AnalysisResult.id == modified_response.analysis_id)
        .first()
    )

    review = UserReview(
        requirement_id=original_analysis.requirement_id,
        analysis_result_id=analysis_id,
        refined_analysis_result_id=modified_response.analysis_id,
        decision=REVIEW_STATUSES["MODIFIED"],
        field_level_decisions=serialise_field_level_decisions(
            build_default_field_level_decisions(REVIEW_STATUSES["MODIFIED"])
        ),
        reviewer_notes=payload.reviewer_notes.strip() if payload.reviewer_notes else None,
        review_notes=payload.reviewer_notes.strip() if payload.reviewer_notes else None,
        modified_requirement_type=modified_analysis.requirement_type,
        modified_priority=modified_analysis.priority_level,
        modified_acceptance_criteria=modified_analysis.acceptance_criteria,
        modified_test_case=modified_analysis.test_case,
        **build_final_review_fields(
            payload.modified_requirement_text.strip(),
            modified_analysis,
        ),
    )

    db.add(review)
    db.commit()
    db.refresh(review)

    return modified_response


@router.post("/review/{analysis_id}", response_model=ReviewResponse)
def review_analysis_result(
    analysis_id: int,
    payload: ReviewCreate,
    db: Session = Depends(get_db),
):
    analysis_result = (
        db.query(AnalysisResult)
        .filter(AnalysisResult.id == analysis_id)
        .first()
    )

    if not analysis_result:
        raise HTTPException(status_code=404, detail="Analysis result not found")

    normalised_decision = normalize_review_status_or_raise(payload.decision)

    if normalised_decision == REVIEW_STATUSES["REJECTED"] and not (
        payload.rejection_reason and payload.rejection_reason.strip()
    ):
        raise HTTPException(status_code=400, detail="Rejection reason is required")

    final_fields = {}
    field_level_decisions = payload.field_level_decisions or {}

    if normalised_decision == REVIEW_STATUSES["ACCEPTED"]:
        final_fields = build_final_review_fields(
            analysis_result.requirement.requirement_text if analysis_result.requirement else "",
            analysis_result,
        )
        field_level_decisions = build_default_field_level_decisions(REVIEW_STATUSES["ACCEPTED"])

    elif normalised_decision == REVIEW_STATUSES["MODIFIED"]:
        if not payload.final_refined_requirement or not payload.final_refined_requirement.strip():
            raise HTTPException(status_code=400, detail="Final refined requirement is required for modified reviews")

        final_fields = {
            "final_refined_requirement": stringify_llm_field(payload.final_refined_requirement.strip()),
            "final_type": stringify_llm_field(payload.final_type),
            "final_priority": stringify_llm_field(payload.final_priority),
            "final_ambiguity_status": stringify_llm_field(payload.final_ambiguity_status),
            "final_acceptance_criteria": stringify_llm_field(payload.final_acceptance_criteria),
            "final_test_cases": stringify_llm_field(payload.final_test_cases),
        }

        if not field_level_decisions:
            field_level_decisions = build_default_field_level_decisions(REVIEW_STATUSES["ACCEPTED"])

    elif normalised_decision == REVIEW_STATUSES["REJECTED"] and not field_level_decisions:
        field_level_decisions = build_default_field_level_decisions(REVIEW_STATUSES["REJECTED"])

    review = UserReview(
        requirement_id=analysis_result.requirement_id,
        analysis_result_id=analysis_id,
        decision=normalised_decision,
        field_level_decisions=serialise_field_level_decisions(field_level_decisions),
        reviewer_notes=payload.reviewer_notes.strip() if payload.reviewer_notes else None,
        review_notes=payload.reviewer_notes.strip() if payload.reviewer_notes else None,
        rejection_reason=payload.rejection_reason.strip() if payload.rejection_reason else None,
        modified_requirement_type=final_fields.get("final_type"),
        modified_priority=final_fields.get("final_priority"),
        modified_acceptance_criteria=final_fields.get("final_acceptance_criteria"),
        modified_test_case=final_fields.get("final_test_cases"),
        **final_fields,
    )

    db.add(review)
    db.commit()
    db.refresh(review)

    return ReviewResponse(
        review_id=review.id,
        requirement_id=review.requirement_id,
        analysis_result_id=review.analysis_result_id,
        decision=normalised_decision,
        final_refined_requirement=review.final_refined_requirement,
        final_type=review.final_type,
        final_priority=review.final_priority,
        final_ambiguity_status=review.final_ambiguity_status,
        final_acceptance_criteria=review.final_acceptance_criteria,
        final_test_cases=review.final_test_cases,
        field_level_decisions=json.loads(review.field_level_decisions) if review.field_level_decisions else None,
        reviewer_notes=review.reviewer_notes,
        rejection_reason=review.rejection_reason,
        reviewed_at=review.reviewed_at,
        created_at=review.created_at,
        updated_at=review.updated_at,
    )


def build_final_review_fields(requirement_text: str, analysis_result: AnalysisResult):
    return {
        "final_refined_requirement": stringify_llm_field(requirement_text),
        "final_type": stringify_llm_field(analysis_result.requirement_type),
        "final_priority": stringify_llm_field(analysis_result.priority_level),
        "final_ambiguity_status": stringify_llm_field(analysis_result.ambiguity_status),
        "final_acceptance_criteria": stringify_llm_field(analysis_result.acceptance_criteria),
        "final_test_cases": stringify_llm_field(analysis_result.test_case),
    }
