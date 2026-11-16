from typing import Optional
def build_requirements_analysis_prompt(requirement_text: str, project_context: Optional[dict] = None) -> str:
 
    project_name = (project_context or {}).get("name") or "Not provided"
    project_description = (project_context or {}).get("description") or "Not provided"
    domain_system_type = (project_context or {}).get("domain_system_type") or "Not provided"
    stakeholders = (project_context or {}).get("stakeholders") or "Not provided"

    prompt = f"""
You are assisting with software requirements analysis.

Use the project context below to interpret the requirement accurately and produce outputs that fit the domain, system purpose, and likely stakeholder needs.

Project Context:
- Project name: {project_name}
- Project description: {project_description}
- Domain/system type: {domain_system_type}
- Stakeholders: {stakeholders}

Analyse the following requirement and return a JSON object with these fields:

- requirement_type: Functional or Non-functional
- ambiguity_status: Clear or Ambiguous
- ambiguity_explanation: short explanation
- priority_level: High, Medium, or Low
- priority_reason: short explanation
- acceptance_criteria: one or more clear acceptance criteria
- test_case: one simple test case

Requirement:
{requirement_text}
"""
    return prompt.strip()
