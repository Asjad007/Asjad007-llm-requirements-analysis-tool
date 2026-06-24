function formatReqId(id) {
  return `REQ-${String(id).padStart(3, "0")}`;
}

function badgeClass(value) {
  if (!value) return "badge badge-orange";

  const normalised = value.toLowerCase();

  if (normalised.includes("modified")) return "badge badge-orange";
  if (normalised.includes("reviewed")) return "badge badge-green";
  if (normalised.includes("rejected")) return "badge badge-red";
  if (normalised.includes("pending")) return "badge badge-orange";

  if (normalised.includes("high")) return "badge badge-red";
  if (normalised.includes("medium")) return "badge badge-orange";
  if (normalised.includes("low")) return "badge badge-green";

  if (normalised.includes("clear")) return "badge badge-green";
  if (normalised.includes("ambiguous")) return "badge badge-orange";

  if (normalised.includes("functional")) return "badge badge-blue";
  if (normalised.includes("non")) return "badge badge-purple";

  return "badge";
}

export default function RequirementsTable({ history = [], onRefresh }) {
  if (!history.length) {
    return <p className="empty">No requirement records found.</p>;
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
          </tr>
        </thead>

        <tbody>
          {history.map((item) => {
            const isModified = item.review_decision === "Modified";
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
                    <span className={badgeClass(item.review_decision || "Pending")}>
                      {item.review_decision || "Pending"}
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
                          <strong>Updated AC:</strong> {item.modified_acceptance_criteria}
                        </div>
                      )}

                      {item.modified_test_case && (
                        <div className="history-subtext">
                          <strong>Updated Test:</strong> {item.modified_test_case}
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
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}