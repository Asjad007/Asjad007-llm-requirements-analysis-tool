import { useEffect, useState } from "react";
import AppDataTable from "./AppDataTable";
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
        x
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
                reviewer_notes: notes || "Human modified and re-analysed the requirement.",
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

function RejectReviewModal({ item, loading, onClose, onSubmit }) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    setReason("");
  }, [item]);

  if (!item) return null;

  return (
    <div className="modal-backdrop">
      <div className="detail-modal">
        <div className="modal-header">
          <div>
            <h2>Reject Requirement</h2>
            <p>Please provide a reason for rejecting this output.</p>
          </div>
          <button className="ghost-button" onClick={onClose}>Close</button>
        </div>

        <div className="detail-section">
          <h4>Requirement</h4>
          <p>{item.original_text}</p>
        </div>

        <label className="form-label">Rejection Reason</label>
        <textarea
          className="review-notes-textarea"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Explain why this analysis output is being rejected."
        />

        <div className="modal-actions">
          <button
            className="danger-button"
            disabled={loading}
            onClick={() => onSubmit(item.analysis_id, reason)}
          >
            {loading ? "Saving..." : "Confirm Reject"}
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
            <span className={badgeClass(reviewDecision)}>{reviewDecision}</span>
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

export default function RequirementsRepositoryDataTable({ history = [], onRefresh, isLoading = false }) {
  const [items, setItems] = useState(history);
  const [selectedItem, setSelectedItem] = useState(null);
  const [modifyTarget, setModifyTarget] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [loadingState, setLoadingState] = useState({ type: null, analysisId: null });
  const [toast, setToast] = useState(null);

  useEffect(() => {
    setItems(history);
  }, [history]);

  useEffect(() => {
    if (!toast) return undefined;
    const timeoutId = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  async function submitReviewDecision(requirementId, decision, options = {}) {
    setLoadingState({ type: "review", analysisId: requirementId });

    try {
      await reviewAnalysis(requirementId, {
        decision,
        reviewer_notes: options.reviewerNotes || `Decision recorded from requirements repository: ${decision}`,
        rejection_reason: options.rejectionReason || null,
      });

      setItems((previous) =>
        previous.map((item) =>
          item.analysis_id === requirementId
            ? {
                ...item,
                review_decision: decision,
                review_notes: options.reviewerNotes || `Decision recorded from requirements repository: ${decision}`,
                reviewer_notes: options.reviewerNotes || `Decision recorded from requirements repository: ${decision}`,
                rejection_reason: options.rejectionReason || null,
                final_refined_requirement: decision === REVIEW_STATUSES.ACCEPTED ? item.original_text : null,
                final_type: decision === REVIEW_STATUSES.ACCEPTED ? item.requirement_type : null,
                final_priority: decision === REVIEW_STATUSES.ACCEPTED ? item.priority_level : null,
                final_ambiguity_status: decision === REVIEW_STATUSES.ACCEPTED ? item.ambiguity_status : null,
                final_acceptance_criteria: decision === REVIEW_STATUSES.ACCEPTED ? item.acceptance_criteria : null,
                final_test_cases: decision === REVIEW_STATUSES.ACCEPTED ? item.test_case : null,
              }
            : item
        )
      );

      setSelectedItem((previous) =>
        previous?.analysis_id === requirementId
          ? {
              ...previous,
              review_decision: decision,
              review_notes: options.reviewerNotes || `Decision recorded from requirements repository: ${decision}`,
              reviewer_notes: options.reviewerNotes || `Decision recorded from requirements repository: ${decision}`,
              rejection_reason: options.rejectionReason || null,
            }
          : previous
      );

      setToast({
        type: decision === REVIEW_STATUSES.REJECTED ? "rejected" : "success",
        message: `${formatReqId(requirementId)} marked as ${decision}.`,
      });

      setSelectedItem(null);
      setRejectTarget(null);
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
        review_notes: payload.reviewer_notes || "Human modified and re-analysed the requirement.",
        reviewer_notes: payload.reviewer_notes || "Human modified and re-analysed the requirement.",
        final_refined_requirement: payload.modified_requirement_text,
        final_type: updatedResult.requirement_type,
        final_priority: updatedResult.priority_level,
        final_ambiguity_status: updatedResult.ambiguity_status,
        final_acceptance_criteria: updatedResult.acceptance_criteria,
        final_test_cases: updatedResult.test_case,
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

  const columns = [
    {
      key: "analysis_id",
      header: "ID",
      width: "7%",
      cellClassName: "repository-id-cell",
      searchValue: (item) => formatReqId(item.analysis_id),
      exportValue: (item) => formatReqId(item.analysis_id),
      render: (item) => <strong>{formatReqId(item.analysis_id)}</strong>,
    },
    {
      key: "original_text",
      header: "Requirement",
      width: "24%",
      cellClassName: "requirement-cell repository-requirement-cell",
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
      width: "13%",
      cellClassName: "repository-meta-cell",
      searchValue: (item) =>
        `${item.requirement_type || ""} ${item.priority_level || ""} ${item.ambiguity_status || ""}`,
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
      width: "18%",
      cellClassName: "repository-review-cell",
      searchValue: (item) => `${getReviewDecision(item)} ${item.review_notes || ""}`,
      render: (item) => {
        const reviewDecision = getReviewDecision(item);
        const isModified = reviewDecision === REVIEW_STATUSES.MODIFIED;
        const modifiedTarget = item.modified_into_analysis_id
          ? formatReqId(item.modified_into_analysis_id)
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
            {item.review_notes && <div className="history-notes">{item.review_notes}</div>}
            {item.rejection_reason && <div className="history-notes">{item.rejection_reason}</div>}
          </div>
        );
      },
    },
    {
      key: "after_modification",
      header: "After Modification",
      width: "23%",
      cellClassName: "repository-modification-cell",
      searchValue: (item) =>
        `${item.modified_requirement_type || ""} ${item.modified_priority || ""} ${item.modified_acceptance_criteria || ""} ${item.modified_test_case || ""}`,
      render: (item) => {
        const reviewDecision = getReviewDecision(item);
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
      width: "7%",
      cellClassName: "repository-confidence-cell",
      searchValue: (item) =>
        item.confidence_score !== null && item.confidence_score !== undefined
          ? `${Math.round(item.confidence_score * 100)}%`
          : "N/A",
      render: (item) =>
        item.confidence_score !== null && item.confidence_score !== undefined
          ? `${Math.round(item.confidence_score * 100)}%`
          : "N/A",
    },
    {
      key: "actions",
      header: "Actions",
      width: "10%",
      cellClassName: "repository-actions-cell table-actions",
      searchValue: () => "View",
      render: (item) => (
        <button className="small-button" onClick={() => setSelectedItem(item)}>
          View
        </button>
      ),
    },
  ];

  return (
    <>
      <Toast toast={toast} onClose={() => setToast(null)} />

      <AppDataTable
        columns={columns}
        rows={items}
        rowKey={(item) => item.analysis_id}
        loading={isLoading}
        onRefresh={onRefresh}
        searchPlaceholder="Search repository records, decisions, or notes..."
        emptyMessage="No requirement records found."
        footerLabel="records"
        tableClassName="history-table repository-table"
        containerClassName="repository-table-shell"
        bodyHeight="min(68vh, 760px)"
      />

      <RequirementViewModal
        item={selectedItem}
        loadingState={loadingState}
        onClose={() => setSelectedItem(null)}
        onAccept={(item) => submitReviewDecision(item.analysis_id, REVIEW_STATUSES.ACCEPTED)}
        onReject={(item) => setRejectTarget(item)}
        onModify={handleOpenModify}
      />

      <ModifyReviewModal
        item={modifyTarget}
        loading={loadingState.type === "modify"}
        onClose={() => setModifyTarget(null)}
        onSubmit={handleModifySubmit}
      />

      <RejectReviewModal
        item={rejectTarget}
        loading={loadingState.type === "review" && loadingState.analysisId === rejectTarget?.analysis_id}
        onClose={() => setRejectTarget(null)}
        onSubmit={(analysisId, rejectionReason) =>
          submitReviewDecision(analysisId, REVIEW_STATUSES.REJECTED, { rejectionReason })
        }
      />
    </>
  );
}
