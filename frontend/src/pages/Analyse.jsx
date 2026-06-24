import { useState } from "react";
import { analyseBatchRequirements, reviewAnalysis, modifyAndReanalyse } from "../services/api";

function badgeClass(value) {
  if (!value) return "badge";

  const normalised = value.toLowerCase();

  if (normalised.includes("rejected")) return "badge badge-red";
  if (normalised.includes("reviewed")) return "badge badge-green";
  if (normalised.includes("modified")) return "badge badge-orange";
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

function RequirementDetailModal({ item, onClose, onReview, onOpenModify }) {
  if (!item) return null;

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
          <button className="success-button" onClick={() => onReview(item.analysis_id, "Reviewed")}>
            Accept
          </button>
          <button className="warning-button" onClick={() => onOpenModify(item)}>
            Modify & Reanalyse
          </button>
          <button className="danger-button" onClick={() => onReview(item.analysis_id, "Rejected")}>
            Reject
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

export default function Analyse() {
  const [requirementText, setRequirementText] = useState("");
  const [results, setResults] = useState([]);
  const [selectedResult, setSelectedResult] = useState(null);
  const [modifyTarget, setModifyTarget] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modifyLoading, setModifyLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  async function handleAnalyse() {
    if (!requirementText.trim()) {
      setStatusMessage("Please enter at least one requirement.");
      return;
    }

    setLoading(true);
    setStatusMessage("");

    try {
      const response = await analyseBatchRequirements({
        requirement_text: requirementText,
        source_type: "manual",
      });

      setResults(response);
      setStatusMessage(`${response.length} requirement(s) analysed successfully.`);
    } catch (error) {
      setStatusMessage(`Analysis failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleReview(analysisId, decision) {
    try {
      await reviewAnalysis(analysisId, {
        decision,
        modified_requirement_type: null,
        modified_priority: null,
        modified_acceptance_criteria: null,
        modified_test_case: null,
        review_notes: `Decision recorded from batch analysis grid: ${decision}`,
      });

      setResults((previous) =>
        previous.map((item) =>
          item.analysis_id === analysisId
            ? { ...item, review_decision: decision }
            : item
        )
      );

      if (selectedResult?.analysis_id === analysisId) {
        setSelectedResult((previous) => ({ ...previous, review_decision: decision }));
      }

      setStatusMessage(`Requirement REQ-${String(analysisId).padStart(3, "0")} marked as ${decision}.`);
    } catch (error) {
      setStatusMessage(`Review failed: ${error.message}`);
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
                review_decision: "Modified",
                modified_result: updatedResult,
              }
            : item
        )
      );

      setResults((previous) => [updatedResult, ...previous]);

      setModifyTarget(null);
      setSelectedResult(updatedResult);
      setStatusMessage(
        `Requirement REQ-${String(analysisId).padStart(3, "0")} was modified and re-analysed as REQ-${String(updatedResult.analysis_id).padStart(3, "0")}.`
      );
    } catch (error) {
      setStatusMessage(`Modify and reanalyse failed: ${error.message}`);
    } finally {
      setModifyLoading(false);
    }
  }

  return (
    <div className="page">
      <div className="page-card">
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

        <textarea
          className="requirement-textarea"
          value={requirementText}
          onChange={(event) => setRequirementText(event.target.value)}
          placeholder={"Example:\n1. The system shall allow users to login.\n2. The system shall allow users to upload PDF documents.\n3. The system should send WhatsApp messages using Twilio."}
        />

        <div className="form-actions">
          <button className="primary-button" onClick={handleAnalyse} disabled={loading}>
            {loading ? "Analysing..." : "Analyse Requirements"}
          </button>
          <button
            className="secondary-button"
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
        <div className="page-card">
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

          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Requirement</th>
                  <th>Type</th>
                  <th>Priority</th>
                  <th>Ambiguity</th>
                  <th>Confidence</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {results.map((item) => (
                  <tr key={item.analysis_id}>
                    <td>REQ-{String(item.analysis_id).padStart(3, "0")}</td>
                    <td>
                      {item.original_text}
                      {item.review_decision === "Modified" && (
                        <div className="small-muted-text">
                          Human-modified version generated separately.
                        </div>
                      )}
                    </td>
                    <td><span className={badgeClass(item.requirement_type)}>{item.requirement_type}</span></td>
                    <td><span className={badgeClass(item.priority_level)}>{item.priority_level}</span></td>
                    <td><span className={badgeClass(item.ambiguity_status)}>{item.ambiguity_status}</span></td>
                    <td>{Math.round((item.confidence_score || 0) * 100)}%</td>
                    <td>
                      <span className={badgeClass(item.review_decision || "Pending")}>
                        {item.review_decision || "Pending"}
                      </span>
                    </td>
                    <td className="table-actions">
                      <button className="small-button" onClick={() => setSelectedResult(item)}>
                        View
                      </button>
                      <button className="small-success-button" onClick={() => handleReview(item.analysis_id, "Reviewed")}>
                        Accept
                      </button>
                      <button className="small-warning-button" onClick={() => setModifyTarget(item)}>
                        Modify
                      </button>
                      <button className="small-danger-button" onClick={() => handleReview(item.analysis_id, "Rejected")}>
                        Reject
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <RequirementDetailModal
        item={selectedResult}
        onClose={() => setSelectedResult(null)}
        onReview={handleReview}
        onOpenModify={setModifyTarget}
      />

      <ModifyModal
        item={modifyTarget}
        onClose={() => setModifyTarget(null)}
        onSubmit={handleModifyAndReanalyse}
        loading={modifyLoading}
      />
    </div>
  );
}