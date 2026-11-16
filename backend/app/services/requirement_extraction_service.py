import re
from typing import Iterable, List


# Lines that clearly begin like real software requirements.
# This deliberately avoids treating every numbered heading/checklist item as a requirement.
REQUIREMENT_LANGUAGE_PATTERN = re.compile(
    r"\b("
    r"(?:the\s+)?(?:system|application|software|platform|tool|module|dashboard|interface)\s+"
    r"(?:shall|should|must|will|can|allows?|enables?|prevents?|generates?|records?|loads?|encrypts?|sends?|calculates?)"
    r"|"
    r"(?:the\s+)?(?:administrator|admin|librarian|member|user|registered\s+user|registered\s+users|staff)\s+"
    r"(?:shall|should|must|will|can|be\s+able\s+to|is\s+able\s+to)"
    r")\b",
    re.IGNORECASE,
)

# Requirement-like action verbs. Used as secondary evidence.
ACTION_PATTERN = re.compile(
    r"\b("
    r"shall|should|must|will|can|"
    r"allow|allows|enable|enables|prevent|prevents|generate|generates|"
    r"record|records|send|sends|calculate|calculates|encrypt|encrypts|"
    r"display|displays|notify|notifies|store|stores|update|updates|"
    r"create|creates|delete|deletes|edit|edits|import|imports|export|exports"
    r")\b",
    re.IGNORECASE,
)

# Optional numbering/bullet prefix.
PREFIX_PATTERN = re.compile(
    r"^(?:"
    r"req[\s_-]?\d+[\]:.)-]?\s*|"
    r"(?:\d+(?:\.\d+)*|[a-zA-Z])[\])\.: -]\s+|"
    r"[-*•☐✅]\s+"
    r")",
    re.IGNORECASE,
)

PAGE_NUMBER_PATTERN = re.compile(
    r"^(?:page\s+\d+(?:\s+of\s+\d+)?|\d+)$",
    re.IGNORECASE,
)

HEADING_OR_NOISE_PATTERN = re.compile(
    r"\b("
    r"contents|purpose of|definition of done|test environment|pre-test checklist|"
    r"recommended test data|end-to-end workflow|screen-by-screen|functional testing|"
    r"human validation rules|field-level decision rules|evaluation metrics|"
    r"reference dataset|csv format|demonstration script|test case matrix|"
    r"common defects|final dissertation readiness checklist|tester notes|"
    r"pass\s*/\s*fail|expected result|research meaning|prepared for|document item details|"
    r"project title|primary research focus|area expected setup|sample requirements for testing"
    r")\b",
    re.IGNORECASE,
)


def normalize_requirement_text(text: str) -> str:
    normalized = (text or "").replace("\r\n", "\n").replace("\r", "\n")
    normalized = normalized.replace("\u2022", "•").replace("\t", " ")
    normalized = re.sub(r"[ ]{2,}", " ", normalized)
    normalized = re.sub(r"\n{3,}", "\n\n", normalized)
    return normalized.strip()


def strip_requirement_prefix(text: str) -> str:
    candidate = normalize_requirement_text(text)
    candidate = PREFIX_PATTERN.sub("", candidate)
    candidate = re.sub(
        r"^(?:req[\s_-]?\d+|(?:\d+(?:\.\d+)*|[a-zA-Z]))[\])\.: -]+\s*",
        "",
        candidate,
        flags=re.IGNORECASE,
    )
    candidate = re.sub(r"\s+", " ", candidate)
    return candidate.strip(" -:\n\t")


def looks_like_heading_or_noise(text: str) -> bool:
    candidate = strip_requirement_prefix(text)
    lowered = candidate.casefold()

    if not candidate:
        return True

    if PAGE_NUMBER_PATTERN.match(candidate):
        return True

    if HEADING_OR_NOISE_PATTERN.search(candidate):
        return True

    # Very short title-like fragments are usually headings, not requirements.
    if len(candidate.split()) <= 5 and not ACTION_PATTERN.search(candidate):
        return True

    # Table headers / labels.
    if lowered in {
        "test",
        "expected result",
        "result",
        "tester notes",
        "notes",
        "pass",
        "fail",
        "pass / fail",
        "project",
        "description",
        "date",
        "status",
        "metric",
        "formula",
        "meaning",
        "example",
        "column",
        "required",
    }:
        return True

    return False


def is_requirement_like(text: str) -> bool:
    candidate = strip_requirement_prefix(text)

    if looks_like_heading_or_noise(candidate):
        return False

    # Strong requirement signal.
    if REQUIREMENT_LANGUAGE_PATTERN.search(candidate):
        return True

    # Secondary signal: sentence has requirement modal/action and a software-related subject.
    has_action = ACTION_PATTERN.search(candidate)
    has_software_subject = re.search(
        r"\b(system|application|software|platform|tool|module|dashboard|interface|user|admin|administrator|librarian|member|staff)\b",
        candidate,
        re.IGNORECASE,
    )

    if has_action and has_software_subject and len(candidate.split()) >= 8:
        return True

    return False


def is_requirement_start(line: str) -> bool:
    candidate = line.strip()

    if not candidate:
        return False

    # A line can start a requirement only if the cleaned line itself looks requirement-like.
    return is_requirement_like(candidate)


def clean_requirement_candidate(text: str) -> str:
    candidate = strip_requirement_prefix(text)
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
                candidate = clean_requirement_candidate(" ".join(buffer))
                if is_requirement_like(candidate):
                    requirements.append(candidate)
                buffer = []
            continue

        if PAGE_NUMBER_PATTERN.match(line):
            continue

        if looks_like_heading_or_noise(line):
            if buffer:
                candidate = clean_requirement_candidate(" ".join(buffer))
                if is_requirement_like(candidate):
                    requirements.append(candidate)
                buffer = []
            continue

        starts_requirement = is_requirement_start(line)

        if starts_requirement and buffer:
            candidate = clean_requirement_candidate(" ".join(buffer))
            if is_requirement_like(candidate):
                requirements.append(candidate)
            buffer = [line]
            continue

        if starts_requirement:
            buffer = [line]
            continue

        # Continue only when the previous line already started a real requirement.
        # This allows multi-line requirements while avoiding headings/checklists becoming requirements.
        if buffer:
            buffer.append(line)
            continue

    if buffer:
        candidate = clean_requirement_candidate(" ".join(buffer))
        if is_requirement_like(candidate):
            requirements.append(candidate)

    unique_requirements: List[str] = []
    seen = set()

    for requirement in requirements:
        cleaned = clean_requirement_candidate(requirement)

        if not cleaned or len(cleaned) < 20:
            continue

        if not is_requirement_like(cleaned):
            continue

        key = cleaned.casefold()
        if key in seen:
            continue

        seen.add(key)
        unique_requirements.append(cleaned)

    return unique_requirements


def build_requirements_text(requirements: Iterable[str]) -> str:
    cleaned = [
        clean_requirement_candidate(item)
        for item in requirements
        if clean_requirement_candidate(item) and is_requirement_like(item)
    ]
    return "\n".join(cleaned)