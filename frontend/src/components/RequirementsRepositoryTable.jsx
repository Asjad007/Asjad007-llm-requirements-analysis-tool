import { useEffect, useState } from "react";
import { modifyAndReanalyse, reviewAnalysis } from "../services/api";
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

function isPendingReview(requirement) {
  return normalizeReviewStatus(requirement?.review_decision) === REVIEW_STATUSES.PENDING;
}

function canReviewRequirement(requirement) {
  return Boolean(requirement) && isPendingReview(requirement);
}

function getReviewDecision(requirement) {
  return normalizeReviewStatus(requirement?.review_decision);
}

function Toast({ toast, onClose }) {
  if (!toast) return null;

  return (
    <div className={`toast-message ${toast.type}`} role="status" aria-live="polite">
      <span>{toast.message}</span>
      <button className="toast-close" onClick={onClose} aria-label="Close notification">
        ×
      </button>
    </div>
  );
}

function ModifyReviewModal({ item, loading, onClose, onSubmit }) {
  const [modifiedText, setModifiedText] = useState(item?.original_text || "");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    setModifiedText(item?.original_text || "");
    setNotes("");
  }, [item]);

  if (!item) return null;

  return (
    <div className="modal-backdrop">
      <div className="detail-modal">
        <div className="modal-header">
          <div>
            <h2>Modify Requirement</h2>
            <p>Update the requirement text and save a human-modified re-analysis.</p>
          </div>
          <button className="ghost-button" onClick={onClose}>Close</button>
        </div>

        <div className="detail-section">
          <h4>Original Requirement</h4>
          <p>{item.original_text}</p>
        </div>

        <label className="form-label">Modified Requirement Text</label>
        <textarea
          className="requirement-textarea"
          value={modifiedText}
          onChange={(event) => setModifiedText(event.target.value)}
        />

        <label className="form-label">Review Notes</label>
        <textarea
          className="review-notes-textarea"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Explain what was changed and why."
        />

        <div className="modal-actions">
          <button
            className="warning-button"
            disabled={loading}
            onClick={() =>
              onSubmit(item.analysis_id, {
                modified_requirement_text: modifiedText,
                review_notes: notes || "Human modified and re-analysed the requirement.",
              })
            }
          >
            {loading ? "Re-analysing..." : "Save & Reanalyse"}
          </button>
          <button className="secondary-button" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function RequirementViewModal({ item, loadingState, onClose, onAccept, onReject, onModify }) {
  if (!item) return null;

  const reviewDecision = getReviewDecision(item);
  const isPending = canReviewRequirement(item);
  const isSavingReview = loadingState.type === "review" && loadingState.analysisId === item.analysis_id;
  const isOpeningModify = loadingState.type === "open-modify" && loadingState.analysisId === item.analysis_id;
  const disableActions = isSavingReview || isOpeningModify;

  return (
    <div className="modal-backdrop">
      <div className="detail-modal">
        <div className="modal-header">
          <div>
            <h2>Requirement Details</h2>
            <p>Review the saved analysis details for this requirement.</p>
          </div>
          <button className="ghost-button" onClick={onClose}>Close</button>
        </div>

        <div className="detail-section">
          <h4>Requirement</h4>
          <p>{item.original_text}</p>
        </div>

        <div className="detail-grid">
          <div>
            <span className="detail-label">Type</span>
            <span className={badgeClass(item.requirement_type)}>{item.requirement_type}</span>
          </div>
          <div>
            <span className="detail-label">Priority</span>
            <span className={badgeClass(item.priority_level)}>{item.priority_level}</span>
          </div>
          <div>
            <span className="detail-label">Ambiguity</span>
            <span className={badgeClass(item.ambiguity_status)}>{item.ambiguity_status}</span>
          </div>
          <div>
            <span className="detail-label">Confidence</span>
            <strong>
              {item.confidence_score !== null && item.confidence_score !== undefined
                ? `${Math.round(item.confidence_score * 100)}%`
                : "N/A"}
            </strong>
          </div>
        </div>

        <div className="detail-section">
          <h4>Ambiguity Explanation</h4>
          <p>{item.ambiguity_explanation || "No explanation provided."}</p>
        </div>

        <div className="detail-section">
          <h4>Priority Reason</h4>
          <p>{item.priority_reason || "No priority reason provided."}</p>
        </div>

        <div className="detail-section">
          <h4>Acceptance Criteria</h4>
          <p>{item.acceptance_criteria || "No acceptance criteria generated."}</p>
        </div>

        <div className="detail-section">
          <h4>Test Case</h4>
          <p>{item.test_case || "No test case generated."}</p>
        </div>

        <div className="detail-section">
          <h4>Improvement Suggestion</h4>
          <p>{item.improvement_suggestion || "No improvement suggestion generated."}</p>
        </div>

        <div className="detail-section">
          <h4>Review Status</h4>
          <p>
            <span className={badgeClass(reviewDecision)}>
              {reviewDecision}
            </span>
          </p>
        </div>

        <div className="detail-section small-muted">
          <p><strong>Analysis method:</strong> {item.analysis_method || "Not recorded."}</p>
          <p><strong>Literature basis:</strong> {item.literature_basis || "Not recorded."}</p>
        </div>

        {isPending ? (
          <div className="modal-actions">
            <button className="success-button" disabled={disableActions} onClick={() => onAccept(item)}>
              {isSavingReview ? "Saving..." : "Accept"}
            </button>
            <button className="warning-button" disabled={disableActions} onClick={() => onModify(item)}>
              {isOpeningModify ? "Opening..." : "Modify"}
            </button>
            <button className="danger-button" disabled={disableActions} onClick={() => onReject(item)}>
              {isSavingReview ? "Saving..." : "Reject"}
            </button>
          </div>
        ) : (
          <div className="detail-section">
            <h4>Recorded Decision</h4>
            <p>This requirement has already been marked as {reviewDecision}.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function RequirementsRepositoryTable({ history = [], onRefresh }) {
  const [items, setItems] = useState(history);
  const [selectedItem, setSelectedItem] = useState(null);
  const [modifyTarget, setModifyTarget] = useState(null);
  const [loadingState, setLoadingState] = useState({ type: null, analysisId: null });
  const [toast, setToast] = useState(null);

  useEffect(() => {
    setItems(history);
  }, [history]);

  useEffect(() => {
    if (!toast) return undefined;

    const timeoutId = window.setTimeout(() => {
      setToast(null);
    }, 3500);

    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  if (!items.length) {
    return <p className="empty">No requirement records found.</p>;
  }

  async function submitReviewDecision(requirementId, decision, reviewNotes = null) {
    setLoadingState({ type: "review", analysisId: requirementId });

    try {
      await reviewAnalysis(requirementId, {
        decision,
        modified_requirement_type: null,
        modified_priority: null,
        modified_acceptance_criteria: null,
        modified_test_case: null,
        review_notes: reviewNotes || `Decision recorded from requirements repository: ${decision}`,
      });

      setItems((previous) =>
        previous.map((item) =>
          item.analysis_id === requirementId
            ? {
                ...item,
                review_decision: decision,
                review_notes: reviewNotes || `Decision recorded from requirements repository: ${decision}`,
              }
            : item
        )
      );

      setSelectedItem((previous) =>
        previous?.analysis_id === requirementId
          ? {
              ...previous,
              review_decision: decision,
              review_notes: reviewNotes || `Decision recorded from requirements repository: ${decision}`,
            }
          : previous
      );

      setToast({
        type: decision === REVIEW_STATUSES.REJECTED ? "rejected" : "success",
        message: `${formatReqId(requirementId)} marked as ${decision}.`,
      });

      setSelectedItem(null);
      await onRefresh?.();
    } catch (error) {
      setToast({ type: "error", message: `Review failed: ${error.message}` });
    } finally {
      setLoadingState({ type: null, analysisId: null });
    }
  }

  async function handleModifySubmit(analysisId, payload) {
    if (!payload.modified_requirement_text.trim()) {
      setToast({ type: "error", message: "Modified requirement text cannot be empty." });
      return;
    }

    setLoadingState({ type: "modify", analysisId });

    try {
      const updatedResult = await modifyAndReanalyse(analysisId, payload);
      const originalItem = items.find((item) => item.analysis_id === analysisId);

      const updatedOriginal = {
        ...originalItem,
        review_decision: REVIEW_STATUSES.MODIFIED,
        review_notes: payload.review_notes || "Human modified and re-analysed the requirement.",
        modified_requirement_type: updatedResult.requirement_type,
        modified_priority: updatedResult.priority_level,
        modified_acceptance_criteria: updatedResult.acceptance_criteria,
        modified_test_case: updatedResult.test_case,
        modified_into_analysis_id: updatedResult.analysis_id,
      };

      setItems((previous) =>
        previous.map((item) => (item.analysis_id === analysisId ? updatedOriginal : item))
      );

      setSelectedItem(updatedOriginal);
      setModifyTarget(null);
      setToast({
        type: "success",
        message: `${formatReqId(analysisId)} was modified and re-analysed as ${formatReqId(updatedResult.analysis_id)}.`,
      });

      await onRefresh?.();
    } catch (error) {
      setToast({ type: "error", message: `Modify and reanalyse failed: ${error.message}` });
    } finally {
      setLoadingState({ type: null, analysisId: null });
    }
  }

  function handleOpenModify(item) {
    setLoadingState({ type: "open-modify", analysisId: item.analysis_id });
    setModifyTarget(item);
    setLoadingState({ type: null, analysisId: null });
  }

  return (
    <>
      <Toast toast={toast} onClose={() => setToast(null)} />

      <div className="table-wrapper repository-table-wrapper">
        <table className="data-table history-table repository-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Requirement</th>
              <th>Before Analysis</th>
              <th>Human Review / Version Link</th>
              <th>After Modification</th>
              <th>Confidence</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {items.map((item) => {
              const reviewDecision = getReviewDecision(item);
              const isModified = reviewDecision === REVIEW_STATUSES.MODIFIED;
              const modifiedTarget = item.modified_into_analysis_id
                ? formatReqId(item.modified_into_analysis_id)
                : null;

              return (
                <tr key={item.analysis_id}>
                  <td className="repository-id-cell">
                    <strong>{formatReqId(item.analysis_id)}</strong>
                  </td>

                  <td className="requirement-cell repository-requirement-cell">
                    <div>{item.original_text}</div>

                    {item.improvement_suggestion && (
                      <div className="history-subtext">
                        Suggestion: {item.improvement_suggestion}
                      </div>
                    )}
                  </td>

                  <td className="repository-meta-cell">
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

                  <td className="repository-review-cell">
                    <div className="history-stack">
                      <span className={badgeClass(reviewDecision)}>
                        {reviewDecision}
                      </span>

                      {isModified && modifiedTarget && (
                        <div className="version-link">
                          {formatReqId(item.analysis_id)} {"->"} {modifiedTarget}
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

                  <td className="repository-modification-cell">
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

                  <td className="repository-confidence-cell">
                    {item.confidence_score !== null && item.confidence_score !== undefined
                      ? `${Math.round(item.confidence_score * 100)}%`
                      : "N/A"}
                  </td>

                  <td className="repository-actions-cell">
                    <button className="small-button" onClick={() => setSelectedItem(item)}>
                      View
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <RequirementViewModal
        item={selectedItem}
        loadingState={loadingState}
        onClose={() => setSelectedItem(null)}
        onAccept={(item) => submitReviewDecision(item.analysis_id, REVIEW_STATUSES.ACCEPTED)}
        onReject={(item) => submitReviewDecision(item.analysis_id, REVIEW_STATUSES.REJECTED)}
        onModify={handleOpenModify}
      />

      <ModifyReviewModal
        item={modifyTarget}
        loading={loadingState.type === "modify"}
        onClose={() => setModifyTarget(null)}
        onSubmit={handleModifySubmit}
      />
    </>
  );
}
