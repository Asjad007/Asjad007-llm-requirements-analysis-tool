import StatsCard from '../components/StatsCard';
import DonutChart from '../components/DonutChart';
import RequirementsTable from '../components/RequirementsTable';
import ActivityFeed from '../components/ActivityFeed';

export default function Dashboard({ history, stats, isLoading, error, onNavigate, onRefresh }) {
  return (
    <div className="dashboard-page">
      {error && <div className="error-message">{error}</div>}
      <div className="stats-grid">
        <StatsCard title="Total Requirements" value={stats.total} subtitle="Across all analysed items" icon="▤" tone="purple" />
        <StatsCard title="Functional Requirements" value={stats.functional} subtitle={`${stats.total ? Math.round((stats.functional / stats.total) * 100) : 0}% of total`} icon="□" tone="green" />
        <StatsCard title="Ambiguous Requirements" value={stats.ambiguous} subtitle={`${stats.total ? Math.round((stats.ambiguous / stats.total) * 100) : 0}% need clarification`} icon="!" tone="orange" />
        <StatsCard title="Generated Test Cases" value={stats.total} subtitle="One test case per analysis" icon="⚗" tone="blue" />
      </div>
      <div className="dashboard-grid">
        <DonutChart title="Requirements by Priority" items={[
          { label: 'High', value: stats.high, color: '#ef4444' },
          { label: 'Medium', value: stats.medium, color: '#f59e0b' },
          { label: 'Low', value: stats.low, color: '#22c55e' }
        ]} />
        <DonutChart title="Requirements by Type" items={[
          { label: 'Functional', value: stats.functional, color: '#2563eb' },
          { label: 'Non-functional', value: stats.nonFunctional, color: '#7c3aed' },
          { label: 'Other/Mixed', value: Math.max(stats.total - stats.functional - stats.nonFunctional, 0), color: '#94a3b8' }
        ]} />
        <section className="panel recent-analyses">
          <div className="panel-title-row"><h3>Recent Analyses</h3><button onClick={() => onNavigate('requirements')}>View all</button></div>
          <div className="recent-list">
            {history.slice(0, 5).map((item) => (
              <button className="recent-item" key={item.analysis_id} onClick={() => onNavigate('requirements')}>
                <div className="doc-icon">▤</div>
                <div><strong>REQ-{String(item.analysis_id).padStart(3, '0')}</strong><span>{item.original_text.slice(0, 46)}{item.original_text.length > 46 ? '...' : ''}</span></div>
                <em>{item.review_decision ? 'Reviewed' : 'In Review'}</em>
              </button>
            ))}
            {!history.length && <p className="muted">No recent analyses yet.</p>}
          </div>
        </section>
      </div>
      <div className="content-grid">
        <section className="panel wide-panel">
          <div className="panel-title-row"><h3>Recent Requirements</h3><button onClick={onRefresh}>{isLoading ? 'Loading...' : 'Refresh'}</button></div>
          <RequirementsTable history={history} compact onRefresh={onRefresh} />
        </section>
        <ActivityFeed history={history} />
      </div>
    </div>
  );
}