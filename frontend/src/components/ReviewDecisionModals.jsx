import { useEffect, useState } from "react";
import {
  FIELD_REVIEW_KEYS,
  FIELD_REVIEW_LABELS,
  FIELD_REVIEW_OPTIONS,
  inferFieldReviewDecisions,
  resolveFieldReviewDecisions,
} from "../utils/fieldReviewDecisions";
import { REVIEW_STATUSES } from "../utils/reviewStatuses";

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

export function ModifyReviewModal({ item, loading, onClose, onSubmit }) {
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
            {loading ? "Saving..." : "Save Human Review"}
          </button>
          <button className="secondary-button" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export function RejectReviewModal({ item, loading, onClose, onSubmit }) {
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
