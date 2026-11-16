import { useMemo } from 'react';
import RequirementsRepositoryDataTable from '../components/RequirementsRepositoryDataTable';
import { REVIEW_STATUSES, normalizeReviewStatus } from '../utils/reviewStatuses';

export default function Validation({ history, stats, onRefresh }) {
  const refinedAnalysisIds = useMemo(() => {
    const ids = new Set();

    history.forEach((item) => {
      const refinedId =
        item.refined_analysis_result_id ||
        item.refined_analysis_id ||
        item.modified_analysis_id ||
        item.modified_into_analysis_id;

      if (refinedId) {
        ids.add(Number(refinedId));
      }
    });

    return ids;
  }, [history]);

  const pendingHistory = useMemo(
    () =>
      history.filter((item) => {
        const status = normalizeReviewStatus(item.review_decision);

        if (status !== REVIEW_STATUSES.PENDING) {
          return false;
        }

        const analysisId = Number(item.analysis_id || item.id);

        // Refined child analyses remain history evidence rather than new review tasks.
        if (refinedAnalysisIds.has(analysisId)) {
          return false;
        }

        return true;
      }),
    [history, refinedAnalysisIds]
  );

  const displayStats = useMemo(
    () => ({
      ...stats,
      pending: pendingHistory.length,
    }),
    [stats, pendingHistory]
  );

  return (
    <section className="panel page-panel data-page-panel">
      <div className="module-header">
        <div>
          <span className="module-kicker">Human-in-the-loop</span>
          <h2>Human Validation</h2>
          <p>Review pending LLM outputs and accept, modify, or reject them.</p>
        </div>
      </div>

      <div className="stats-grid mini">
        <div className="mini-stat">
          <strong>{displayStats.accepted}</strong>
          <span>Accepted</span>
        </div>
        <div className="mini-stat">
          <strong>{displayStats.modified}</strong>
          <span>Modified</span>
        </div>
        <div className="mini-stat">
          <strong>{displayStats.rejected}</strong>
          <span>Rejected</span>
        </div>
        <div className="mini-stat">
          <strong>{displayStats.pending}</strong>
          <span>Pending</span>
        </div>
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
