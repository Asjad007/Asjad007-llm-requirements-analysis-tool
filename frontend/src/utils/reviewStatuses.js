export const REVIEW_STATUSES = {
  PENDING: "Pending",
  ACCEPTED: "Accepted",
  MODIFIED: "Modified",
  REJECTED: "Rejected",
};

const REVIEW_STATUS_MAP = {
  pending: REVIEW_STATUSES.PENDING,
  reviewed: REVIEW_STATUSES.ACCEPTED,
  approved: REVIEW_STATUSES.ACCEPTED,
  accept: REVIEW_STATUSES.ACCEPTED,
  accepted: REVIEW_STATUSES.ACCEPTED,
  modify: REVIEW_STATUSES.MODIFIED,
  modified: REVIEW_STATUSES.MODIFIED,
  reject: REVIEW_STATUSES.REJECTED,
  rejected: REVIEW_STATUSES.REJECTED,
};

export function normalizeReviewStatus(value) {
  if (!value) return REVIEW_STATUSES.PENDING;

  const normalizedKey = String(value).trim().toLowerCase();
  return REVIEW_STATUS_MAP[normalizedKey] || REVIEW_STATUSES.PENDING;
}

export function isReviewedStatus(value) {
  return normalizeReviewStatus(value) !== REVIEW_STATUSES.PENDING;
}

export function getReviewStatusBadgeClass(value) {
  const status = normalizeReviewStatus(value);

  if (status === REVIEW_STATUSES.ACCEPTED) return "badge badge-green";
  if (status === REVIEW_STATUSES.MODIFIED) return "badge badge-orange";
  if (status === REVIEW_STATUSES.REJECTED) return "badge badge-red";
  return "badge badge-neutral";
}
