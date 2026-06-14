from datetime import datetime

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.database import Base


class Requirement(Base):
    __tablename__ = "requirements"

    id = Column(Integer, primary_key=True, index=True)
    requirement_text = Column(Text, nullable=False)
    source_type = Column(String(50), default="manual")
    created_at = Column(DateTime, default=datetime.utcnow)

    analysis_results = relationship("AnalysisResult", back_populates="requirement")


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
    reviews = relationship("UserReview", back_populates="analysis_result")


class UserReview(Base):
    __tablename__ = "user_reviews"

    id = Column(Integer, primary_key=True, index=True)
    analysis_result_id = Column(Integer, ForeignKey("analysis_results.id"), nullable=False)

    decision = Column(String(50), nullable=False)
    modified_requirement_type = Column(String(100), nullable=True)
    modified_priority = Column(String(100), nullable=True)
    modified_acceptance_criteria = Column(Text, nullable=True)
    modified_test_case = Column(Text, nullable=True)
    review_notes = Column(Text, nullable=True)

    reviewed_at = Column(DateTime, default=datetime.utcnow)

    analysis_result = relationship("AnalysisResult", back_populates="reviews")