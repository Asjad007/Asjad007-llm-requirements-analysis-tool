from datetime import datetime

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.database import Base


class Requirement(Base):
    __tablename__ = "requirements"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)
    requirement_text = Column(Text, nullable=False)
    source_type = Column(String(50), default="manual")
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="requirements")
    analysis_results = relationship(
        "AnalysisResult",
        back_populates="requirement",
        cascade="all, delete-orphan",
    )


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    domain_system_type = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    requirements = relationship("Requirement", back_populates="project")


class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    id = Column(Integer, primary_key=True, index=True)
    requirement_id = Column(Integer, ForeignKey("requirements.id"), nullable=False)

    requirement_type = Column(String(100), nullable=False)
    ambiguity_status = Column(String(100), nullable=False)
    ambiguity_explanation = Column(Text, nullable=True)
    priority_level = Column(String(100), nullable=False)
    priority_reason = Column(Text, nullable=True)
    acceptance_criteria = Column(Text, nullable=True)
    test_case = Column(Text, nullable=True)

    improvement_suggestion = Column(Text, nullable=True)
    confidence_score = Column(Float, nullable=True)
    analysis_method = Column(String(255), nullable=True)
    literature_basis = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    requirement = relationship("Requirement", back_populates="analysis_results")
    reviews = relationship(
        "UserReview",
        back_populates="analysis_result",
        cascade="all, delete-orphan",
        foreign_keys="UserReview.analysis_result_id",
    )


class UserReview(Base):
    __tablename__ = "user_reviews"

    id = Column(Integer, primary_key=True, index=True)
    requirement_id = Column(Integer, ForeignKey("requirements.id"), nullable=True)
    analysis_result_id = Column(Integer, ForeignKey("analysis_results.id"), nullable=False)
    refined_analysis_result_id = Column(Integer, ForeignKey("analysis_results.id"), nullable=True)

    decision = Column(String(50), nullable=False)
    final_refined_requirement = Column(Text, nullable=True)
    final_type = Column(String(100), nullable=True)
    final_priority = Column(String(100), nullable=True)
    final_ambiguity_status = Column(String(100), nullable=True)
    final_acceptance_criteria = Column(Text, nullable=True)
    final_test_cases = Column(Text, nullable=True)
    field_level_decisions = Column(Text, nullable=True)
    reviewer_notes = Column(Text, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    modified_requirement_type = Column(String(100), nullable=True)
    modified_priority = Column(String(100), nullable=True)
    modified_acceptance_criteria = Column(Text, nullable=True)
    modified_test_case = Column(Text, nullable=True)
    review_notes = Column(Text, nullable=True)
    reviewed_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    requirement = relationship("Requirement")
    analysis_result = relationship("AnalysisResult", back_populates="reviews", foreign_keys=[analysis_result_id])
    refined_analysis_result = relationship("AnalysisResult", foreign_keys=[refined_analysis_result_id])
