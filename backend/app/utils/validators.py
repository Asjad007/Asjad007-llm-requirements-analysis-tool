from fastapi import HTTPException

def validate_requirement_text(text: str) -> str:
    cleaned = ' '.join(text.strip().split())
    if not cleaned:
        raise HTTPException(status_code=400, detail='Requirement text cannot be empty.')
    if len(cleaned) < 10:
        raise HTTPException(status_code=400, detail='Requirement text is too short to analyse.')
    if len(cleaned) > 5000:
        raise HTTPException(status_code=400, detail='Requirement text is too long for this MVP.')
    return cleaned
