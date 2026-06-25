import { useState } from 'react';
import { submitReview } from '../services/api';
import { REVIEW_STATUSES } from '../utils/reviewStatuses';

function formatConfidence(value) {
  if (value === null || value === undefined) return 'N/A';
  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) return 'N/A';
  return `${Math.round(numericValue * 100)}%`;
}

export default function ResultCard({ result, onReviewSaved }) {
  const [reviewNotes, setReviewNotes] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (!result) return null;

  async function handleReview(decision) {
    setMessage('');
    setError('');
    setIsSaving(true);
    try {
      await submitReview(result.analysis_id, {
        decision,
        modified_requirement_type: null,
        modified_priority: null,
        modified_acceptance_criteria: null,
        modified_test_case: null,
        review_notes: reviewNotes || null
      });
      setMessage(`Result ${decision}ed successfully.`);
      if (onReviewSaved) onReviewSaved();
    } catch (err) {
      setError(err.message || 'Failed to save review decision.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="panel result-card">
      <div className="panel-title-row">
        <div><h2>Literature-Backed Generated Analysis</h2><p>Review the structured requirements engineering output before accepting, modifying, or rejecting it.</p></div>
        <span className={`badge ${String(result.ambiguity_status).toLowerCase().includes('ambiguous') ? 'warning' : 'success'}`}>{result.ambiguity_status}</span>
      </div>
      <div className="method-box">
        <p><strong>Analysis method:</strong> {result.analysis_method || 'Prompt-engineered LLM-assisted requirements analysis'}</p>
        <p><strong>Literature basis:</strong> {result.literature_basis || 'LLM-for-Requirements-Engineering literature'}</p>
      </div>
      <div className="requirement-preview"><strong>Requirement:</strong><p>{result.original_text}</p></div>
      <div className="summary-grid">
        <div className="summary-item"><span>Requirement Type</span><strong>{result.requirement_type}</strong></div>
        <div className="summary-item"><span>Ambiguity</span><strong>{result.ambiguity_status}</strong></div>
        <div className="summary-item"><span>Priority</span><strong>{result.priority_level}</strong></div>
        <div className="summary-item"><span>Confidence</span><strong>{formatConfidence(result.confidence_score)}</strong></div>
      </div>
      <div className="analysis-section"><h3>Ambiguity Explanation</h3><p>{result.ambiguity_explanation}</p></div>
      <div className="analysis-section"><h3>Priority Reason</h3><p>{result.priority_reason}</p></div>
      <div className="analysis-section"><h3>Acceptance Criteria</h3><p>{result.acceptance_criteria}</p></div>
      <div className="analysis-section"><h3>Test Case</h3><p>{result.test_case}</p></div>
      <div className="analysis-section improvement-section"><h3>Improvement Suggestion</h3><p>{result.improvement_suggestion || 'No improvement suggestion was generated.'}</p></div>
      <div className="review-box">
        <label htmlFor="reviewNotes">Review Notes</label>
        <textarea id="reviewNotes" value={reviewNotes} onChange={(event) => setReviewNotes(event.target.value)} placeholder="Optional notes about the review decision" />
        <div className="button-row">
          <button className="primary-button" disabled={isSaving} onClick={() => handleReview(REVIEW_STATUSES.ACCEPTED)}>Accept</button>
          <button className="secondary-button" disabled={isSaving} onClick={() => handleReview(REVIEW_STATUSES.MODIFIED)}>Modify</button>
          <button className="danger-button" disabled={isSaving} onClick={() => handleReview(REVIEW_STATUSES.REJECTED)}>Reject</button>
        </div>
      </div>
      {message && <div className="success-message">{message}</div>}
      {error && <div className="error-message">{error}</div>}
    </section>
  );
}
