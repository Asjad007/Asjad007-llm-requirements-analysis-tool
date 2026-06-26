import re
from typing import Iterable, List


START_PATTERN = re.compile(
    r"^(?:"
    r"req[\s_-]?\d+[\]:.)-]?\s*|"
    r"(?:\d+(?:\.\d+)*|[a-zA-Z])[\])\.: -]\s+|"
    r"[-*•]\s+|"
    r"(?:the\s+system|the\s+application|the\s+user|system|application|user|administrator|admin)\s+"
    r"(?:shall|should|must|will|can)\b"
    r")",
    re.IGNORECASE,
)

PAGE_NUMBER_PATTERN = re.compile(r"^(?:page\s+\d+(?:\s+of\s+\d+)?|\d+)$", re.IGNORECASE)


def normalize_requirement_text(text: str) -> str:
    normalized = (text or "").replace("\r\n", "\n").replace("\r", "\n")
    normalized = normalized.replace("\u2022", "•").replace("\t", " ")
    normalized = re.sub(r"[ ]{2,}", " ", normalized)
    normalized = re.sub(r"\n{3,}", "\n\n", normalized)
    return normalized.strip()


def is_requirement_start(line: str) -> bool:
    return bool(START_PATTERN.match(line.strip()))


def clean_requirement_candidate(text: str) -> str:
    candidate = normalize_requirement_text(text)
    candidate = re.sub(r"^[-*•]\s*", "", candidate)
    candidate = re.sub(r"^(?:req[\s_-]?\d+|(?:\d+(?:\.\d+)*|[a-zA-Z]))[\])\.: -]+\s*", "", candidate, flags=re.IGNORECASE)
    candidate = re.sub(r"\s+", " ", candidate)
    return candidate.strip(" -:\n\t")


def extract_requirements_from_text(text: str) -> List[str]:
    normalized = normalize_requirement_text(text)

    if not normalized:
        return []

    lines = [line.strip() for line in normalized.split("\n")]
    requirements: List[str] = []
    buffer: List[str] = []

    for raw_line in lines:
        line = raw_line.strip()

        if not line:
            if buffer:
                requirements.append(clean_requirement_candidate(" ".join(buffer)))
                buffer = []
            continue

        if PAGE_NUMBER_PATTERN.match(line):
            continue

        starts_requirement = is_requirement_start(line)

        if starts_requirement and buffer:
            requirements.append(clean_requirement_candidate(" ".join(buffer)))
            buffer = [line]
            continue

        if starts_requirement:
            buffer = [line]
            continue

        if buffer:
            buffer.append(line)
            continue

        if re.search(r"\b(?:shall|should|must|will|can)\b", line, re.IGNORECASE):
            buffer = [line]

    if buffer:
        requirements.append(clean_requirement_candidate(" ".join(buffer)))

    unique_requirements: List[str] = []
    seen = set()

    for requirement in requirements:
        if not requirement or len(requirement) < 5:
            continue

        key = requirement.casefold()
        if key in seen:
            continue

        seen.add(key)
        unique_requirements.append(requirement)

    if unique_requirements:
        return unique_requirements

    fallback = clean_requirement_candidate(normalized)
    return [fallback] if fallback else []


def build_requirements_text(requirements: Iterable[str]) -> str:
    cleaned = [clean_requirement_candidate(item) for item in requirements if clean_requirement_candidate(item)]
    return "\n".join(cleaned)
