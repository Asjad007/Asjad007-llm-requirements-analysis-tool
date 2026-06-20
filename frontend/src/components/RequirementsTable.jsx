import { deleteHistoryItem } from '../services/api';

function decisionLabel(value) {
  if (!value) return 'Pending';
  if (value === 'accept') return 'Reviewed';
  if (value === 'modify') return 'Modified';
  if (value === 'reject') return 'Rejected';
  return value;
}

function decisionClass(value) {
  if (!value) return 'warning';
  if (value === 'accept') return 'success';
  if (value === 'modify') return 'warning';
  if (value === 'reject') return 'danger';
  return 'neutral';
}

function formatConfidence(value) {
  if (value === null || value === undefined) return 'N/A';
  const number = Number(value);
  if (Number.isNaN(number)) return 'N/A';
  return `${Math.round(number * 100)}%`;
}

export default function RequirementsTable({ history = [], compact = false, onRefresh }) {
  async function handleDelete(analysisId) {
    const confirmed = window.confirm('Delete this analysis record?');
    if (!confirmed) return;
    await deleteHistoryItem(analysisId);
    if (onRefresh) onRefresh();
  }

  if (!history.length) {
    return (
      <div className="empty-state">
        <h3>No analysed requirements yet</h3>
        <p>Analyse a requirement first. It will appear in this professional repository table.</p>
      </div>
    );
  }

  const rows = compact ? history.slice(0, 5) : history;

  return (
    <div className="table-wrap">
      <table className="requirements-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Requirement</th>
            <th>Type</th>
            <th>Priority</th>
            <th>Ambiguity</th>
            <th>Confidence</th>
            <th>Status</th>
            {!compact && <th>Action</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((item) => (
            <tr key={item.analysis_id}>
              <td>REQ-{String(item.analysis_id).padStart(3, '0')}</td>
              <td className="requirement-cell">{item.original_text}</td>
              <td><span className="badge info">{item.requirement_type}</span></td>
              <td><span className={`badge ${String(item.priority_level).toLowerCase()}`}>{item.priority_level}</span></td>
              <td><span className={`badge ${String(item.ambiguity_status).toLowerCase().includes('ambiguous') ? 'warning' : 'success'}`}>{item.ambiguity_status}</span></td>
              <td>{formatConfidence(item.confidence_score)}</td>
              <td><span className={`badge ${decisionClass(item.review_decision)}`}>{decisionLabel(item.review_decision)}</span></td>
              {!compact && <td><button className="danger-button" onClick={() => handleDelete(item.analysis_id)}>Delete</button></td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}