import json
import os
from typing import Dict, Any

from openai import OpenAI

from app.services.prompt_service import build_requirements_analysis_prompt


REQUIRED_FIELDS = {
    "requirement_type": "Unclear",
    "ambiguity_status": "Ambiguous",
    "ambiguity_explanation": "The requirement needs further clarification.",
    "priority_level": "Medium",
    "priority_reason": "The requirement has moderate implementation importance based on the available description.",
    "acceptance_criteria": "Given the requirement, when the relevant user action is performed, then the system should produce the expected verifiable outcome.",
    "test_case": "Verify that the system supports the described requirement and handles valid and invalid inputs correctly.",
    "improvement_suggestion": "Clarify the requirement by adding user role, trigger condition, measurable outcome, and acceptance criteria.",
    "confidence_score": 0.5,
    "analysis_method": "Real OpenAI LLM using prompt-engineered requirements analysis",
    "literature_basis": "LLM-for-Requirements-Engineering and prompt-engineering literature"
}


def _normalise_result(data: Dict[str, Any]) -> Dict[str, Any]:
    if not isinstance(data, dict):
        data = {}

    for key, default_value in REQUIRED_FIELDS.items():
        if key not in data or data[key] in [None, ""]:
            data[key] = default_value

    try:
        data["confidence_score"] = float(data["confidence_score"])
    except Exception:
        data["confidence_score"] = 0.5

    if data["confidence_score"] > 1:
        data["confidence_score"] = data["confidence_score"] / 100

    data["confidence_score"] = max(0.0, min(1.0, data["confidence_score"]))

    return data


def generate_analysis(requirement_text: str, project_context: Dict[str, Any] | None = None) -> Dict[str, Any]:
    api_key = os.getenv("OPENAI_API_KEY", "")
    model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    if not api_key:
        return _normalise_result({
            "analysis_method": "OpenAI configuration error",
            "literature_basis": "OPENAI_API_KEY is missing. Check backend/.env.",
            "ambiguity_explanation": "OpenAI API key is missing, so fallback analysis was used."
        })

    client = OpenAI(api_key=api_key)

    prompt = f"""
You are an expert Requirements Engineering assistant.

{build_requirements_analysis_prompt(requirement_text, project_context)}

Return ONLY valid JSON. Do not include markdown, code fences, or explanation outside JSON.

Use exactly this JSON structure:

{{
  "requirement_type": "Functional / Non-functional / Mixed / Unclear",
  "ambiguity_status": "Clear / Ambiguous",
  "ambiguity_explanation": "Explain whether the requirement is clear or ambiguous.",
  "priority_level": "Low / Medium / High",
  "priority_reason": "Explain why this priority level was selected.",
  "acceptance_criteria": "Write clear, testable acceptance criteria.",
  "test_case": "Write one practical test case for validating the requirement.",
  "improvement_suggestion": "Suggest how the requirement can be improved.",
  "confidence_score": 0.0,
  "analysis_method": "Real OpenAI LLM using prompt-engineered requirements analysis",
  "literature_basis": "LLM-for-Requirements-Engineering and prompt-engineering literature"
}}
"""

    try:
        response = client.chat.completions.create(
            model=model,
            temperature=0.2,
            messages=[
                {
                    "role": "system",
                    "content": "You are a software requirements engineering assistant. Return only valid JSON."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        )

        content = response.choices[0].message.content.strip()

        if content.startswith("```"):
            content = content.replace("```json", "").replace("```", "").strip()

        parsed = json.loads(content)
        return _normalise_result(parsed)

    except Exception as error:
        return _normalise_result({
            "requirement_type": "Unclear",
            "ambiguity_status": "Ambiguous",
            "ambiguity_explanation": f"LLM call failed or returned invalid output: {str(error)}",
            "priority_level": "Medium",
            "priority_reason": "Fallback priority used because the LLM response could not be processed.",
            "acceptance_criteria": "Given the requirement, when the system processes it, then a valid structured response should be produced.",
            "test_case": "Submit the requirement and verify that the system returns a structured analysis response without crashing.",
            "improvement_suggestion": "Check the OpenAI API key, model name, and JSON response format.",
            "confidence_score": 0.3,
            "analysis_method": "LLM fallback after OpenAI/API/JSON error",
            "literature_basis": "Fallback used to preserve system reliability during LLM integration."
        })
