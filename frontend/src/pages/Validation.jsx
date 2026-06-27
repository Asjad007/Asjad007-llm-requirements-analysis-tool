import { useMemo } from 'react';
import RequirementsRepositoryDataTable from '../components/RequirementsRepositoryDataTable';
import { REVIEW_STATUSES, normalizeReviewStatus } from '../utils/reviewStatuses';

export default function Validation({ history, stats, onRefresh }) {
  const pendingHistory = useMemo(
    () => history.filter((item) => normalizeReviewStatus(item.review_decision) === REVIEW_STATUSES.PENDING),
    [history]
  );

  return (
    <section className="panel page-panel data-page-panel">
      <div className="module-header">
        <div><span className="module-kicker">Human-in-the-loop</span><h2>Human Validation</h2><p>Review pending LLM outputs and accept, modify, or reject them.</p></div>
      </div>
      <div className="stats-grid mini">
        <div className="mini-stat"><strong>{stats.accepted}</strong><span>Accepted</span></div>
        <div className="mini-stat"><strong>{stats.modified}</strong><span>Modified</span></div>
        <div className="mini-stat"><strong>{stats.rejected}</strong><span>Rejected</span></div>
        <div className="mini-stat"><strong>{stats.pending}</strong><span>Pending</span></div>
      </div>
      <RequirementsRepositoryDataTable
        history={pendingHistory}
        onRefresh={onRefresh}
        viewMode="validation"
        emptyMessage="No pending validation items. New LLM outputs will appear here when reviewer action is needed."
      />
    </section>
  );
}
