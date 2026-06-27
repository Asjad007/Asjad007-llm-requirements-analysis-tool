import { REVIEW_STATUSES, normalizeReviewStatus } from "./reviewStatuses";

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function getHistoryMatch(referenceEntry, history) {
  if (referenceEntry.requirement_id) {
    return history.find((item) => item.requirement_id === referenceEntry.requirement_id) || null;
  }

  return history.find(
    (item) => normalizeText(item.original_text) === normalizeText(referenceEntry.original_requirement_text)
  ) || null;
}

function compareValue(left, right) {
  if (!left || !right) return null;
  return normalizeText(left) === normalizeText(right);
}

function compareQualitative(llmValue, referenceValue) {
  if (!referenceValue) return "Missing";
  if (!llmValue) return "Missing";
  return "Needs manual review";
}

export function buildReferenceComparison(referenceEntries = [], history = []) {
  const linkedEntries = referenceEntries
    .map((referenceEntry) => ({
      referenceEntry,
      historyItem: getHistoryMatch(referenceEntry, history),
    }))
    .filter((entry) => entry.historyItem);

  const rows = linkedEntries.map(({ referenceEntry, historyItem }) => {
    const humanType = historyItem.final_type || historyItem.modified_requirement_type || (normalizeReviewStatus(historyItem.review_decision) === REVIEW_STATUSES.ACCEPTED ? historyItem.requirement_type : null);
    const humanPriority = historyItem.final_priority || historyItem.modified_priority || (normalizeReviewStatus(historyItem.review_decision) === REVIEW_STATUSES.ACCEPTED ? historyItem.priority_level : null);
    const humanAmbiguity = historyItem.final_ambiguity_status || (normalizeReviewStatus(historyItem.review_decision) === REVIEW_STATUSES.ACCEPTED ? historyItem.ambiguity_status : null);

    return {
      referenceEntry,
      historyItem,
      llmClassificationMatches: compareValue(historyItem.requirement_type, referenceEntry.reference_type),
      llmPriorityMatches: compareValue(historyItem.priority_level, referenceEntry.reference_priority),
      llmAmbiguityMatches: compareValue(historyItem.ambiguity_status, referenceEntry.reference_ambiguity_status),
      humanClassificationMatches: compareValue(humanType, referenceEntry.reference_type),
      humanPriorityMatches: compareValue(humanPriority, referenceEntry.reference_priority),
      humanAmbiguityMatches: compareValue(humanAmbiguity, referenceEntry.reference_ambiguity_status),
      llmAcceptanceCriteriaStatus: compareQualitative(historyItem.acceptance_criteria, referenceEntry.reference_acceptance_criteria),
      llmTestCasesStatus: compareQualitative(historyItem.test_case, referenceEntry.reference_test_cases),
      humanAcceptanceCriteriaStatus: compareQualitative(historyItem.final_acceptance_criteria, referenceEntry.reference_acceptance_criteria),
      humanTestCasesStatus: compareQualitative(historyItem.final_test_cases, referenceEntry.reference_test_cases),
    };
  });

  function calculateAgreement(key) {
    const available = rows.filter((row) => row[key] !== null);
    if (!available.length) return null;
    const matching = available.filter((row) => row[key] === true).length;
    return {
      linkedCount: available.length,
      matchCount: matching,
      rate: matching / available.length,
    };
  }

  return {
    linkedEntries: rows,
    linkedCount: rows.length,
    llmClassification: calculateAgreement("llmClassificationMatches"),
    humanClassification: calculateAgreement("humanClassificationMatches"),
    llmPriority: calculateAgreement("llmPriorityMatches"),
    humanPriority: calculateAgreement("humanPriorityMatches"),
    llmAmbiguity: calculateAgreement("llmAmbiguityMatches"),
    humanAmbiguity: calculateAgreement("humanAmbiguityMatches"),
  };
}
