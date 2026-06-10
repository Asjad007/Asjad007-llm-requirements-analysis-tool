function HistoryTable({ items, onDelete }) {
  if (!items.length) return <p className="empty">No history records yet.</p>;
  return <div className="table-wrapper"><table><thead><tr><th>Requirement</th><th>Type</th><th>Ambiguity</th><th>Priority</th><th>Review</th><th>Action</th></tr></thead><tbody>
    {items.map((item) => <tr key={item.analysis_id}><td>{item.original_text}</td><td>{item.requirement_type}</td><td>{item.ambiguity_status}</td><td>{item.priority_level}</td><td>{item.review_decision || 'Pending'}</td><td><button className="danger small" onClick={() => onDelete(item.analysis_id)}>Delete</button></td></tr>)}
  </tbody></table></div>;
}
export default HistoryTable;
