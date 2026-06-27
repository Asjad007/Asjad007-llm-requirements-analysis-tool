import { useMemo, useState } from 'react';
import RequirementsDataTable from '../components/RequirementsDataTable';
import RequirementsRepositoryDataTable from '../components/RequirementsRepositoryDataTable';
import { REVIEW_STATUSES, normalizeReviewStatus } from '../utils/reviewStatuses';

export default function Requirements({ title, subtitle, history, projects = [], isLoading, error, onRefresh, mode = 'repository', onNavigate }) {
  const isRepositoryPage = mode === 'repository';
  const TableComponent = isRepositoryPage ? RequirementsRepositoryDataTable : RequirementsDataTable;
  const [projectFilter, setProjectFilter] = useState('');
  const filteredHistory = useMemo(
    () => {
      const scopedHistory = history.filter((item) => {
        if (mode === 'history') {
          return normalizeReviewStatus(item.review_decision) !== REVIEW_STATUSES.PENDING;
        }

        return true;
      });

      return projectFilter
        ? scopedHistory.filter((item) => String(item.project_id || '') === String(projectFilter))
        : scopedHistory;
    },
    [history, mode, projectFilter]
  );

  const emptyMessage = mode === 'history'
    ? 'No completed review history is available yet.'
    : 'No requirements are available yet. Upload and analyse requirements to populate the repository.';

  return (
    <section className={`panel page-panel data-page-panel ${isRepositoryPage ? 'repository-page-panel' : ''}`}>
      <div className="panel-title-row">
        <div><h2>{title}</h2><p>{subtitle}</p></div>
        <button className="primary-outline" onClick={onRefresh}>{isLoading ? 'Refreshing...' : 'Refresh'}</button>
      </div>
      <div className="project-filter-row">
        <label className="project-filter-label">
          <span>Project Filter</span>
          <select className="project-select" value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)}>
            <option value="">All projects</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>
        </label>
      </div>
      {error && <div className="error-message">{error}</div>}
      <TableComponent
        history={filteredHistory}
        onRefresh={onRefresh}
        isLoading={isLoading}
        emptyMessage={emptyMessage}
        viewMode={mode}
        onNavigate={onNavigate}
      />
    </section>
  );
}
