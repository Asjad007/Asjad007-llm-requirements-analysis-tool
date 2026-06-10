def build_requirements_analysis_prompt(requirement_text: str) -> str:
    prompt = (
        "You are assisting with software requirements analysis.

"
        "Analyse the following requirement and return a JSON object with these fields:
"
        "- requirement_type: Functional or Non-functional
"
        "- ambiguity_status: Clear or Ambiguous
"
        "- ambiguity_explanation: short explanation
"
        "- priority_level: High, Medium, or Low
"
        "- priority_reason: short explanation
"
        "- acceptance_criteria: one or more clear acceptance criteria
"
        "- test_case: one simple test case

"
        f"Requirement:
"""{requirement_text}""""
    )
    return prompt.strip()
