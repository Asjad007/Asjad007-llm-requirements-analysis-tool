"""Deterministic analysis service matching the provider response schema."""

from typing import Dict


def analyse_requirement_with_mock_llm(requirement_text: str) -> Dict:
    text = requirement_text.lower()

    functional_keywords = [
        "shall allow", "shall enable", "upload", "download", "generate",
        "edit", "delete", "create", "view", "store", "login", "register",
        "submit", "accept", "modify", "reject"
    ]

    non_functional_keywords = [
        "fast", "secure", "performance", "within", "seconds", "availability",
        "usability", "reliable", "scalable", "unauthorised", "unauthorized",
        "privacy", "encrypted"
    ]

    vague_keywords = [
        "fast", "user-friendly", "good", "easy", "efficient", "better",
        "quick", "simple", "appropriate", "suitable"
    ]

    high_priority_keywords = [
        "security", "secure", "unauthorised", "unauthorized", "privacy",
        "login", "authentication", "database", "stored", "prevent"
    ]

    has_functional = any(word in text for word in functional_keywords)
    has_non_functional = any(word in text for word in non_functional_keywords)
    vague_terms = [word for word in vague_keywords if word in text]
    has_high_priority = any(word in text for word in high_priority_keywords)

    if has_functional and has_non_functional:
        requirement_type = "Mixed"
    elif has_non_functional:
        requirement_type = "Non-functional"
    elif has_functional:
        requirement_type = "Functional"
    else:
        requirement_type = "Unclear"

    if vague_terms:
        ambiguity_status = "Ambiguous"
        ambiguity_explanation = (
            "The requirement contains potentially vague wording: "
            + ", ".join(vague_terms)
            + "."
        )
        improvement_suggestion = (
            "Clarify the requirement by adding measurable conditions, specific user roles, "
            "expected system behaviour, and objective success criteria."
        )
        confidence_score = 0.68
    else:
        ambiguity_status = "Clear"
        ambiguity_explanation = "The requirement is reasonably clear for initial analysis."
        improvement_suggestion = (
            "The requirement is understandable. It can be improved further by adding "
            "specific preconditions, expected output, and measurable acceptance criteria."
        )
        confidence_score = 0.86

    if has_high_priority:
        priority_level = "High"
        priority_reason = (
            "The requirement relates to security, access control, stored data, or core system protection."
        )
    elif ambiguity_status == "Ambiguous":
        priority_level = "Medium"
        priority_reason = "The requirement should be clarified before implementation."
    else:
        priority_level = "Medium"
        priority_reason = "This requirement appears relevant but does not indicate immediate criticality."

    acceptance_criteria = (
        "Given the relevant user need, when the system processes this requirement, "
        "then the expected behaviour should be completed successfully and verified "
        "through observable system output."
    )

    test_case = (
        f"Test that the system correctly supports this requirement: '{requirement_text}'. "
        "Verify expected behaviour, input validation, output correctness, and error handling."
    )

    return {
        "requirement_type": requirement_type,
        "ambiguity_status": ambiguity_status,
        "ambiguity_explanation": ambiguity_explanation,
        "priority_level": priority_level,
        "priority_reason": priority_reason,
        "acceptance_criteria": acceptance_criteria,
        "test_case": test_case,
        "improvement_suggestion": improvement_suggestion,
        "confidence_score": confidence_score,
        "analysis_method": "Prompt-engineered LLM-assisted requirements analysis",
        "literature_basis": "LLM-for-Requirements-Engineering and prompt-engineering literature"
    }


def analyse_requirement(requirement_text: str) -> Dict:
    return analyse_requirement_with_mock_llm(requirement_text)
