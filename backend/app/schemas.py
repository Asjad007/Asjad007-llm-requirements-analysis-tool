from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class RequirementCreate(BaseModel):
    requirement_text: str = Field(..., min_length=5)
    source_type: str = "manual"
    project_id: int


class AnalysisResponse(BaseModel):
    analysis_id: int
    requirement_id: int
    project_id: Optional[int] = None
    project_name: Optional[str] = None
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
    final_refined_requirement: Optional[str] = None
    final_type: Optional[str] = None
    final_priority: Optional[str] = None
    final_ambiguity_status: Optional[str] = None
    final_acceptance_criteria: Optional[str] = None
    final_test_cases: Optional[str] = None
    reviewer_notes: Optional[str] = None
    rejection_reason: Optional[str] = None


class ReviewResponse(BaseModel):
    review_id: int
    requirement_id: int
    analysis_result_id: int
    decision: str
    final_refined_requirement: Optional[str] = None
    final_type: Optional[str] = None
    final_priority: Optional[str] = None
    final_ambiguity_status: Optional[str] = None
    final_acceptance_criteria: Optional[str] = None
    final_test_cases: Optional[str] = None
    reviewer_notes: Optional[str] = None
    rejection_reason: Optional[str] = None
    reviewed_at: datetime
    created_at: datetime
    updated_at: datetime


class HistoryItem(BaseModel):
    analysis_id: int
    requirement_id: int
    project_id: Optional[int] = None
    project_name: Optional[str] = None
    original_text: str
    requirement_type: str
    ambiguity_status: str
    ambiguity_explanation: Optional[str] = None
    priority_level: str
    priority_reason: Optional[str] = None
    acceptance_criteria: Optional[str] = None
    test_case: Optional[str] = None
    confidence_score: Optional[float] = None
    improvement_suggestion: Optional[str] = None
    review_decision: Optional[str] = None
    analysis_method: Optional[str] = None
    literature_basis: Optional[str] = None

    created_at: datetime
    review_id: Optional[int] = None
    review_decision: Optional[str] = None
    reviewer_notes: Optional[str] = None
    rejection_reason: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    review_created_at: Optional[datetime] = None
    review_updated_at: Optional[datetime] = None
    final_refined_requirement: Optional[str] = None
    final_type: Optional[str] = None
    final_priority: Optional[str] = None
    final_ambiguity_status: Optional[str] = None
    final_acceptance_criteria: Optional[str] = None
    final_test_cases: Optional[str] = None
    refined_analysis_result_id: Optional[int] = None

    # Compatibility aliases for existing frontend tables
    review_notes: Optional[str] = None
    modified_requirement_type: Optional[str] = None
    modified_priority: Optional[str] = None
    modified_acceptance_criteria: Optional[str] = None
    modified_test_case: Optional[str] = None
    modified_into_analysis_id: Optional[int] = None

    class Config:
        from_attributes = True


class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=2)
    description: Optional[str] = None
    domain_system_type: Optional[str] = None


class ProjectUpdate(BaseModel):
    name: str = Field(..., min_length=2)
    description: Optional[str] = None
    domain_system_type: Optional[str] = None


class ProjectResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    domain_system_type: Optional[str] = None
    requirement_count: int = 0
    created_at: datetime
    updated_at: datetime


class ProjectContext(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    domain_system_type: Optional[str] = None
