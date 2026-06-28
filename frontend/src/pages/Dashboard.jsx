import { useMemo } from 'react';
import StatsCard from '../components/StatsCard';
import DonutChart from '../components/DonutChart';
import RequirementsDataTable from '../components/RequirementsDataTable';
import ActivityFeed from '../components/ActivityFeed';
import { REVIEW_STATUSES, normalizeReviewStatus } from '../utils/reviewStatuses';

export default function Dashboard({ history, stats, isLoading, error, onNavigate, onRefresh }) {
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

  const displayHistory = useMemo(
    () =>
      history.map((item) => {
        const analysisId = Number(item.analysis_id || item.id);
        const isRefinedChild = refinedAnalysisIds.has(analysisId);
        const status = normalizeReviewStatus(item.review_decision || REVIEW_STATUSES.PENDING);

        return {
          ...item,
          isRefinedChild,
          displayStatus: isRefinedChild ? REVIEW_STATUSES.MODIFIED : status,
        };
      }),
    [history, refinedAnalysisIds]
  );

  const dashboardStats = useMemo(() => {
    const pendingCount = displayHistory.filter(
      (item) =>
        normalizeReviewStatus(item.review_decision || REVIEW_STATUSES.PENDING) === REVIEW_STATUSES.PENDING &&
        !item.isRefinedChild
    ).length;

    return {
      ...stats,
      pending: pendingCount,
    };
  }, [stats, displayHistory]);

  const recentAnalyses = useMemo(
    () => displayHistory.filter((item) => !item.isRefinedChild).slice(0, 5),
    [displayHistory]
  );

  return (
    <div className="dashboard-page">
      {error && <div className="error-message">{error}</div>}

      <div className="stats-grid">
        <StatsCard
          title="Total Projects"
          value={dashboardStats.totalProjects}
          subtitle="Configured analysis contexts"
          icon="◉"
          tone="purple"
        />

        <StatsCard
          title="Total Requirements"
          value={dashboardStats.total}
          subtitle="Across all analysed items"
          icon="▤"
          tone="green"
        />

        <StatsCard
          title="Reviewed Requirements"
          value={dashboardStats.reviewed}
          subtitle={`${dashboardStats.total ? Math.round((dashboardStats.reviewed / dashboardStats.total) * 100) : 0}% completed`}
          icon="✓"
          tone="orange"
        />

        <StatsCard
          title="Pending Validations"
          value={dashboardStats.pending}
          subtitle="Still awaiting human review"
          icon="◐"
          tone="blue"
        />
      </div>

      <div className="dashboard-grid">
        <DonutChart
          title="Requirements by Priority"
          items={[
            { label: 'High', value: dashboardStats.high, color: '#ef4444' },
            { label: 'Medium', value: dashboardStats.medium, color: '#f59e0b' },
            { label: 'Low', value: dashboardStats.low, color: '#22c55e' },
          ]}
        />

        <DonutChart
          title="Requirements by Type"
          items={[
            { label: 'Functional', value: dashboardStats.functional, color: '#2563eb' },
            { label: 'Non-functional', value: dashboardStats.nonFunctional, color: '#7c3aed' },
            {
              label: 'Other/Mixed',
              value: Math.max(dashboardStats.total - dashboardStats.functional - dashboardStats.nonFunctional, 0),
              color: '#94a3b8',
            },
          ]}
        />

        <section className="panel recent-analyses">
          <div className="panel-title-row">
            <h3>Recent Analyses</h3>
            <button onClick={() => onNavigate('requirements')}>View all</button>
          </div>

          <p className="history-subtext">
            <strong>Latest project activity:</strong> {dashboardStats.latestProjectActivity}
          </p>

          <div className="recent-list">
            {recentAnalyses.map((item) => (
              <button
                className="recent-item"
                key={item.analysis_id}
                onClick={() => onNavigate('requirements')}
              >
                <div className="doc-icon">▤</div>

                <div>
                  <strong>REQ-{String(item.analysis_id).padStart(3, '0')}</strong>
                  <span>
                    {item.project_name ? `${item.project_name}: ` : ''}
                    {item.original_text.slice(0, 46)}
                    {item.original_text.length > 46 ? '...' : ''}
                  </span>
                </div>

                <em>{item.displayStatus}</em>
              </button>
            ))}

            {!recentAnalyses.length && <p className="muted">No recent analyses yet.</p>}
          </div>
        </section>
      </div>

      <div className="content-grid">
        <section className="panel wide-panel">
          <div className="panel-title-row">
            <h3>Recent Requirements</h3>
            <button onClick={onRefresh}>{isLoading ? 'Loading...' : 'Refresh'}</button>
          </div>

          <RequirementsDataTable
            history={displayHistory.slice(0, 8)}
            onRefresh={onRefresh}
            isLoading={isLoading}
          />
        </section>

        <ActivityFeed history={displayHistory} />
      </div>
    </div>
  );
}