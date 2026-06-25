import AppDataTable from "./AppDataTable";
import {
  REVIEW_STATUSES,
  getReviewStatusBadgeClass,
  normalizeReviewStatus,
} from "../utils/reviewStatuses";

function formatReqId(id) {
  return `REQ-${String(id).padStart(3, "0")}`;
}

function badgeClass(value) {
  if (!value) return "badge badge-orange";

  const normalised = value.toLowerCase();

  if (["pending", "reviewed", "approved", "accept", "accepted", "modify", "modified", "reject", "rejected"].includes(normalised)) {
    return getReviewStatusBadgeClass(value);
  }

  if (normalised.includes("high")) return "badge badge-red";
  if (normalised.includes("medium")) return "badge badge-orange";
  if (normalised.includes("low")) return "badge badge-green";
  if (normalised.includes("clear")) return "badge badge-green";
  if (normalised.includes("ambiguous")) return "badge badge-orange";
  if (normalised.includes("functional")) return "badge badge-blue";
  if (normalised.includes("non")) return "badge badge-purple";

  return "badge";
}

export default function RequirementsDataTable({ history = [], onRefresh, isLoading = false }) {
  const columns = [
    {
      key: "analysis_id",
      header: "ID",
      width: "8%",
      searchValue: (item) => formatReqId(item.analysis_id),
      exportValue: (item) => formatReqId(item.analysis_id),
      render: (item) => <strong>{formatReqId(item.analysis_id)}</strong>,
    },
    {
      key: "original_text",
      header: "Requirement",
      width: "28%",
      cellClassName: "requirement-cell",
      searchValue: (item) => `${item.original_text || ""} ${item.improvement_suggestion || ""}`,
      render: (item) => (
        <>
          {item.project_name && <div className="history-subtext"><strong>Project:</strong> {item.project_name}</div>}
          <div>{item.original_text}</div>
          {item.improvement_suggestion && (
            <div className="history-subtext">
              Suggestion: {item.improvement_suggestion}
            </div>
          )}
        </>
      ),
    },
    {
      key: "before_analysis",
      header: "Before Analysis",
      width: "16%",
      searchValue: (item) =>
        `${item.requirement_type || ""} ${item.priority_level || ""} ${item.ambiguity_status || ""}`,
      exportValue: (item) =>
        [item.requirement_type, item.priority_level, item.ambiguity_status].filter(Boolean).join(" | "),
      render: (item) => (
        <div className="history-stack">
          <span className={badgeClass(item.requirement_type)}>{item.requirement_type}</span>
          <span className={badgeClass(item.priority_level)}>{item.priority_level}</span>
          <span className={badgeClass(item.ambiguity_status)}>{item.ambiguity_status}</span>
        </div>
      ),
    },
    {
      key: "review_decision",
      header: "Human Review / Version Link",
      width: "20%",
      searchValue: (item) =>
        `${normalizeReviewStatus(item.review_decision)} ${item.reviewer_notes || item.review_notes || ""} ${item.rejection_reason || ""}`,
      exportValue: (item) => {
        const reviewDecision = normalizeReviewStatus(item.review_decision);
        const modifiedTarget = item.refined_analysis_result_id || item.modified_into_analysis_id
          ? formatReqId(item.refined_analysis_result_id || item.modified_into_analysis_id)
          : "";

        return [reviewDecision, modifiedTarget, item.reviewer_notes || item.review_notes, item.rejection_reason].filter(Boolean).join(" | ");
      },
      render: (item) => {
        const reviewDecision = normalizeReviewStatus(item.review_decision);
        const isModified = reviewDecision === REVIEW_STATUSES.MODIFIED;
        const modifiedTarget = item.refined_analysis_result_id || item.modified_into_analysis_id
          ? formatReqId(item.refined_analysis_result_id || item.modified_into_analysis_id)
          : null;

        return (
          <div className="history-stack">
            <span className={badgeClass(reviewDecision)}>{reviewDecision}</span>
            {isModified && modifiedTarget && (
              <div className="version-link">
                {formatReqId(item.analysis_id)} {"->"} {modifiedTarget}
              </div>
            )}
            {isModified && !modifiedTarget && (
              <div className="version-link muted">Modified version created</div>
            )}
            {(item.reviewer_notes || item.review_notes) && <div className="history-notes">{item.reviewer_notes || item.review_notes}</div>}
            {item.rejection_reason && <div className="history-notes">{item.rejection_reason}</div>}
          </div>
        );
      },
    },
    {
      key: "after_modification",
      header: "After Modification",
      width: "20%",
      searchValue: (item) =>
        `${item.final_type || item.modified_requirement_type || ""} ${item.final_priority || item.modified_priority || ""} ${item.final_acceptance_criteria || item.modified_acceptance_criteria || ""} ${item.final_test_cases || item.modified_test_case || ""}`,
      exportValue: (item) =>
        [
          item.final_type || item.modified_requirement_type,
          item.final_priority || item.modified_priority,
          item.final_acceptance_criteria || item.modified_acceptance_criteria,
          item.final_test_cases || item.modified_test_case,
        ]
          .filter(Boolean)
          .join(" | "),
      render: (item) => {
        const reviewDecision = normalizeReviewStatus(item.review_decision);
        const finalType = item.final_type || item.modified_requirement_type;
        const finalPriority = item.final_priority || item.modified_priority;
        const finalAcceptanceCriteria = item.final_acceptance_criteria || item.modified_acceptance_criteria;
        const finalTestCases = item.final_test_cases || item.modified_test_case;
        const hasFinalOutput = reviewDecision !== REVIEW_STATUSES.REJECTED && (
          finalType || finalPriority || finalAcceptanceCriteria || finalTestCases
        );

        return hasFinalOutput ? (
          <div className="history-stack">
            {finalType && (
              <span className={badgeClass(finalType)}>
                {finalType}
              </span>
            )}
            {finalPriority && (
              <span className={badgeClass(finalPriority)}>{finalPriority}</span>
            )}
            {finalAcceptanceCriteria && (
              <div className="history-subtext">
                <strong>Final AC:</strong> {finalAcceptanceCriteria}
              </div>
            )}
            {finalTestCases && (
              <div className="history-subtext">
                <strong>Final Test:</strong> {finalTestCases}
              </div>
            )}
          </div>
        ) : (
          <span className="history-subtext">
            {reviewDecision === REVIEW_STATUSES.REJECTED ? "Rejected - no final output" : "No human modification"}
          </span>
        );
      },
    },
    {
      key: "confidence_score",
      header: "Confidence",
      width: "8%",
      searchValue: (item) =>
        item.confidence_score !== null && item.confidence_score !== undefined
          ? `${Math.round(item.confidence_score * 100)}%`
          : "N/A",
      exportValue: (item) =>
        item.confidence_score !== null && item.confidence_score !== undefined
          ? `${Math.round(item.confidence_score * 100)}%`
          : "N/A",
      render: (item) =>
        item.confidence_score !== null && item.confidence_score !== undefined
          ? `${Math.round(item.confidence_score * 100)}%`
          : "N/A",
    },
  ];

  return (
    <AppDataTable
      columns={columns}
      rows={history}
      rowKey={(item) => item.analysis_id}
      loading={isLoading}
      onRefresh={onRefresh}
      searchPlaceholder="Search requirements, statuses, or notes..."
      emptyMessage="No requirement records found."
      footerLabel="records"
      tableClassName="history-table"
      containerClassName="history-table-shell"
    />
  );
}
