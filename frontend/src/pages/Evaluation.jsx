import { useMemo, useState } from "react";
import AppDataTable from "../components/AppDataTable";
import { REVIEW_STATUSES, normalizeReviewStatus } from "../utils/reviewStatuses";

function normalizeDecision(value) {
  return normalizeReviewStatus(value);
}

export default function Evaluation({ title, history, stats, onRefresh, projects = [] }) {
  const [projectFilter, setProjectFilter] = useState("");
  const filteredHistory = useMemo(
    () => (
      projectFilter
        ? history.filter((item) => String(item.project_id || "") === String(projectFilter))
        : history
    ),
    [history, projectFilter]
  );
  const filteredTotal = filteredHistory.length || 1;
  const filteredReviewed = filteredHistory.filter((item) => normalizeDecision(item.review_decision) !== REVIEW_STATUSES.PENDING).length;
  const filteredAccepted = filteredHistory.filter((item) => normalizeDecision(item.review_decision) === REVIEW_STATUSES.ACCEPTED).length;
  const filteredModified = filteredHistory.filter((item) => normalizeDecision(item.review_decision) === REVIEW_STATUSES.MODIFIED).length;
  const filteredRejected = filteredHistory.filter((item) => normalizeDecision(item.review_decision) === REVIEW_STATUSES.REJECTED).length;
  const filteredPending = filteredHistory.filter((item) => normalizeDecision(item.review_decision) === REVIEW_STATUSES.PENDING).length;
  const filteredAverageConfidence = Math.round(
    ((filteredHistory.reduce((sum, item) => sum + Number(item.confidence_score || 0), 0) / (filteredHistory.length || 1)) || 0) * 100
  );
  const classificationCoverage = Math.round((filteredHistory.filter((x) => x.requirement_type).length / filteredTotal) * 100);
  const ambiguityCoverage = Math.round((filteredHistory.filter((x) => x.ambiguity_status).length / filteredTotal) * 100);
  const reviewRate = Math.round((filteredReviewed / filteredTotal) * 100);
  const averageConfidence = filteredAverageConfidence;
  const metricRows = [
    {
      metric: "Classification Coverage",
      value: `${classificationCoverage}%`,
      detail: "Requirements receiving a type label.",
    },
    {
      metric: "Ambiguity Detection Coverage",
      value: `${ambiguityCoverage}%`,
      detail: "Requirements receiving ambiguity judgement.",
    },
    {
      metric: "Human Review Rate",
      value: `${reviewRate}%`,
      detail: "Outputs accepted, modified, or rejected.",
    },
    {
      metric: "Average Confidence",
      value: `${averageConfidence}%`,
      detail: "Mean LLM confidence across analysed items.",
    },
    {
      metric: "Accepted Decisions",
      value: filteredAccepted,
      detail: `Items marked ${REVIEW_STATUSES.ACCEPTED}.`,
    },
    {
      metric: "Modified Decisions",
      value: filteredModified,
      detail: `Items marked ${REVIEW_STATUSES.MODIFIED}.`,
    },
    {
      metric: "Rejected Decisions",
      value: filteredRejected,
      detail: `Items marked ${REVIEW_STATUSES.REJECTED}.`,
    },
    {
      metric: "Pending Decisions",
      value: filteredPending,
      detail: `Items still marked ${REVIEW_STATUSES.PENDING}.`,
    },
  ];

  const metricColumns = [
    {
      key: "metric",
      header: "Metric",
      width: "26%",
      searchValue: (row) => row.metric,
      render: (row) => <strong>{row.metric}</strong>,
    },
    {
      key: "value",
      header: "Value",
      width: "14%",
      searchValue: (row) => String(row.value),
    },
    {
      key: "detail",
      header: "Description",
      width: "60%",
      searchValue: (row) => row.detail,
    },
  ];

  return (
    <section className="panel page-panel data-page-panel">
      <div className="module-header">
        <div><span className="module-kicker">Evaluation</span><h2>{title}</h2><p>Evaluation-ready metrics for the dissertation. These measures can later be compared against manually labelled reference requirements.</p></div>
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
      <div className="evaluation-grid">
        <div className="metric-card"><span>Classification Coverage</span><strong>{classificationCoverage}%</strong><p>Requirements receiving a type label.</p></div>
        <div className="metric-card"><span>Ambiguity Detection Coverage</span><strong>{ambiguityCoverage}%</strong><p>Requirements receiving ambiguity judgement.</p></div>
        <div className="metric-card"><span>Human Review Rate</span><strong>{reviewRate}%</strong><p>Outputs accepted, modified, or rejected.</p></div>
        <div className="metric-card"><span>Average Confidence</span><strong>{averageConfidence}%</strong><p>Mean LLM confidence across analysed items.</p></div>
      </div>
      <AppDataTable
        columns={metricColumns}
        rows={metricRows}
        rowKey={(row) => row.metric}
        onRefresh={onRefresh}
        searchPlaceholder={`Search ${title.toLowerCase()} metrics...`}
        emptyMessage="No metrics found."
        footerLabel="metrics"
        containerClassName="metrics-table-shell"
        bodyHeight="min(40vh, 420px)"
      />
      <div className="research-note"><h3>Next evaluation step</h3><p>Add a manual reference dataset and compare generated outputs against expected labels for requirement type, priority, ambiguity, acceptance criteria usefulness, and test case relevance.</p></div>
    </section>
  );
}
