import { REVIEW_STATUSES, normalizeReviewStatus } from "./reviewStatuses";

export const FIELD_REVIEW_KEYS = [
  "classification",
  "priority",
  "ambiguity",
  "acceptance_criteria",
  "test_cases",
];

export const FIELD_REVIEW_LABELS = {
  classification: "Classification",
  priority: "Priority",
  ambiguity: "Ambiguity",
  acceptance_criteria: "Acceptance Criteria",
  test_cases: "Test Cases",
};

export const FIELD_REVIEW_OPTIONS = [
  REVIEW_STATUSES.ACCEPTED,
  REVIEW_STATUSES.MODIFIED,
  REVIEW_STATUSES.REJECTED,
];

export function buildAcceptedFieldDecisions() {
  return FIELD_REVIEW_KEYS.reduce((accumulator, key) => {
    accumulator[key] = REVIEW_STATUSES.ACCEPTED;
    return accumulator;
  }, {});
}

export function buildRejectedFieldDecisions(selectedKeys = []) {
  if (!selectedKeys.length) {
    return FIELD_REVIEW_KEYS.reduce((accumulator, key) => {
      accumulator[key] = REVIEW_STATUSES.REJECTED;
      return accumulator;
    }, {});
  }

  return FIELD_REVIEW_KEYS.reduce((accumulator, key) => {
    accumulator[key] = selectedKeys.includes(key) ? REVIEW_STATUSES.REJECTED : REVIEW_STATUSES.ACCEPTED;
    return accumulator;
  }, {});
}

export function normalizeFieldReviewDecisions(value) {
  const source = value && typeof value === "object" ? value : {};

  return FIELD_REVIEW_KEYS.reduce((accumulator, key) => {
    const decision = source[key];
    accumulator[key] = decision ? normalizeReviewStatus(decision) : null;
    return accumulator;
  }, {});
}

function normaliseText(value) {
  return String(value ?? "").trim();
}

function inferDecision(llmValue, finalValue) {
  const normalizedLlmValue = normaliseText(llmValue);
  const normalizedFinalValue = normaliseText(finalValue);

  if (!normalizedLlmValue && !normalizedFinalValue) return REVIEW_STATUSES.ACCEPTED;
  if (normalizedLlmValue && !normalizedFinalValue) return REVIEW_STATUSES.REJECTED;

  return normalizedLlmValue === normalizedFinalValue
    ? REVIEW_STATUSES.ACCEPTED
    : REVIEW_STATUSES.MODIFIED;
}

export function inferFieldReviewDecisions(item) {
  const explicit = normalizeFieldReviewDecisions(item?.field_level_decisions);

  if (FIELD_REVIEW_KEYS.some((key) => explicit[key])) {
    return explicit;
  }

  const overall = normalizeReviewStatus(item?.review_decision);

  if (overall === REVIEW_STATUSES.PENDING) {
    return FIELD_REVIEW_KEYS.reduce((accumulator, key) => {
      accumulator[key] = null;
      return accumulator;
    }, {});
  }

  if (overall === REVIEW_STATUSES.ACCEPTED) {
    return buildAcceptedFieldDecisions();
  }

  if (overall === REVIEW_STATUSES.REJECTED) {
    return buildRejectedFieldDecisions();
  }

  return {
    classification: inferDecision(item?.requirement_type, item?.final_type),
    priority: inferDecision(item?.priority_level, item?.final_priority),
    ambiguity: inferDecision(item?.ambiguity_status, item?.final_ambiguity_status),
    acceptance_criteria: inferDecision(item?.acceptance_criteria, item?.final_acceptance_criteria),
    test_cases: inferDecision(item?.test_case, item?.final_test_cases),
  };
}

export function buildModifiedFieldDecisions({
  llmType,
  finalType,
  llmPriority,
  finalPriority,
  llmAmbiguity,
  finalAmbiguity,
  llmAcceptanceCriteria,
  finalAcceptanceCriteria,
  llmTestCases,
  finalTestCases,
  explicitDecisions = {},
}) {
  const explicit = normalizeFieldReviewDecisions(explicitDecisions);

  return {
    classification: explicit.classification || inferDecision(llmType, finalType),
    priority: explicit.priority || inferDecision(llmPriority, finalPriority),
    ambiguity: explicit.ambiguity || inferDecision(llmAmbiguity, finalAmbiguity),
    acceptance_criteria: explicit.acceptance_criteria || inferDecision(llmAcceptanceCriteria, finalAcceptanceCriteria),
    test_cases: explicit.test_cases || inferDecision(llmTestCases, finalTestCases),
  };
}

export function getFieldReviewBadgeText(decision) {
  const normalized = decision ? normalizeReviewStatus(decision) : null;
  return normalized || "Pending";
}
