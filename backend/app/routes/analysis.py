from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Requirement, AnalysisResult, UserReview
from ..schemas import AnalyseRequest, AnalysisResponse, ReviewRequest, ReviewResponse
from ..services.llm_service import analyse_requirement
from ..utils.validators import validate_requirement_text

router = APIRouter(prefix='/api', tags=['Analysis'])

@router.post('/analysis/analyse', response_model=AnalysisResponse)
def analyse(req: AnalyseRequest, db: Session = Depends(get_db)):
    cleaned_text = validate_requirement_text(req.requirement_text)
    requirement = Requirement(original_text=cleaned_text, source_type=req.source_type)
    db.add(requirement)
    db.commit()
    db.refresh(requirement)
    try:
        analysis = analyse_requirement(cleaned_text)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f'Analysis failed: {str(exc)}')
    result = AnalysisResult(
        requirement_id=requirement.id,
        requirement_type=analysis['requirement_type'],
        ambiguity_status=analysis['ambiguity_status'],
        ambiguity_explanation=analysis['ambiguity_explanation'],
        priority_level=analysis['priority_level'],
        priority_reason=analysis['priority_reason'],
        acceptance_criteria=analysis['acceptance_criteria'],
        test_case=analysis['test_case'],
        raw_llm_response=analysis.get('raw_llm_response', ''),
    )
    db.add(result)
    db.commit()
    db.refresh(result)
    return AnalysisResponse(
        analysis_id=result.id,
        requirement_id=requirement.id,
        original_text=requirement.original_text,
        requirement_type=result.requirement_type,
        ambiguity_status=result.ambiguity_status,
        ambiguity_explanation=result.ambiguity_explanation,
        priority_level=result.priority_level,
        priority_reason=result.priority_reason,
        acceptance_criteria=result.acceptance_criteria,
        test_case=result.test_case,
        created_at=result.created_at,
    )

@router.post('/review/{analysis_id}', response_model=ReviewResponse)
def review_analysis(analysis_id: int, req: ReviewRequest, db: Session = Depends(get_db)):
    result = db.query(AnalysisResult).filter(AnalysisResult.id == analysis_id).first()
    if not result:
        raise HTTPException(status_code=404, detail='Analysis result not found.')
    existing_review = db.query(UserReview).filter(UserReview.analysis_result_id == analysis_id).first()
    if existing_review:
        db.delete(existing_review)
        db.commit()
    review = UserReview(
        analysis_result_id=analysis_id,
        decision=req.decision,
        modified_requirement_type=req.modified_requirement_type,
        modified_priority=req.modified_priority,
        modified_acceptance_criteria=req.modified_acceptance_criteria,
        modified_test_case=req.modified_test_case,
        review_notes=req.review_notes,
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    return ReviewResponse(review_id=review.id, analysis_result_id=review.analysis_result_id, decision=review.decision, reviewed_at=review.reviewed_at)
