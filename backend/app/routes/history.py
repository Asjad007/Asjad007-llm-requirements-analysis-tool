from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List
from ..database import get_db
from ..models import AnalysisResult
from ..schemas import HistoryItem

router = APIRouter(prefix='/api', tags=['History'])

@router.get('/history', response_model=List[HistoryItem])
def get_history(db: Session = Depends(get_db)):
    results = db.query(AnalysisResult).options(joinedload(AnalysisResult.requirement), joinedload(AnalysisResult.review)).order_by(AnalysisResult.created_at.desc()).all()
    return [HistoryItem(
        analysis_id=i.id,
        requirement_id=i.requirement_id,
        original_text=i.requirement.original_text,
        requirement_type=i.requirement_type,
        ambiguity_status=i.ambiguity_status,
        priority_level=i.priority_level,
        acceptance_criteria=i.acceptance_criteria,
        test_case=i.test_case,
        review_decision=i.review.decision if i.review else None,
        created_at=i.created_at,
    ) for i in results]

@router.get('/history/{analysis_id}', response_model=HistoryItem)
def get_history_item(analysis_id: int, db: Session = Depends(get_db)):
    i = db.query(AnalysisResult).options(joinedload(AnalysisResult.requirement), joinedload(AnalysisResult.review)).filter(AnalysisResult.id == analysis_id).first()
    if not i:
        raise HTTPException(status_code=404, detail='Analysis result not found.')
    return HistoryItem(
        analysis_id=i.id,
        requirement_id=i.requirement_id,
        original_text=i.requirement.original_text,
        requirement_type=i.requirement_type,
        ambiguity_status=i.ambiguity_status,
        priority_level=i.priority_level,
        acceptance_criteria=i.acceptance_criteria,
        test_case=i.test_case,
        review_decision=i.review.decision if i.review else None,
        created_at=i.created_at,
    )

@router.delete('/history/{analysis_id}')
def delete_history_item(analysis_id: int, db: Session = Depends(get_db)):
    i = db.query(AnalysisResult).filter(AnalysisResult.id == analysis_id).first()
    if not i:
        raise HTTPException(status_code=404, detail='Analysis result not found.')
    db.delete(i)
    db.commit()
    return {'message': 'Analysis result deleted successfully.'}
