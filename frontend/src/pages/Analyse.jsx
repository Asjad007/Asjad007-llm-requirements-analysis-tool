import { useEffect, useState } from "react";
import { analyseBatchRequirements, reviewAnalysis, modifyAndReanalyse } from "../services/api";
import AppDataTable from "../components/AppDataTable";
import GlobalLoader from "../components/GlobalLoader";
import {
  REVIEW_STATUSES,
  getReviewStatusBadgeClass,
  normalizeReviewStatus,
} from "../utils/reviewStatuses";

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

function LoadingLabel({ loading, idleText, loadingText }) {
  return (
    <>
      {loading && <span className="button-spinner" aria-hidden="true" />}
      <span>{loading ? loadingText : idleText}</span>
    </>
  );
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

function RequirementDetailModal({ item, onClose, onReview, onOpenModify, actionLoading }) {
  if (!item) return null;

  const isReviewing = actionLoading.type === "review" && actionLoading.analysisId === item.analysis_id;
  const isPreparingModify = actionLoading.type === "open-modify" && actionLoading.analysisId === item.analysis_id;
  const hasPendingAction = isReviewing || isPreparingModify;

  return (
    <div className="modal-backdrop">
      <div className="detail-modal">
        <div className="modal-header">
          <div>
            <h2>Requirement Details</h2>
            <p>Review the full LLM-generated analysis before making a decision.</p>
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
            <strong>{Math.round((item.confidence_score || 0) * 100)}%</strong>
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

        <div className="detail-section small-muted">
          <p><strong>Analysis method:</strong> {item.analysis_method}</p>
          <p><strong>Literature basis:</strong> {item.literature_basis}</p>
        </div>

        <div className="modal-actions">
          <button
            className="success-button"
            disabled={hasPendingAction}
            onClick={() => onReview(item.analysis_id, REVIEW_STATUSES.ACCEPTED)}
          >
            <LoadingLabel loading={isReviewing} idleText="Accept" loadingText="Saving..." />
          </button>
          <button
            className="warning-button"
            disabled={hasPendingAction}
            onClick={() => onOpenModify(item)}
          >
            <LoadingLabel loading={isPreparingModify} idleText="Modify & Reanalyse" loadingText="Opening..." />
          </button>
          <button
            className="danger-button"
            disabled={hasPendingAction}
            onClick={() => onReview(item.analysis_id, REVIEW_STATUSES.REJECTED)}
          >
            <LoadingLabel loading={isReviewing} idleText="Reject" loadingText="Saving..." />
          </button>
        </div>
      </div>
    </div>
  );
}

function ModifyModal({ item, onClose, onSubmit, loading }) {
  const [modifiedText, setModifiedText] = useState(item?.original_text || "");
  const [notes, setNotes] = useState("");

  if (!item) return null;

  return (
    <div className="modal-backdrop">
      <div className="detail-modal">
        <div className="modal-header">
          <div>
            <h2>Modify Requirement</h2>
            <p>
              Enter the human-corrected requirement. The system will re-run the LLM and save the updated analysis.
            </p>
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
          placeholder="Example: Clarified user role, platform, and validation condition."
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

function RejectModal({ item, loading, onClose, onSubmit }) {
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
          placeholder="Explain why this LLM output is being rejected."
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

export default function Analyse({ projects = [], selectedProjectId = "", onProjectChange = () => {} }) {
  const [requirementText, setRequirementText] = useState("");
  const [results, setResults] = useState([]);
  const [selectedResult, setSelectedResult] = useState(null);
  const [modifyTarget, setModifyTarget] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modifyLoading, setModifyLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState({ type: null, analysisId: null });
  const [statusMessage, setStatusMessage] = useState("");
  const [toast, setToast] = useState(null);
  const pageLoading =
    loading ||
    modifyLoading ||
    (actionLoading.type === "review" && actionLoading.analysisId !== null);

  let pageLoadingTitle = "";
  let pageLoadingMessage = "";

  if (loading) {
    pageLoadingTitle = "Analysing requirements";
    pageLoadingMessage = "Please wait while the system splits and evaluates each requirement.";
  } else if (modifyLoading) {
    pageLoadingTitle = "Re-analysing requirement";
    pageLoadingMessage = "We are saving your update and generating a fresh analysis result.";
  } else if (actionLoading.type === "review" && actionLoading.analysisId !== null) {
    pageLoadingTitle = "Saving review";
    pageLoadingMessage = `Updating REQ-${String(actionLoading.analysisId).padStart(3, "0")} with your decision.`;
  }

  useEffect(() => {
    if (!toast) return undefined;

    const timeoutId = window.setTimeout(() => {
      setToast(null);
    }, 3500);

    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  async function handleAnalyse() {
    if (!requirementText.trim()) {
      setStatusMessage("Please enter at least one requirement.");
      return;
    }

    if (!selectedProjectId) {
      setStatusMessage("Please select a project before analysing requirements.");
      return;
    }

    setLoading(true);
    setStatusMessage("");

    try {
      const response = await analyseBatchRequirements({
        requirement_text: requirementText,
        source_type: "manual",
        project_id: Number(selectedProjectId),
      });

      setResults(response);
      setStatusMessage(`${response.length} requirement(s) analysed successfully.`);
    } catch (error) {
      setStatusMessage(`Analysis failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleReview(analysisId, decision, options = {}) {
    setActionLoading({ type: "review", analysisId });

    try {
      await reviewAnalysis(analysisId, {
        decision,
        reviewer_notes: options.reviewerNotes || `Decision recorded from batch analysis grid: ${decision}`,
        rejection_reason: options.rejectionReason || null,
      });

      setResults((previous) =>
        previous.map((item) =>
          item.analysis_id === analysisId
            ? {
                ...item,
                review_decision: decision,
                review_notes: options.reviewerNotes || `Decision recorded from batch analysis grid: ${decision}`,
                reviewer_notes: options.reviewerNotes || `Decision recorded from batch analysis grid: ${decision}`,
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

      if (selectedResult?.analysis_id === analysisId) {
        setSelectedResult((previous) => ({
          ...previous,
          review_decision: decision,
          review_notes: options.reviewerNotes || `Decision recorded from batch analysis grid: ${decision}`,
          reviewer_notes: options.reviewerNotes || `Decision recorded from batch analysis grid: ${decision}`,
          rejection_reason: options.rejectionReason || null,
        }));
      }

      const successMessage = `Requirement REQ-${String(analysisId).padStart(3, "0")} marked as ${decision}.`;
      setStatusMessage(successMessage);
      setToast({
        type: decision === REVIEW_STATUSES.REJECTED ? "rejected" : "success",
        message: successMessage,
      });
      setSelectedResult(null);
      setRejectTarget(null);
    } catch (error) {
      const errorMessage = `Review failed: ${error.message}`;
      setStatusMessage(errorMessage);
      setToast({ type: "error", message: errorMessage });
    } finally {
      setActionLoading({ type: null, analysisId: null });
    }
  }

  async function handleModifyAndReanalyse(analysisId, payload) {
    if (!payload.modified_requirement_text.trim()) {
      setStatusMessage("Modified requirement text cannot be empty.");
      return;
    }

    setModifyLoading(true);

    try {
      const updatedResult = await modifyAndReanalyse(analysisId, payload);

      setResults((previous) =>
        previous.map((item) =>
          item.analysis_id === analysisId
            ? {
                ...item,
                review_decision: REVIEW_STATUSES.MODIFIED,
                modified_result: updatedResult,
                review_notes: payload.reviewer_notes || "Human modified and re-analysed the requirement.",
                reviewer_notes: payload.reviewer_notes || "Human modified and re-analysed the requirement.",
                final_refined_requirement: payload.modified_requirement_text,
                final_type: updatedResult.requirement_type,
                final_priority: updatedResult.priority_level,
                final_ambiguity_status: updatedResult.ambiguity_status,
                final_acceptance_criteria: updatedResult.acceptance_criteria,
                final_test_cases: updatedResult.test_case,
                modified_into_analysis_id: updatedResult.analysis_id,
              }
            : item
        )
      );

      setResults((previous) => [updatedResult, ...previous]);

      setModifyTarget(null);
      setSelectedResult(null);
      const successMessage = `Requirement REQ-${String(analysisId).padStart(3, "0")} was modified and re-analysed as REQ-${String(updatedResult.analysis_id).padStart(3, "0")}.`;
      setStatusMessage(successMessage);
      setToast({ type: "success", message: successMessage });
    } catch (error) {
      const errorMessage = `Modify and reanalyse failed: ${error.message}`;
      setStatusMessage(errorMessage);
      setToast({ type: "error", message: errorMessage });
    } finally {
      setModifyLoading(false);
    }
  }

  function handleOpenModify(item) {
    setActionLoading({ type: "open-modify", analysisId: item.analysis_id });
    setModifyTarget(item);
    setActionLoading({ type: null, analysisId: null });
  }

  const resultColumns = [
    {
      key: "analysis_id",
      header: "ID",
      width: "8%",
      searchValue: (item) => `REQ-${String(item.analysis_id).padStart(3, "0")}`,
      exportValue: (item) => `REQ-${String(item.analysis_id).padStart(3, "0")}`,
      render: (item) => `REQ-${String(item.analysis_id).padStart(3, "0")}`,
    },
    {
      key: "original_text",
      header: "Requirement",
      width: "28%",
      cellClassName: "requirement-cell",
      searchValue: (item) => `${item.original_text || ""} ${normalizeReviewStatus(item.review_decision)}`,
      render: (item) => (
        <>
          <div>{item.original_text}</div>
          {normalizeReviewStatus(item.review_decision) === REVIEW_STATUSES.MODIFIED && (
            <div className="small-muted-text">
              Human-modified version generated separately.
            </div>
          )}
        </>
      ),
    },
    {
      key: "requirement_type",
      header: "Type",
      width: "10%",
      searchValue: (item) => item.requirement_type || "",
      render: (item) => <span className={badgeClass(item.requirement_type)}>{item.requirement_type}</span>,
    },
    {
      key: "priority_level",
      header: "Priority",
      width: "10%",
      searchValue: (item) => item.priority_level || "",
      render: (item) => <span className={badgeClass(item.priority_level)}>{item.priority_level}</span>,
    },
    {
      key: "ambiguity_status",
      header: "Ambiguity",
      width: "12%",
      searchValue: (item) => item.ambiguity_status || "",
      render: (item) => <span className={badgeClass(item.ambiguity_status)}>{item.ambiguity_status}</span>,
    },
    {
      key: "confidence_score",
      header: "Confidence",
      width: "8%",
      searchValue: (item) => `${Math.round((item.confidence_score || 0) * 100)}%`,
      render: (item) => `${Math.round((item.confidence_score || 0) * 100)}%`,
    },
    {
      key: "review_decision",
      header: "Status",
      width: "10%",
      searchValue: (item) => normalizeReviewStatus(item.review_decision),
      render: (item) => (
        <span className={badgeClass(item.review_decision || REVIEW_STATUSES.PENDING)}>
          {normalizeReviewStatus(item.review_decision)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      width: "18%",
      cellClassName: "table-actions",
      searchValue: () => "View Accept Modify Reject",
      render: (item) => (
        <div className="table-actions">
          <button className="small-button" onClick={() => setSelectedResult(item)}>
            View
          </button>
          <button
            className="small-success-button"
            disabled={actionLoading.analysisId === item.analysis_id || modifyLoading}
            onClick={() => handleReview(item.analysis_id, REVIEW_STATUSES.ACCEPTED)}
          >
            <LoadingLabel
              loading={actionLoading.type === "review" && actionLoading.analysisId === item.analysis_id}
              idleText="Accept"
              loadingText="Saving..."
            />
          </button>
          <button
            className="small-warning-button"
            disabled={actionLoading.analysisId === item.analysis_id || modifyLoading}
            onClick={() => handleOpenModify(item)}
          >
            <LoadingLabel
              loading={actionLoading.type === "open-modify" && actionLoading.analysisId === item.analysis_id}
              idleText="Modify"
              loadingText="Opening..."
            />
          </button>
          <button
            className="small-danger-button"
            disabled={actionLoading.analysisId === item.analysis_id || modifyLoading}
            onClick={() => setRejectTarget(item)}
          >
            <LoadingLabel
              loading={actionLoading.type === "review" && actionLoading.analysisId === item.analysis_id}
              idleText="Reject"
              loadingText="Saving..."
            />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="page">
      <Toast toast={toast} onClose={() => setToast(null)} />

      <GlobalLoader
        visible={pageLoading}
        title={pageLoadingTitle}
        message={pageLoadingMessage}
      />

      <div className="page-card data-page-card">
        <div className="page-card-header">
          <div>
            <h1>Upload Requirements</h1>
            <p>
              Paste one or multiple software requirements. The system will split, analyse,
              and present structured RE outputs for human validation.
            </p>
          </div>
          <span className="badge badge-blue">Batch Input</span>
        </div>

        <label className="form-label">Project</label>
        <div className="project-selector-row">
          <select
            className="project-select"
            value={selectedProjectId}
            onChange={(event) => onProjectChange(event.target.value)}
          >
            <option value="">Select a project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          {!projects.length && (
            <span className="small-muted-text">Create a project first to analyse requirements in context.</span>
          )}
        </div>

        <textarea
          className="requirement-textarea"
          value={requirementText}
          onChange={(event) => setRequirementText(event.target.value)}
          placeholder={"Example:\n1. The system shall allow users to login.\n2. The system shall allow users to upload PDF documents.\n3. The system should send WhatsApp messages using Twilio."}
        />

        <div className="form-actions">
          <button className="primary-button" onClick={handleAnalyse} disabled={loading || !projects.length}>
            <LoadingLabel loading={loading} idleText="Analyse Requirements" loadingText="Analysing..." />
          </button>
          <button
            className="secondary-button"
            disabled={loading || modifyLoading}
            onClick={() => {
              setRequirementText("");
              setResults([]);
              setStatusMessage("");
            }}
          >
            Clear
          </button>
        </div>

        {statusMessage && <p className="status-message">{statusMessage}</p>}
      </div>

      {results.length > 0 && (
        <div className="page-card data-page-card">
          <div className="page-card-header">
            <div>
              <h2>Batch Analysis Results</h2>
              <p>
                Each detected requirement is analysed separately. Use View Details for reasoning,
                acceptance criteria, and test cases.
              </p>
            </div>
            <span className="badge badge-green">{results.length} Results</span>
          </div>

          <AppDataTable
            columns={resultColumns}
            rows={results}
            rowKey={(item) => item.analysis_id}
            onRefresh={handleAnalyse}
            searchPlaceholder="Search analysed requirements..."
            emptyMessage="No analysis results found."
            footerLabel="results"
            tableClassName="analysis-results-table"
            containerClassName="analysis-results-table-shell"
            bodyHeight="min(62vh, 720px)"
          />
        </div>
      )}

      <RequirementDetailModal
        item={selectedResult}
        onClose={() => setSelectedResult(null)}
        onReview={(analysisId, decision) => {
          if (decision === REVIEW_STATUSES.REJECTED) {
            const target = results.find((item) => item.analysis_id === analysisId) || selectedResult;
            setRejectTarget(target);
            return;
          }

          handleReview(analysisId, decision);
        }}
        onOpenModify={handleOpenModify}
        actionLoading={actionLoading}
      />

      <ModifyModal
        item={modifyTarget}
        onClose={() => setModifyTarget(null)}
        onSubmit={handleModifyAndReanalyse}
        loading={modifyLoading}
      />

      <RejectModal
        item={rejectTarget}
        loading={actionLoading.type === "review" && actionLoading.analysisId === rejectTarget?.analysis_id}
        onClose={() => setRejectTarget(null)}
        onSubmit={(analysisId, rejectionReason) =>
          handleReview(analysisId, REVIEW_STATUSES.REJECTED, { rejectionReason })
        }
      />
    </div>
  );
}
