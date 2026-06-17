import os
import json
from openai import OpenAI

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def generate_analysis(requirement_text: str):
    prompt = f"""
You are an expert Requirements Engineer working in software engineering research.

Analyze the following software requirement:

"{requirement_text}"

Return ONLY valid JSON (no markdown, no explanation text).

JSON format:
{{
  "requirement_type": "Functional or Non-functional",
  "ambiguity_status": "Clear or Ambiguous",
  "ambiguity_explanation": "short explanation",
  "priority_level": "Low or Medium or High",
  "acceptance_criteria": "Gherkin style statement",
  "test_case": "test case description",
  "improvement_suggestion": "how to improve requirement clarity",
  "confidence_score": 0.0 to 1.0
}}

Base reasoning on Software Requirements Engineering best practices.
"""

    try:
        response = client.chat.completions.create(
            model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
            messages=[
                {"role": "system", "content": "You are a requirements engineering assistant."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3
        )

        content = response.choices[0].message.content

        # force JSON parsing
        return json.loads(content)

    except json.JSONDecodeError:
        return {
            "requirement_type": "Unknown",
            "ambiguity_status": "Unknown",
            "ambiguity_explanation": "Failed to parse LLM output",
            "priority_level": "Medium",
            "acceptance_criteria": "",
            "test_case": "",
            "improvement_suggestion": "",
            "confidence_score": 0.5
        }

    except Exception as e:
        return {
            "requirement_type": "Error",
            "ambiguity_status": "Error",
            "ambiguity_explanation": str(e),
            "priority_level": "Medium",
            "acceptance_criteria": "",
            "test_case": "",
            "improvement_suggestion": "",
            "confidence_score": 0.0
        }