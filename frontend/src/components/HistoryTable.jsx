import {
  REVIEW_STATUSES,
  getReviewStatusBadgeClass,
  normalizeReviewStatus,
} from "../utils/reviewStatuses";

function formatReqId(id) {
  return `REQ-${String(id).padStart(3, "0")}`;
}

function badgeClass(value) {
  if (!value) return "badge";

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

function HistoryTable({ items, onDelete }) {
  if (!items.length) {
    return <p className="empty">No history records yet.</p>;
  }

  return (
    <div className="table-wrapper">
      <table className="data-table history-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Requirement</th>
            <th>Before Analysis</th>
            <th>Human Review / Version Link</th>
            <th>After Modification</th>
            <th>Confidence</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          {items.map((item) => {
            const reviewDecision = normalizeReviewStatus(item.review_decision);
            const isModified = reviewDecision === REVIEW_STATUSES.MODIFIED;
            const modifiedTarget = item.modified_into_analysis_id
              ? formatReqId(item.modified_into_analysis_id)
              : null;

            return (
              <tr key={item.analysis_id}>
                <td>
                  <strong>{formatReqId(item.analysis_id)}</strong>
                </td>

                <td className="requirement-cell">
                  <div>{item.original_text}</div>

                  {item.improvement_suggestion && (
                    <div className="history-subtext">
                      Suggestion: {item.improvement_suggestion}
                    </div>
                  )}
                </td>

                <td>
                  <div className="history-stack">
                    <span className={badgeClass(item.requirement_type)}>
                      {item.requirement_type}
                    </span>
                    <span className={badgeClass(item.priority_level)}>
                      {item.priority_level}
                    </span>
                    <span className={badgeClass(item.ambiguity_status)}>
                      {item.ambiguity_status}
                    </span>
                  </div>
                </td>

                <td>
                  <div className="history-stack">
                    <span className={badgeClass(reviewDecision)}>
                      {reviewDecision}
                    </span>

                    {isModified && modifiedTarget && (
                      <div className="version-link">
                        {formatReqId(item.analysis_id)} → {modifiedTarget}
                      </div>
                    )}

                    {isModified && !modifiedTarget && (
                      <div className="version-link muted">
                        Modified version created
                      </div>
                    )}

                    {item.review_notes && (
                      <div className="history-notes">
                        {item.review_notes}
                      </div>
                    )}
                  </div>
                </td>

                <td>
                  {isModified ? (
                    <div className="history-stack">
                      {item.modified_requirement_type && (
                        <span className={badgeClass(item.modified_requirement_type)}>
                          {item.modified_requirement_type}
                        </span>
                      )}

                      {item.modified_priority && (
                        <span className={badgeClass(item.modified_priority)}>
                          {item.modified_priority}
                        </span>
                      )}

                      {item.modified_acceptance_criteria && (
                        <div className="history-subtext">
                          Updated AC: {item.modified_acceptance_criteria}
                        </div>
                      )}

                      {item.modified_test_case && (
                        <div className="history-subtext">
                          Updated Test: {item.modified_test_case}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="history-subtext">No human modification</span>
                  )}
                </td>

                <td>
                  {item.confidence_score !== null && item.confidence_score !== undefined
                    ? `${Math.round(item.confidence_score * 100)}%`
                    : "N/A"}
                </td>

                <td>
                  <button
                    className="small-danger-button"
                    onClick={() => onDelete(item.analysis_id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default HistoryTable;
