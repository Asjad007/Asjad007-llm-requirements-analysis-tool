from .mock_analysis_service import analyse_requirement_mock
from ..config import settings

def analyse_requirement(requirement_text: str) -> dict:
    if settings.USE_MOCK_LLM:
        return analyse_requirement_mock(requirement_text)
    raise RuntimeError('Real LLM integration is not configured. Set USE_MOCK_LLM=true for the MVP.')
