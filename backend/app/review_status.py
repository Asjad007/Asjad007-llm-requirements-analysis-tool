from fastapi import HTTPException


REVIEW_STATUSES = {
    "PENDING": "Pending",
    "ACCEPTED": "Accepted",
    "MODIFIED": "Modified",
    "REJECTED": "Rejected",
}

_REVIEW_STATUS_MAP = {
    "pending": REVIEW_STATUSES["PENDING"],
    "reviewed": REVIEW_STATUSES["ACCEPTED"],
    "approved": REVIEW_STATUSES["ACCEPTED"],
    "accept": REVIEW_STATUSES["ACCEPTED"],
    "accepted": REVIEW_STATUSES["ACCEPTED"],
    "modify": REVIEW_STATUSES["MODIFIED"],
    "modified": REVIEW_STATUSES["MODIFIED"],
    "reject": REVIEW_STATUSES["REJECTED"],
    "rejected": REVIEW_STATUSES["REJECTED"],
}


def normalize_review_status(value: str | None) -> str:
    if not value:
        return REVIEW_STATUSES["PENDING"]

    normalized_key = str(value).strip().lower()
    return _REVIEW_STATUS_MAP.get(normalized_key, REVIEW_STATUSES["PENDING"])


def normalize_review_status_or_raise(value: str | None) -> str:
    if not value:
        raise HTTPException(status_code=400, detail="Review decision is required")

    normalized_key = str(value).strip().lower()
    if normalized_key not in _REVIEW_STATUS_MAP:
        allowed_values = ", ".join(REVIEW_STATUSES.values())
        raise HTTPException(status_code=400, detail=f"Review decision must be one of: {allowed_values}")

    return _REVIEW_STATUS_MAP[normalized_key]
