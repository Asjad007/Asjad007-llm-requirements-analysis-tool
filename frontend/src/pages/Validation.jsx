import RequirementsDataTable from '../components/RequirementsDataTable';

export default function Validation({ history, stats, onRefresh }) {
  return (
    <section className="panel page-panel data-page-panel">
      <div className="module-header">
        <div><span className="module-kicker">Human-in-the-loop</span><h2>Human Validation</h2><p>Review LLM-generated outputs before accepting, modifying, or rejecting them. This stage mitigates LLM hallucination and supports traceability.</p></div>
      </div>
      <div className="stats-grid mini">
        <div className="mini-stat"><strong>{stats.accepted}</strong><span>Accepted</span></div>
        <div className="mini-stat"><strong>{stats.modified}</strong><span>Modified</span></div>
        <div className="mini-stat"><strong>{stats.rejected}</strong><span>Rejected</span></div>
        <div className="mini-stat"><strong>{stats.pending}</strong><span>Pending</span></div>
      </div>
      <RequirementsDataTable history={history} onRefresh={onRefresh} />
    </section>
  );
}
