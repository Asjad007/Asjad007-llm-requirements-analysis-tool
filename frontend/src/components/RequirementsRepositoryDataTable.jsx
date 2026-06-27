import { useEffect, useState } from "react";
import AppDataTable from "./AppDataTable";
import { reviewAnalysis } from "../services/api";
import RequirementAnalysisWorkspace from "./RequirementAnalysisWorkspace";
import {
  REVIEW_STATUSES,
  getReviewStatusBadgeClass,
  normalizeReviewStatus,
} from "../utils/reviewStatuses";
import {
  buildAcceptedFieldDecisions,
  buildModifiedFieldDecisions,
  buildRejectedFieldDecisions,
  FIELD_REVIEW_KEYS,
  FIELD_REVIEW_LABELS,
  FIELD_REVIEW_OPTIONS,
  inferFieldReviewDecisions,
  resolveFieldReviewDecisions,
} from "../utils/fieldReviewDecisions";

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

function FieldDecisionEditor({ decisions, onChange }) {
  return (
    <div className="workspace-section-card">
      <h4>Field-Level Validation</h4>
      <p className="history-subtext">Record whether each Requirements Engineering output was accepted, modified, or rejected by the reviewer.</p>
      <div className="workspace-grid">
        {FIELD_REVIEW_KEYS.map((key) => (
          <label key={key} className="project-filter-label">
            <span>{FIELD_REVIEW_LABELS[key]}</span>
            <select
              className="project-select"
              value={decisions[key] || REVIEW_STATUSES.ACCEPTED}
              onChange={(event) => onChange(key, event.target.value)}
            >
              {FIELD_REVIEW_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
    </div>
  );
}

function ModifyReviewModal({ item, loading, onClose, onSubmit }) {
  const [modifiedText, setModifiedText] = useState(item?.final_refined_requirement || item?.original_text || "");
  const [finalType, setFinalType] = useState(item?.final_type || item?.requirement_type || "");
  const [finalPriority, setFinalPriority] = useState(item?.final_priority || item?.priority_level || "");
  const [finalAmbiguityStatus, setFinalAmbiguityStatus] = useState(item?.final_ambiguity_status || item?.ambiguity_status || "");
  const [acceptanceCriteria, setAcceptanceCriteria] = useState(item?.final_acceptance_criteria || item?.acceptance_criteria || "");
  const [testCases, setTestCases] = useState(item?.final_test_cases || item?.test_case || "");
  const [notes, setNotes] = useState(item?.reviewer_notes || item?.review_notes || "");
  const [fieldDecisions, setFieldDecisions] = useState(
    resolveFieldReviewDecisions(inferFieldReviewDecisions(item))
  );

  useEffect(() => {
    setModifiedText(item?.final_refined_requirement || item?.original_text || "");
    setFinalType(item?.final_type || item?.requirement_type || "");
    setFinalPriority(item?.final_priority || item?.priority_level || "");
    setFinalAmbiguityStatus(item?.final_ambiguity_status || item?.ambiguity_status || "");
    setAcceptanceCriteria(item?.final_acceptance_criteria || item?.acceptance_criteria || "");
    setTestCases(item?.final_test_cases || item?.test_case || "");
    setNotes(item?.reviewer_notes || item?.review_notes || "");
    setFieldDecisions(resolveFieldReviewDecisions(inferFieldReviewDecisions(item)));
  }, [item]);

  if (!item) return null;

  return (
    <div className="modal-backdrop">
      <div className="detail-modal">
        <div className="modal-header">
          <div>
            <h2>Modify Requirement</h2>
            <p>Review and adjust the final human-validated output before saving this requirement as modified.</p>
          </div>
          <button className="ghost-button" onClick={onClose}>Close</button>
        </div>

        <div className="detail-section">
          <h4>Original Requirement</h4>
          <p>{item.original_text}</p>
        </div>

        <label className="form-label">Final Human-Reviewed Requirement</label>
        <textarea
          className="requirement-textarea"
          value={modifiedText}
          onChange={(event) => setModifiedText(event.target.value)}
        />

        <div className="workspace-grid">
          <label className="project-filter-label">
            <span>Type / Classification</span>
            <select className="project-select" value={finalType} onChange={(event) => setFinalType(event.target.value)}>
              <option value="">Select type</option>
              <option value="Functional">Functional</option>
              <option value="Non-functional">Non-functional</option>
              <option value="Mixed">Mixed</option>
              <option value="Unclear">Unclear</option>
            </select>
          </label>

          <label className="project-filter-label">
            <span>Priority</span>
            <select className="project-select" value={finalPriority} onChange={(event) => setFinalPriority(event.target.value)}>
              <option value="">Select priority</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </label>

          <label className="project-filter-label">
            <span>Ambiguity Status</span>
            <select className="project-select" value={finalAmbiguityStatus} onChange={(event) => setFinalAmbiguityStatus(event.target.value)}>
              <option value="">Select ambiguity status</option>
              <option value="Clear">Clear</option>
              <option value="Ambiguous">Ambiguous</option>
              <option value="Incomplete">Incomplete</option>
              <option value="Conflicting">Conflicting</option>
            </select>
          </label>
        </div>

        <label className="form-label">Acceptance Criteria</label>
        <textarea
          className="review-notes-textarea"
          value={acceptanceCriteria}
          onChange={(event) => setAcceptanceCriteria(event.target.value)}
          placeholder="Document the final human-reviewed acceptance criteria."
        />

        <label className="form-label">Test Cases</label>
        <textarea
          className="review-notes-textarea"
          value={testCases}
          onChange={(event) => setTestCases(event.target.value)}
          placeholder="Document the final human-reviewed test cases."
        />

        <label className="form-label">Review Notes</label>
        <textarea
          className="review-notes-textarea"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Explain what was changed and why."
        />

        <FieldDecisionEditor
          decisions={fieldDecisions}
          onChange={(key, value) => setFieldDecisions((previous) => ({ ...previous, [key]: value }))}
        />

        <div className="modal-actions">
          <button
            className="warning-button"
            disabled={loading}
            onClick={() =>
              onSubmit(item.analysis_id, {
                final_refined_requirement: modifiedText,
                final_type: finalType,
                final_priority: finalPriority,
                final_ambiguity_status: finalAmbiguityStatus,
                final_acceptance_criteria: acceptanceCriteria,
                final_test_cases: testCases,
                field_level_decisions: resolveFieldReviewDecisions(fieldDecisions),
                reviewer_notes: notes || "Human validated and modified the requirement analysis.",
              })
            }
          >
            {loading ? "Saving..." : "Save as Modified"}
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
  const [rejectedFields, setRejectedFields] = useState([]);

  useEffect(() => {
    setReason("");
    const inferred = inferFieldReviewDecisions(item);
    setRejectedFields(
      FIELD_REVIEW_KEYS.filter((key) => inferred[key] === REVIEW_STATUSES.REJECTED)
    );
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

        <div className="workspace-section-card">
          <h4>Rejected Fields</h4>
          <p className="history-subtext">Optionally select the outputs that were specifically rejected. If none are selected, the rejection will apply to all fields.</p>
          <div className="review-checkbox-grid">
            {FIELD_REVIEW_KEYS.map((key) => (
              <label key={key} className="review-checkbox-item">
                <input
                  type="checkbox"
                  checked={rejectedFields.includes(key)}
                  onChange={(event) =>
                    setRejectedFields((previous) =>
                      event.target.checked
                        ? [...previous, key]
                        : previous.filter((value) => value !== key)
                    )
                  }
                />
                <span>{FIELD_REVIEW_LABELS[key]}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="modal-actions">
          <button
            className="danger-button"
            disabled={loading}
            onClick={() => onSubmit(item.analysis_id, reason, rejectedFields)}
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

function formatDate(value) {
  if (!value) return "Not updated";
  return new Date(value).toLocaleString();
}

export default function RequirementsRepositoryDataTable({ history = [], onRefresh, isLoading = false, emptyMessage = "No requirement records found.", viewMode = "repository", onNavigate }) {
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
        field_level_decisions:
          options.fieldLevelDecisions ||
          (decision === REVIEW_STATUSES.ACCEPTED
            ? buildAcceptedFieldDecisions()
            : decision === REVIEW_STATUSES.REJECTED
              ? buildRejectedFieldDecisions(options.rejectedFields || [])
              : null),
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
                field_level_decisions:
                  decision === REVIEW_STATUSES.ACCEPTED
                    ? buildAcceptedFieldDecisions()
                    : decision === REVIEW_STATUSES.REJECTED
                      ? buildRejectedFieldDecisions(options.rejectedFields || [])
                      : item.field_level_decisions,
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
              field_level_decisions:
                decision === REVIEW_STATUSES.ACCEPTED
                  ? buildAcceptedFieldDecisions()
                  : decision === REVIEW_STATUSES.REJECTED
                    ? buildRejectedFieldDecisions(options.rejectedFields || [])
                    : previous.field_level_decisions,
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
    if (!payload.final_refined_requirement.trim()) {
      setToast({ type: "error", message: "Final refined requirement cannot be empty." });
      return;
    }

    setLoadingState({ type: "modify", analysisId });

    try {
      const originalItem = items.find((item) => item.analysis_id === analysisId);

      await reviewAnalysis(analysisId, {
        decision: REVIEW_STATUSES.MODIFIED,
        final_refined_requirement: payload.final_refined_requirement,
        final_type: payload.final_type,
        final_priority: payload.final_priority,
        final_ambiguity_status: payload.final_ambiguity_status,
        final_acceptance_criteria: payload.final_acceptance_criteria,
        final_test_cases: payload.final_test_cases,
        field_level_decisions: payload.field_level_decisions,
        reviewer_notes: payload.reviewer_notes,
      });

      const resolvedFieldDecisions = buildModifiedFieldDecisions({
        llmType: originalItem?.requirement_type,
        finalType: payload.final_type,
        llmPriority: originalItem?.priority_level,
        finalPriority: payload.final_priority,
        llmAmbiguity: originalItem?.ambiguity_status,
        finalAmbiguity: payload.final_ambiguity_status,
        llmAcceptanceCriteria: originalItem?.acceptance_criteria,
        finalAcceptanceCriteria: payload.final_acceptance_criteria,
        llmTestCases: originalItem?.test_case,
        finalTestCases: payload.final_test_cases,
        explicitDecisions: payload.field_level_decisions,
      });

      const updatedOriginal = {
        ...originalItem,
        review_decision: REVIEW_STATUSES.MODIFIED,
        review_notes: payload.reviewer_notes || "Human validated and modified the requirement analysis.",
        reviewer_notes: payload.reviewer_notes || "Human validated and modified the requirement analysis.",
        final_refined_requirement: payload.final_refined_requirement,
        final_type: payload.final_type,
        final_priority: payload.final_priority,
        final_ambiguity_status: payload.final_ambiguity_status,
        final_acceptance_criteria: payload.final_acceptance_criteria,
        final_test_cases: payload.final_test_cases,
        field_level_decisions: resolvedFieldDecisions,
        modified_requirement_type: payload.final_type,
        modified_priority: payload.final_priority,
        modified_acceptance_criteria: payload.final_acceptance_criteria,
        modified_test_case: payload.final_test_cases,
      };

      setItems((previous) =>
        previous.map((item) => (item.analysis_id === analysisId ? updatedOriginal : item))
      );

      setSelectedItem(updatedOriginal);
      setModifyTarget(null);
      setToast({
        type: "success",
        message: `${formatReqId(analysisId)} was saved as ${REVIEW_STATUSES.MODIFIED}.`,
      });

      await onRefresh?.();
    } catch (error) {
      setToast({ type: "error", message: `Modified review failed: ${error.message}` });
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
      width: "10%",
      cellClassName: "repository-id-cell",
      searchValue: (item) => formatReqId(item.analysis_id),
      exportValue: (item) => formatReqId(item.analysis_id),
      render: (item) => <strong>{formatReqId(item.analysis_id)}</strong>,
    },
    {
      key: "original_text",
      header: "Requirement",
      width: "34%",
      cellClassName: "requirement-cell repository-requirement-cell",
      searchValue: (item) => `${item.original_text || ""} ${item.improvement_suggestion || ""}`,
      render: (item) => (
        <>
          <div>{item.original_text}</div>
        </>
      ),
    },
    {
      key: "project_name",
      header: "Project",
      width: "14%",
      cellClassName: "repository-meta-cell",
      searchValue: (item) => item.project_name || "",
      render: (item) => item.project_name || "Unassigned",
    },
    {
      key: "analysis_status",
      header: "LLM Analysis",
      width: "12%",
      cellClassName: "repository-review-cell",
      searchValue: (item) => `${item.requirement_type || ""} ${item.priority_level || ""} ${item.ambiguity_status || ""}`,
      render: (item) => <span className="badge badge-blue">{item.requirement_type ? "Analysed" : "Pending"}</span>,
    },
    {
      key: "review_decision",
      header: "Human Decision",
      width: "12%",
      cellClassName: "repository-modification-cell",
      searchValue: (item) => `${getReviewDecision(item)} ${item.review_notes || ""} ${item.reviewer_notes || ""}`,
      render: (item) => <span className={badgeClass(getReviewDecision(item))}>{getReviewDecision(item)}</span>,
    },
    {
      key: "confidence_score",
      header: "Confidence",
      width: "8%",
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
      key: "last_updated",
      header: "Last Updated",
      width: "12%",
      cellClassName: "repository-meta-cell",
      searchValue: (item) => `${item.review_updated_at || ""} ${item.reviewed_at || ""} ${item.created_at || ""}`,
      render: (item) => formatDate(item.review_updated_at || item.reviewed_at || item.created_at),
    },
    {
      key: "actions",
      header: "Actions",
      width: "18%",
      cellClassName: "repository-actions-cell table-actions",
      searchValue: () => "View Review History",
      render: (item) => {
        const isPending = canReviewRequirement(item);
        return (
          <div className="table-actions">
            <button className="small-button" onClick={() => setSelectedItem(item)}>
              View
            </button>
            <button
              className="small-warning-button"
              disabled={!isPending}
              title={isPending ? "Open reviewer decision options" : "Already reviewed"}
              onClick={() => setSelectedItem(item)}
            >
              Review
            </button>
            <button
              className="small-button"
              onClick={() => onNavigate?.("history")}
            >
              History
            </button>
          </div>
        );
      },
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
        emptyMessage={emptyMessage}
        footerLabel="records"
        tableClassName="history-table repository-table"
        containerClassName="repository-table-shell"
        bodyHeight="min(68vh, 760px)"
      />

      <RequirementAnalysisWorkspace
        item={selectedItem}
        actionLoading={loadingState}
        onClose={() => setSelectedItem(null)}
        onAccept={(item) => submitReviewDecision(item.analysis_id, REVIEW_STATUSES.ACCEPTED)}
        onOpenReject={(item) => setRejectTarget(item)}
        onOpenModify={handleOpenModify}
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
        onSubmit={(analysisId, rejectionReason, rejectedFields) =>
          submitReviewDecision(analysisId, REVIEW_STATUSES.REJECTED, { rejectionReason, rejectedFields })
        }
      />
    </>
  );
}
