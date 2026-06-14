from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class RequirementCreate(BaseModel):
    requirement_text: str = Field(..., min_length=5)
    source_type: str = "manual"


class AnalysisResponse(BaseModel):
    analysis_id: int
    requirement_id: int
    original_text: str
    requirement_type: str
    ambiguity_status: str
    ambiguity_explanation: str
    priority_level: str
    priority_reason: str
    acceptance_criteria: str
    test_case: str
    improvement_suggestion: Optional[str] = None
    confidence_score: Optional[float] = None
    analysis_method: Optional[str] = None
    literature_basis: Optional[str] = None
    created_at: datetime


class ReviewCreate(BaseModel):
    decision: str
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


class HistoryItem(BaseModel):
    analysis_id: int
    requirement_id: int
    original_text: str
    requirement_type: str
    ambiguity_status: str
    priority_level: str
    confidence_score: Optional[float] = None
    improvement_suggestion: Optional[str] = None
    review_decision: Optional[str] = None
    created_at: datetime