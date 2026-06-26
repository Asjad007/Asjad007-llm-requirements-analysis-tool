import { useEffect, useRef, useState } from "react";
import { analyseBatchRequirements, extractRequirementsDocument, reviewAnalysis, modifyAndReanalyse } from "../services/api";
import AppDataTable from "../components/AppDataTable";
import GlobalLoader from "../components/GlobalLoader";
import {
  REVIEW_STATUSES,
  getReviewStatusBadgeClass,
  normalizeReviewStatus,
} from "../utils/reviewStatuses";
import {
  buildAcceptedFieldDecisions,
  buildModifiedFieldDecisions,
  buildRejectedFieldDecisions,
} from "../utils/fieldReviewDecisions";

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

function formatFileSize(bytes) {
  if (!bytes) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function createRequirementRows(requirements) {
  return requirements.map((text, index) => ({
    id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
    text,
  }));
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
        x
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

function RequirementEditorModal({ title, value, onChange, onClose, onSave }) {
  return (
    <div className="modal-backdrop">
      <div className="detail-modal detail-modal-compact">
        <div className="modal-header">
          <div>
            <h2>{title}</h2>
            <p>Review and refine the extracted requirement before sending it for analysis.</p>
          </div>
          <button className="ghost-button" onClick={onClose}>Close</button>
        </div>

        <label className="form-label">Requirement Text</label>
        <textarea
          className="requirement-textarea"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Enter requirement text"
        />

        <div className="modal-actions">
          <button className="primary-button" onClick={onSave}>Save</button>
          <button className="secondary-button" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default function Analyse({ projects = [], selectedProjectId = "", onProjectChange = () => {}, onAnalysed = () => {} }) {
  const fileInputRef = useRef(null);
  const [inputMode, setInputMode] = useState("paste");
  const [requirementText, setRequirementText] = useState("");
  const [results, setResults] = useState([]);
  const [selectedResult, setSelectedResult] = useState(null);
  const [modifyTarget, setModifyTarget] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [documentStatus, setDocumentStatus] = useState({ state: "idle", message: "" });
  const [extractedRequirements, setExtractedRequirements] = useState([]);
  const [isRequirementEditorOpen, setIsRequirementEditorOpen] = useState(false);
  const [editingRequirement, setEditingRequirement] = useState(null);
  const [editingRequirementText, setEditingRequirementText] = useState("");
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [modifyLoading, setModifyLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState({ type: null, analysisId: null });
  const [statusMessage, setStatusMessage] = useState("");
  const [toast, setToast] = useState(null);
  const pageLoading =
    loading ||
    extracting ||
    modifyLoading ||
    (actionLoading.type === "review" && actionLoading.analysisId !== null);

  let pageLoadingTitle = "";
  let pageLoadingMessage = "";

  if (loading) {
    pageLoadingTitle = "Analysing requirements";
    pageLoadingMessage = "Please wait while the system splits and evaluates each requirement.";
  } else if (extracting) {
    pageLoadingTitle = "Extracting requirements";
    pageLoadingMessage = "We are reading the document and preparing a reviewable requirement list.";
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

  async function safelyRefreshAfterChange(successMessage = "") {
    try {
      await onAnalysed();
    } catch (error) {
      const refreshMessage = error?.message || "Background refresh failed.";

      if (successMessage) {
        setToast({
          type: "success",
          message: `${successMessage} Data refresh is temporarily unavailable.`,
        });
      } else {
        setToast({
          type: "error",
          message: refreshMessage,
        });
      }
    }
  }

  function resetDocumentState() {
    setSelectedFile(null);
    setDocumentStatus({ state: "idle", message: "" });
    setExtractedRequirements([]);
    setIsRequirementEditorOpen(false);
    setEditingRequirement(null);
    setEditingRequirementText("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleDocumentSelection(file) {
    if (!file) return;

    if (!/\.(pdf|docx)$/i.test(file.name || "")) {
      resetDocumentState();
      setDocumentStatus({
        state: "error",
        message: "Unsupported file type. Please upload a PDF or DOCX requirement document.",
      });
      setStatusMessage("Unsupported file type. Please upload a PDF or DOCX requirement document.");
      return;
    }

    setSelectedFile(file);
    setExtracting(true);
    setResults([]);
    setStatusMessage("");
    setDocumentStatus({ state: "extracting", message: "Extracting requirements from document..." });

    try {
      const response = await extractRequirementsDocument(file);
      setExtractedRequirements(createRequirementRows(response.requirements || []));
      setDocumentStatus({
        state: "ready",
        message: `${response.requirement_count} requirement(s) extracted successfully. Review them before analysis.`,
      });
      setToast({ type: "success", message: `${response.requirement_count} requirement(s) extracted from ${response.filename}.` });
    } catch (error) {
      setExtractedRequirements([]);
      setDocumentStatus({ state: "error", message: error.message || "Failed to extract requirements from document." });
      setStatusMessage(`Document extraction failed: ${error.message}`);
      setToast({ type: "error", message: `Document extraction failed: ${error.message}` });
    } finally {
      setExtracting(false);
    }
  }

  function handleFileInputChange(event) {
    const [file] = Array.from(event.target.files || []);
    handleDocumentSelection(file);
  }

  function handleDrop(event) {
    event.preventDefault();
    setIsDraggingFile(false);
    const [file] = Array.from(event.dataTransfer.files || []);
    handleDocumentSelection(file);
  }

  function getPreparedRequirements() {
    return extractedRequirements.map((item) => item.text.trim()).filter(Boolean);
  }

  function openRequirementEditor(requirement = null) {
    setIsRequirementEditorOpen(true);
    setEditingRequirement(requirement);
    setEditingRequirementText(requirement?.text || "");
  }

  function saveRequirementEditor() {
    const cleanedText = editingRequirementText.trim();

    if (!cleanedText) {
      setStatusMessage("Requirement text cannot be empty.");
      return;
    }

    if (editingRequirement) {
      setExtractedRequirements((previous) =>
        previous.map((item) => (item.id === editingRequirement.id ? { ...item, text: cleanedText } : item))
      );
    } else {
      setExtractedRequirements((previous) => [
        ...previous,
        { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, text: cleanedText },
      ]);
    }

    setIsRequirementEditorOpen(false);
    setEditingRequirement(null);
    setEditingRequirementText("");
  }

  function removeRequirement(requirementId) {
    setExtractedRequirements((previous) => previous.filter((item) => item.id !== requirementId));
  }

  function clearCurrentInput() {
    setResults([]);
    setStatusMessage("");

    if (inputMode === "paste") {
      setRequirementText("");
      return;
    }

    resetDocumentState();
  }

  async function handleAnalyse() {
    if (!selectedProjectId) {
      setStatusMessage("Please select a project before analysing requirements.");
      return;
    }

    if (inputMode === "paste") {
      if (!requirementText.trim()) {
        setStatusMessage("Please enter at least one requirement.");
        return;
      }
    } else {
      const preparedRequirements = getPreparedRequirements();

      if (!selectedFile) {
        setStatusMessage("Please upload a requirement document before analysing requirements.");
        return;
      }

      if (preparedRequirements.length === 0) {
        setStatusMessage("No valid extracted requirements are available for analysis.");
        return;
      }
    }

    setLoading(true);
    setStatusMessage("");

    try {
      const preparedRequirements = getPreparedRequirements();
      const response = await analyseBatchRequirements(
        inputMode === "paste"
          ? {
              requirement_text: requirementText,
              source_type: "manual",
              project_id: Number(selectedProjectId),
            }
          : {
              requirement_text: preparedRequirements.join("\n"),
              requirements: preparedRequirements,
              source_type: "document_upload",
              project_id: Number(selectedProjectId),
            }
      );

      setResults(response);
      const successMessage = `${response.length} requirement(s) analysed successfully.`;
      setStatusMessage(successMessage);
      await safelyRefreshAfterChange(successMessage);
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
        field_level_decisions:
          decision === REVIEW_STATUSES.ACCEPTED
            ? buildAcceptedFieldDecisions()
            : decision === REVIEW_STATUSES.REJECTED
              ? buildRejectedFieldDecisions()
              : null,
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
                field_level_decisions:
                  decision === REVIEW_STATUSES.ACCEPTED
                    ? buildAcceptedFieldDecisions()
                    : decision === REVIEW_STATUSES.REJECTED
                      ? buildRejectedFieldDecisions()
                      : item.field_level_decisions,
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
          field_level_decisions:
            decision === REVIEW_STATUSES.ACCEPTED
              ? buildAcceptedFieldDecisions()
              : decision === REVIEW_STATUSES.REJECTED
                ? buildRejectedFieldDecisions()
                : previous.field_level_decisions,
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
      await safelyRefreshAfterChange(successMessage);
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
      const originalItem = results.find((item) => item.analysis_id === analysisId);
      const updatedResult = await modifyAndReanalyse(analysisId, payload);
      const fieldLevelDecisions = buildModifiedFieldDecisions({
        llmType: originalItem?.requirement_type,
        finalType: updatedResult.requirement_type,
        llmPriority: originalItem?.priority_level,
        finalPriority: updatedResult.priority_level,
        llmAmbiguity: originalItem?.ambiguity_status,
        finalAmbiguity: updatedResult.ambiguity_status,
        llmAcceptanceCriteria: originalItem?.acceptance_criteria,
        finalAcceptanceCriteria: updatedResult.acceptance_criteria,
        llmTestCases: originalItem?.test_case,
        finalTestCases: updatedResult.test_case,
      });

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
                field_level_decisions: fieldLevelDecisions,
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
      await safelyRefreshAfterChange(successMessage);
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

  const previewColumns = [
    {
      key: "number",
      header: "Requirement Number",
      width: "18%",
      searchValue: () => "",
      render: (_, index) => `REQ-${String(index + 1).padStart(3, "0")}`,
    },
    {
      key: "text",
      header: "Extracted Requirement",
      width: "62%",
      cellClassName: "requirement-cell",
      searchValue: (item) => item.text,
      render: (item) => item.text,
    },
    {
      key: "actions",
      header: "Actions",
      width: "20%",
      cellClassName: "table-actions",
      searchValue: () => "Edit Delete",
      render: (item) => (
        <div className="table-actions">
          <button className="small-button" onClick={() => openRequirementEditor(item)}>Edit</button>
          <button className="small-danger-button" onClick={() => removeRequirement(item.id)}>Delete</button>
        </div>
      ),
    },
  ];

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

        {!projects.length && (
          <div className="empty-state inline-empty-state">
            <h3>No projects available</h3>
            <p>Create a project first so requirements can be analysed in the correct research context.</p>
          </div>
        )}

        <div className="input-mode-toggle" role="tablist" aria-label="Requirement input methods">
          <button
            type="button"
            className={`input-mode-button ${inputMode === "paste" ? "active" : ""}`}
            onClick={() => setInputMode("paste")}
          >
            Paste Requirements
          </button>
          <button
            type="button"
            className={`input-mode-button ${inputMode === "document" ? "active" : ""}`}
            onClick={() => setInputMode("document")}
          >
            Upload Requirement Document
          </button>
        </div>

        {inputMode === "paste" ? (
          <textarea
            className="requirement-textarea"
            value={requirementText}
            onChange={(event) => setRequirementText(event.target.value)}
            placeholder={"Example:\n1. The system shall allow users to login.\n2. The system shall allow users to upload PDF documents.\n3. The system should send WhatsApp messages using Twilio."}
          />
        ) : (
          <div className="document-upload-section">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx"
              className="document-file-input"
              onChange={handleFileInputChange}
            />
            <div
              className={`document-dropzone ${isDraggingFile ? "dragging" : ""}`}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDraggingFile(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                setIsDraggingFile(false);
              }}
              onDrop={handleDrop}
            >
              <strong>Upload Requirement Document</strong>
              <p>Drag and drop a PDF or DOCX file here, or choose a file from your device.</p>
              <div className="document-dropzone-actions">
                <button type="button" className="secondary-button" onClick={() => fileInputRef.current?.click()}>
                  Choose File
                </button>
              </div>
            </div>

            {selectedFile && (
              <div className="document-file-summary">
                <div>
                  <strong>{selectedFile.name}</strong>
                  <span>{formatFileSize(selectedFile.size)}</span>
                </div>
                <div className="document-file-status">
                  <span className={`badge ${documentStatus.state === "error" ? "badge-red" : documentStatus.state === "ready" ? "badge-green" : "badge-blue"}`}>
                    {documentStatus.state === "extracting" ? "Extracting" : documentStatus.state === "ready" ? "Ready" : documentStatus.state === "error" ? "Error" : "Selected"}
                  </span>
                  <button type="button" className="small-danger-button" onClick={resetDocumentState}>
                    Remove
                  </button>
                </div>
              </div>
            )}

            {documentStatus.message && (
              <p className={`document-status-message ${documentStatus.state === "error" ? "error" : ""}`}>
                {documentStatus.message}
              </p>
            )}
          </div>
        )}

        <div className="form-actions">
          <button className="primary-button" onClick={handleAnalyse} disabled={loading || extracting || !projects.length}>
            <LoadingLabel loading={loading} idleText="Analyse Requirements" loadingText="Analysing..." />
          </button>
          <button
            className="secondary-button"
            disabled={loading || extracting || modifyLoading}
            onClick={clearCurrentInput}
          >
            Clear
          </button>
        </div>

        {statusMessage && <p className="status-message">{statusMessage}</p>}
      </div>

      {inputMode === "document" && (
        <div className="page-card data-page-card">
          <div className="page-card-header">
            <div>
              <h2>Extracted Requirement Preview</h2>
              <p>Review the extracted requirements, edit any mistakes, remove invalid entries, and add missing requirements before analysis.</p>
            </div>
            <span className="badge badge-blue">{getPreparedRequirements().length} Ready</span>
          </div>

          <AppDataTable
            columns={previewColumns}
            rows={extractedRequirements}
            rowKey={(item) => item.id}
            loading={extracting}
            onRefresh={selectedFile ? () => handleDocumentSelection(selectedFile) : undefined}
            searchPlaceholder="Search extracted requirements..."
            emptyMessage="No extracted requirements found. Upload a PDF or DOCX document to begin."
            footerLabel="requirements"
            containerClassName="analysis-results-table-shell"
            bodyHeight="min(48vh, 520px)"
            toolbarButtons={[
              {
                key: "add-requirement",
                label: "Add Requirement",
                className: "primary-button",
                onClick: () => openRequirementEditor(),
              },
            ]}
          />
        </div>
      )}

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

      {isRequirementEditorOpen && (
        <RequirementEditorModal
          title={editingRequirement ? "Edit Extracted Requirement" : "Add Requirement"}
          value={editingRequirementText}
          onChange={setEditingRequirementText}
          onClose={() => {
            setIsRequirementEditorOpen(false);
            setEditingRequirement(null);
            setEditingRequirementText("");
          }}
          onSave={saveRequirementEditor}
        />
      )}
    </div>
  );
}

