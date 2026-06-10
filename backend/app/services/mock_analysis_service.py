import json

FUNCTIONAL_KEYWORDS = ['user', 'system shall', 'allow', 'create', 'update', 'delete', 'view', 'search', 'login', 'register', 'upload', 'download', 'generate', 'submit', 'send']
NON_FUNCTIONAL_KEYWORDS = ['performance', 'secure', 'security', 'availability', 'reliable', 'usability', 'response time', 'scalable', 'maintainable', 'privacy', 'backup']
AMBIGUOUS_KEYWORDS = ['fast', 'quickly', 'easy', 'user-friendly', 'as soon as possible', 'etc', 'appropriate', 'efficient', 'better', 'normal', 'simple']
HIGH_PRIORITY_KEYWORDS = ['login', 'security', 'payment', 'submit', 'save', 'data', 'privacy', 'authentication']

def analyse_requirement_mock(requirement_text: str) -> dict:
    text = requirement_text.lower()
    requirement_type = 'Non-functional' if any(k in text for k in NON_FUNCTIONAL_KEYWORDS) else 'Functional'
    ambiguous_hits = [k for k in AMBIGUOUS_KEYWORDS if k in text]
    ambiguity_status = 'Ambiguous' if ambiguous_hits else 'Clear'
    ambiguity_explanation = f"The requirement contains potentially vague wording: {', '.join(ambiguous_hits)}." if ambiguous_hits else 'The requirement is reasonably clear for initial analysis.'
    if any(k in text for k in HIGH_PRIORITY_KEYWORDS):
        priority_level = 'High'
        priority_reason = 'This requirement appears important for core operation, security, or data handling.'
    elif ambiguity_status == 'Ambiguous':
        priority_level = 'Medium'
        priority_reason = 'The requirement should be clarified before implementation.'
    else:
        priority_level = 'Medium'
        priority_reason = 'This requirement appears relevant but does not indicate immediate criticality.'
    acceptance_criteria = 'Given the relevant user need, when the system performs this function, then the expected behaviour should be completed and verifiable.'
    test_case = f"Test that the system correctly supports this requirement: '{requirement_text[:120]}'. Verify expected behaviour, validation, and error handling."
    result = {
        'requirement_type': requirement_type,
        'ambiguity_status': ambiguity_status,
        'ambiguity_explanation': ambiguity_explanation,
        'priority_level': priority_level,
        'priority_reason': priority_reason,
        'acceptance_criteria': acceptance_criteria,
        'test_case': test_case,
    }
    result['raw_llm_response'] = json.dumps(result, indent=2)
    return result
