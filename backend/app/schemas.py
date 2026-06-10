from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

class AnalyseRequest(BaseModel):
    requirement_text: str = Field(..., min_length=10)
    source_type: str = 'manual'

class AnalysisResponse(BaseModel):
    analysis_id: int
    requirement_id: int
    original_text: str
    requirement_type: str
    ambiguity_status: str
    ambiguity_explanation: Optional[str] = None
    priority_level: str
    priority_reason: Optional[str] = None
    acceptance_criteria: Optional[str] = None
    test_case: Optional[str] = None
    created_at: datetime
    class Config:
        from_attributes = True

class ReviewRequest(BaseModel):
    decision: str = Field(..., pattern='^(accept|modify|reject)$')
    modified_requirement_type: Optional[str] = None
    modified_priority: Optional[str] = None
    modified_acceptance_criteria: Optional[str] = None
    modified_test_case: Optional[str] = None
    review_notes: Optional[str] = None

class ReviewResponse(BaseModel):
    review_id: int
    analysis_result_id: int
    decision: str
    reviewed_at: datetime
    class Config:
        from_attributes = True

class HistoryItem(BaseModel):
    analysis_id: int
    requirement_id: int
    original_text: str
    requirement_type: str
    ambiguity_status: str
    priority_level: str
    acceptance_criteria: Optional[str] = None
    test_case: Optional[str] = None
    review_decision: Optional[str] = None
    created_at: datetime
    class Config:
        from_attributes = True
