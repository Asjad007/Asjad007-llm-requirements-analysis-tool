import { useState } from 'react';
import { submitReview } from '../services/api';

function ResultCard({ result }) {
  const [editing, setEditing] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    modified_requirement_type: result.requirement_type,
    modified_priority: result.priority_level,
    modified_acceptance_criteria: result.acceptance_criteria,
    modified_test_case: result.test_case,
  });

  const handleReview = async (decision) => {
    try {
      setMessage('');
      const payload = { decision, review_notes: reviewNotes || null };
      if (decision === 'modify') Object.assign(payload, form);
      await submitReview(result.analysis_id, payload);
      setMessage(`Result ${decision}ed successfully.`);
    } catch (err) { setMessage(err.message); }
  };

  return (
    <section className="card result-card">
      <div className="card-header"><h2>Generated Analysis</h2><p>Review the generated output before accepting, modifying, or rejecting it.</p></div>
      <div className="requirement-box"><strong>Requirement:</strong><p>{result.original_text}</p></div>
      <div className="grid">
        <div className="info-box"><span>Requirement Type</span><strong>{result.requirement_type}</strong></div>
        <div className="info-box"><span>Ambiguity</span><strong>{result.ambiguity_status}</strong></div>
        <div className="info-box"><span>Priority</span><strong>{result.priority_level}</strong></div>
      </div>
      <div className="analysis-section"><h3>Ambiguity Explanation</h3><p>{result.ambiguity_explanation}</p></div>
      <div className="analysis-section"><h3>Priority Reason</h3><p>{result.priority_reason}</p></div>
      <div className="analysis-section"><h3>Acceptance Criteria</h3><p>{result.acceptance_criteria}</p></div>
      <div className="analysis-section"><h3>Test Case</h3><p>{result.test_case}</p></div>
      {editing && <div className="edit-panel"><h3>Modify Generated Output</h3>
        <label>Requirement Type<select value={form.modified_requirement_type} onChange={(e) => setForm({ ...form, modified_requirement_type: e.target.value })}><option>Functional</option><option>Non-functional</option></select></label>
        <label>Priority<select value={form.modified_priority} onChange={(e) => setForm({ ...form, modified_priority: e.target.value })}><option>High</option><option>Medium</option><option>Low</option></select></label>
        <label>Acceptance Criteria<textarea value={form.modified_acceptance_criteria} onChange={(e) => setForm({ ...form, modified_acceptance_criteria: e.target.value })} rows={3} /></label>
        <label>Test Case<textarea value={form.modified_test_case} onChange={(e) => setForm({ ...form, modified_test_case: e.target.value })} rows={3} /></label>
      </div>}
      <label>Review Notes<textarea value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} rows={2} placeholder="Optional notes about the review decision" /></label>
      <div className="actions">
        <button onClick={() => handleReview('accept')}>Accept</button>
        <button className="secondary" onClick={() => setEditing(!editing)}>{editing ? 'Cancel Modify' : 'Modify'}</button>
        {editing && <button onClick={() => handleReview('modify')}>Save Modified</button>}
        <button className="danger" onClick={() => handleReview('reject')}>Reject</button>
      </div>
      {message && <p className="status-message">{message}</p>}
    </section>
  );
}
export default ResultCard;
