import { useMemo, useState } from "react";

const REPORT_TYPES = [
  {
    id: "project-summary",
    label: "Project Summary",
    description: "Project context, requirement volume, review progress, and confidence overview.",
  },
  {
    id: "validation-audit",
    label: "Validation Audit",
    description: "Accepted, modified, and rejected review decisions with reviewer evidence.",
  },
  {
    id: "evaluation-pack",
    label: "Evaluation Pack",
    description: "Evaluation-ready summaries for dissertation discussion and appendix material.",
  },
];

export default function Reports({ history, projects = [], onRefresh }) {
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [reportType, setReportType] = useState(REPORT_TYPES[0].id);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      const matchesProject = selectedProjectId ? String(item.project_id || "") === String(selectedProjectId) : true;
      const itemDate = item.reviewed_at || item.review_updated_at || item.review_created_at || item.created_at;
      const dateValue = itemDate ? new Date(itemDate) : null;
      const matchesFrom = dateFrom && dateValue ? dateValue >= new Date(dateFrom) : true;
      const matchesTo = dateTo && dateValue ? dateValue <= new Date(`${dateTo}T23:59:59`) : true;
      return matchesProject && matchesFrom && matchesTo;
    });
  }, [dateFrom, dateTo, history, selectedProjectId]);

  const selectedProject = projects.find((project) => String(project.id) === String(selectedProjectId));
  const selectedReport = REPORT_TYPES.find((report) => report.id === reportType) || REPORT_TYPES[0];
  const summaryLines = [
    selectedProject ? `Project: ${selectedProject.name}` : "Project: All projects",
    `Report type: ${selectedReport.label}`,
    dateFrom || dateTo ? `Date filter: ${dateFrom || "Start"} to ${dateTo || "Now"}` : "Date filter: All available records",
    `Included records: ${filteredHistory.length}`,
  ];

  return (
    <section className="panel page-panel data-page-panel">
      <div className="module-header">
        <div>
          <span className="module-kicker">Reports</span>
          <h2>Reports</h2>
          <p>Generate dissertation-ready project and evaluation reports.</p>
        </div>
      </div>

      <div className="reports-layout">
        <div className="reports-form-card">
          <label className="project-filter-label">
            <span>Project</span>
            <select className="project-select" value={selectedProjectId} onChange={(event) => setSelectedProjectId(event.target.value)}>
              <option value="">All projects</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
          </label>

          <label className="project-filter-label">
            <span>Report Type</span>
            <select className="project-select" value={reportType} onChange={(event) => setReportType(event.target.value)}>
              {REPORT_TYPES.map((report) => (
                <option key={report.id} value={report.id}>{report.label}</option>
              ))}
            </select>
          </label>

          <div className="reports-date-grid">
            <label className="project-filter-label">
              <span>Date From</span>
              <input className="project-input" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
            </label>
            <label className="project-filter-label">
              <span>Date To</span>
              <input className="project-input" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
            </label>
          </div>

          <div className="reports-action-row">
            <button className="primary-button" type="button">Export Summary</button>
            <button className="secondary-button" type="button">Export Evidence CSV</button>
            <button className="secondary-button" type="button" onClick={onRefresh}>Refresh Data</button>
          </div>
        </div>

        <div className="reports-summary-card">
          <h3>Report Contents</h3>
          <p>{selectedReport.description}</p>
          <div className="history-stack">
            {summaryLines.map((line) => (
              <div key={line} className="history-subtext">{line}</div>
            ))}
          </div>
        </div>
      </div>

      {filteredHistory.length === 0 ? (
        <div className="empty-state">
          <h3>No report data available</h3>
          <p>Select a project or change the date range to prepare a dissertation-ready report export.</p>
          <button className="secondary-button" type="button" onClick={onRefresh}>Refresh</button>
        </div>
      ) : (
        <div className="research-note">
          <h3>Report Preview</h3>
          <p>
            This report will include analysed requirements, human validation outcomes, and evaluation evidence
            for the selected scope. PDF export can be added in a later phase without changing this workflow.
          </p>
        </div>
      )}
    </section>
  );
}
