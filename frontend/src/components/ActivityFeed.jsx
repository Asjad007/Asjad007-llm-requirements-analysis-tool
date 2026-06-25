import { REVIEW_STATUSES, normalizeReviewStatus } from "../utils/reviewStatuses";

export default function ActivityFeed({ history = [] }) {
  const latest = history.slice(0, 4);
  return (
    <section className="panel side-panel">
      <div className="panel-title-row">
        <h3>Activity Feed</h3>
        <button>View all</button>
      </div>
      <div className="activity-list">
        {latest.length === 0 && <p className="muted">No activity yet.</p>}
        {latest.map((item) => (
          <div className="activity-item" key={item.analysis_id}>
            <div className="activity-icon">✓</div>
            <div>
              <strong>REQ-{String(item.analysis_id).padStart(3, '0')}</strong>
              {item.project_name && <p>{item.project_name}</p>}
              <p>
                {normalizeReviewStatus(item.review_decision || REVIEW_STATUSES.PENDING) === REVIEW_STATUSES.PENDING
                  ? 'Marked as Pending'
                  : `Marked as ${normalizeReviewStatus(item.review_decision)}`}
              </p>
              <small>{new Date(item.created_at).toLocaleString()}</small>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
