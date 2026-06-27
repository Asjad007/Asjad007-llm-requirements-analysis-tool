import { useMemo, useState } from "react";
import AppDataTable from "../components/AppDataTable";
import { REVIEW_STATUSES, normalizeReviewStatus } from "../utils/reviewStatuses";
import {
  FIELD_REVIEW_KEYS,
  FIELD_REVIEW_LABELS,
  normalizeFieldReviewDecisions,
} from "../utils/fieldReviewDecisions";
import { buildReferenceComparison } from "../utils/referenceDatasetMetrics";

function formatPercent(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "Not available";
  return `${Math.round(value * 100)}%`;
}

function formatCountRate(count, denominator) {
  if (!denominator) return "0%";
  return formatPercent(count / denominator);
}

function formatConfidenceValue(values) {
  if (!values.length) return "Not enough data";
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  return `${Math.round(average * 100)}%`;
}

function getNumericConfidence(item) {
  const value = Number(item?.confidence_score);
  return Number.isFinite(value) ? value : null;
}

function inferEvaluationFieldDecisions(item) {
  const explicit = normalizeFieldReviewDecisions(item?.field_level_decisions);
  const hasExplicit = FIELD_REVIEW_KEYS.some((key) => explicit[key]);

  if (hasExplicit) return explicit;

  const overallDecision = normalizeReviewStatus(item?.review_decision);

  if (overallDecision === REVIEW_STATUSES.ACCEPTED) {
    return FIELD_REVIEW_KEYS.reduce((accumulator, key) => {
      accumulator[key] = REVIEW_STATUSES.ACCEPTED;
      return accumulator;
    }, {});
  }

  if (overallDecision === REVIEW_STATUSES.MODIFIED) {
    return {
      classification: item?.final_type
        ? normalizeValue(item.requirement_type) === normalizeValue(item.final_type)
          ? REVIEW_STATUSES.ACCEPTED
          : REVIEW_STATUSES.MODIFIED
        : null,
      priority: item?.final_priority
        ? normalizeValue(item.priority_level) === normalizeValue(item.final_priority)
          ? REVIEW_STATUSES.ACCEPTED
          : REVIEW_STATUSES.MODIFIED
        : null,
      ambiguity: item?.final_ambiguity_status
        ? normalizeValue(item.ambiguity_status) === normalizeValue(item.final_ambiguity_status)
          ? REVIEW_STATUSES.ACCEPTED
          : REVIEW_STATUSES.MODIFIED
        : null,
      acceptance_criteria: canInferTextDecision(item.acceptance_criteria, item.final_acceptance_criteria),
      test_cases: canInferTextDecision(item.test_case, item.final_test_cases),
    };
  }

  return FIELD_REVIEW_KEYS.reduce((accumulator, key) => {
    accumulator[key] = null;
    return accumulator;
  }, {});
}

function normalizeValue(value) {
  return String(value || "").trim().toLowerCase();
}

function canInferTextDecision(originalValue, finalValue) {
  const original = String(originalValue || "").trim();
  const finalText = String(finalValue || "").trim();

  if (!original && !finalText) return REVIEW_STATUSES.ACCEPTED;
  if (!finalText) return null;
  return original === finalText ? REVIEW_STATUSES.ACCEPTED : REVIEW_STATUSES.MODIFIED;
}

function buildInterpretation(interventionSummary, reviewedCount) {
  if (!reviewedCount) {
    return "Human validation metrics will appear here once reviewers begin accepting, modifying, or rejecting analysed requirements.";
  }

  const availableTasks = interventionSummary.filter((item) => item.agreementRate !== null);

  if (!availableTasks.length) {
    return "Field-level review evidence is not yet available for the selected scope, so agreement by Requirements Engineering task cannot be interpreted safely.";
  }

  const highestAgreement = [...availableTasks].sort((left, right) => (right.agreementRate || 0) - (left.agreementRate || 0))[0];
  const lowestAgreement = [...availableTasks].sort((left, right) => (left.agreementRate || 0) - (right.agreementRate || 0))[0];
  const mostIntervention = [...availableTasks].sort((left, right) => right.humanIntervention - left.humanIntervention)[0];

  return `${highestAgreement.label} has the highest human agreement, while ${lowestAgreement.label} required the lowest agreement overall. ${mostIntervention.label} shows the most human intervention in the selected data, suggesting reviewers needed more correction effort there than in other Requirements Engineering outputs.`;
}

export default function Evaluation({ history, referenceEntries = [], onRefresh, projects = [] }) {
  const [projectFilter, setProjectFilter] = useState("");

  const filteredHistory = useMemo(
    () => (
      projectFilter
        ? history.filter((item) => String(item.project_id || "") === String(projectFilter))
        : history
    ),
    [history, projectFilter]
  );
  const filteredReferenceEntries = useMemo(
    () => (
      projectFilter
        ? referenceEntries.filter((item) => String(item.project_id || "") === String(projectFilter))
        : referenceEntries
    ),
    [projectFilter, referenceEntries]
  );

  const metrics = useMemo(() => {
    const totalAnalysed = filteredHistory.length;
    const reviewedItems = filteredHistory.filter((item) => normalizeReviewStatus(item.review_decision) !== REVIEW_STATUSES.PENDING);
    const reviewedCount = reviewedItems.length;
    const acceptedCount = reviewedItems.filter((item) => normalizeReviewStatus(item.review_decision) === REVIEW_STATUSES.ACCEPTED).length;
    const modifiedCount = reviewedItems.filter((item) => normalizeReviewStatus(item.review_decision) === REVIEW_STATUSES.MODIFIED).length;
    const rejectedCount = reviewedItems.filter((item) => normalizeReviewStatus(item.review_decision) === REVIEW_STATUSES.REJECTED).length;
    const pendingCount = totalAnalysed - reviewedCount;
    const confidenceValues = filteredHistory.map(getNumericConfidence).filter((value) => value !== null);
    const averageConfidence = confidenceValues.length
      ? confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length
      : null;

    const fieldSummaries = FIELD_REVIEW_KEYS.map((key) => {
      let accepted = 0;
      let modified = 0;
      let rejected = 0;
      let available = 0;

      reviewedItems.forEach((item) => {
        const decision = inferEvaluationFieldDecisions(item)[key];
        if (!decision) return;

        available += 1;
        if (decision === REVIEW_STATUSES.ACCEPTED) accepted += 1;
        if (decision === REVIEW_STATUSES.MODIFIED) modified += 1;
        if (decision === REVIEW_STATUSES.REJECTED) rejected += 1;
      });

      return {
        key,
        label: FIELD_REVIEW_LABELS[key],
        accepted,
        modified,
        rejected,
        available,
        agreementRate: available ? accepted / available : null,
        modificationRate: available ? modified / available : null,
        rejectionRate: available ? rejected / available : null,
        humanIntervention: modified + rejected,
      };
    });

    const mostAcceptedTask = [...fieldSummaries].filter((item) => item.available).sort((left, right) => right.accepted - left.accepted)[0] || null;
    const mostModifiedTask = [...fieldSummaries].filter((item) => item.available).sort((left, right) => right.modified - left.modified)[0] || null;
    const mostRejectedTask = [...fieldSummaries].filter((item) => item.available).sort((left, right) => right.rejected - left.rejected)[0] || null;
    const highestAgreementTask = [...fieldSummaries].filter((item) => item.agreementRate !== null).sort((left, right) => (right.agreementRate || 0) - (left.agreementRate || 0))[0] || null;
    const lowestAgreementTask = [...fieldSummaries].filter((item) => item.agreementRate !== null).sort((left, right) => (left.agreementRate || 0) - (right.agreementRate || 0))[0] || null;

    const acceptedConfidence = reviewedItems
      .filter((item) => normalizeReviewStatus(item.review_decision) === REVIEW_STATUSES.ACCEPTED)
      .map(getNumericConfidence)
      .filter((value) => value !== null);
    const modifiedConfidence = reviewedItems
      .filter((item) => normalizeReviewStatus(item.review_decision) === REVIEW_STATUSES.MODIFIED)
      .map(getNumericConfidence)
      .filter((value) => value !== null);
    const rejectedConfidence = reviewedItems
      .filter((item) => normalizeReviewStatus(item.review_decision) === REVIEW_STATUSES.REJECTED)
      .map(getNumericConfidence)
      .filter((value) => value !== null);

    const completenessTotal = totalAnalysed || 1;

    return {
      totalAnalysed,
      reviewedCount,
      pendingCount,
      acceptedCount,
      modifiedCount,
      rejectedCount,
      reviewRate: totalAnalysed ? reviewedCount / totalAnalysed : 0,
      acceptanceRate: reviewedCount ? acceptedCount / reviewedCount : 0,
      modificationRate: reviewedCount ? modifiedCount / reviewedCount : 0,
      rejectionRate: reviewedCount ? rejectedCount / reviewedCount : 0,
      averageConfidence,
      fieldSummaries,
      mostAcceptedTask,
      mostModifiedTask,
      mostRejectedTask,
      highestAgreementTask,
      lowestAgreementTask,
      acceptedConfidence: formatConfidenceValue(acceptedConfidence),
      modifiedConfidence: formatConfidenceValue(modifiedConfidence),
      rejectedConfidence: formatConfidenceValue(rejectedConfidence),
      classificationCoverage: filteredHistory.filter((item) => item.requirement_type).length / completenessTotal,
      ambiguityCoverage: filteredHistory.filter((item) => item.ambiguity_status).length / completenessTotal,
      acceptanceCoverage: filteredHistory.filter((item) => item.acceptance_criteria).length / completenessTotal,
      testCaseCoverage: filteredHistory.filter((item) => item.test_case).length / completenessTotal,
    };
  }, [filteredHistory]);

  const fieldMetricColumns = [
    {
      key: "label",
      header: "RE Task",
      width: "18%",
      searchValue: (row) => row.label,
      render: (row) => <strong>{row.label}</strong>,
    },
    {
      key: "accepted",
      header: "Accepted",
      width: "10%",
      searchValue: (row) => String(row.accepted),
    },
    {
      key: "modified",
      header: "Modified",
      width: "10%",
      searchValue: (row) => String(row.modified),
    },
    {
      key: "rejected",
      header: "Rejected",
      width: "10%",
      searchValue: (row) => String(row.rejected),
    },
    {
      key: "agreementRate",
      header: "Agreement Rate",
      width: "17%",
      searchValue: (row) => formatPercent(row.agreementRate),
      render: (row) => (row.available ? formatPercent(row.agreementRate) : "Not available"),
    },
    {
      key: "modificationRate",
      header: "Modification Rate",
      width: "17%",
      searchValue: (row) => formatPercent(row.modificationRate),
      render: (row) => (row.available ? formatPercent(row.modificationRate) : "Not available"),
    },
    {
      key: "rejectionRate",
      header: "Rejection Rate",
      width: "18%",
      searchValue: (row) => formatPercent(row.rejectionRate),
      render: (row) => (row.available ? formatPercent(row.rejectionRate) : "Not available"),
    },
  ];

  const completenessRows = [
    {
      metric: "Classification Coverage",
      value: formatPercent(metrics.classificationCoverage),
      detail: "Analysed requirements that received a type/classification output.",
    },
    {
      metric: "Ambiguity Coverage",
      value: formatPercent(metrics.ambiguityCoverage),
      detail: "Analysed requirements that received an ambiguity judgement.",
    },
    {
      metric: "Acceptance Criteria Coverage",
      value: formatPercent(metrics.acceptanceCoverage),
      detail: "Analysed requirements that received generated acceptance criteria.",
    },
    {
      metric: "Test Case Coverage",
      value: formatPercent(metrics.testCaseCoverage),
      detail: "Analysed requirements that received generated test cases.",
    },
  ];

  const completenessColumns = [
    {
      key: "metric",
      header: "Metric",
      width: "28%",
      searchValue: (row) => row.metric,
      render: (row) => <strong>{row.metric}</strong>,
    },
    {
      key: "value",
      header: "Value",
      width: "16%",
      searchValue: (row) => row.value,
    },
    {
      key: "detail",
      header: "Description",
      width: "56%",
      searchValue: (row) => row.detail,
    },
  ];

  const interventionCards = [
    {
      label: "Most accepted task",
      value: metrics.mostAcceptedTask ? `${metrics.mostAcceptedTask.label} (${metrics.mostAcceptedTask.accepted})` : "Not available",
    },
    {
      label: "Most modified task",
      value: metrics.mostModifiedTask ? `${metrics.mostModifiedTask.label} (${metrics.mostModifiedTask.modified})` : "Not available",
    },
    {
      label: "Most rejected task",
      value: metrics.mostRejectedTask ? `${metrics.mostRejectedTask.label} (${metrics.mostRejectedTask.rejected})` : "Not available",
    },
    {
      label: "Highest human agreement task",
      value: metrics.highestAgreementTask ? `${metrics.highestAgreementTask.label} (${formatPercent(metrics.highestAgreementTask.agreementRate)})` : "Not available",
    },
    {
      label: "Lowest human agreement task",
      value: metrics.lowestAgreementTask ? `${metrics.lowestAgreementTask.label} (${formatPercent(metrics.lowestAgreementTask.agreementRate)})` : "Not available",
    },
  ];
  const referenceComparison = useMemo(
    () => buildReferenceComparison(filteredReferenceEntries, filteredHistory),
    [filteredReferenceEntries, filteredHistory]
  );
  const referenceRows = [
    {
      metric: "Linked reference entries",
      value: referenceComparison.linkedCount,
      detail: "Reference-labelled requirements linked to analysed records in the selected scope.",
    },
    {
      metric: "LLM classification accuracy against reference",
      value: referenceComparison.llmClassification ? formatPercent(referenceComparison.llmClassification.rate) : "Not available",
      detail: "Agreement between LLM-generated classification and manual reference labels.",
    },
    {
      metric: "Human final classification accuracy against reference",
      value: referenceComparison.humanClassification ? formatPercent(referenceComparison.humanClassification.rate) : "Not available",
      detail: "Agreement between human-final classification and manual reference labels.",
    },
    {
      metric: "LLM priority agreement against reference",
      value: referenceComparison.llmPriority ? formatPercent(referenceComparison.llmPriority.rate) : "Not available",
      detail: "Agreement between LLM-generated priority and manual reference labels.",
    },
    {
      metric: "Human final priority agreement against reference",
      value: referenceComparison.humanPriority ? formatPercent(referenceComparison.humanPriority.rate) : "Not available",
      detail: "Agreement between human-final priority and manual reference labels.",
    },
    {
      metric: "LLM ambiguity agreement against reference",
      value: referenceComparison.llmAmbiguity ? formatPercent(referenceComparison.llmAmbiguity.rate) : "Not available",
      detail: "Agreement between LLM-generated ambiguity status and manual reference labels.",
    },
    {
      metric: "Human final ambiguity agreement against reference",
      value: referenceComparison.humanAmbiguity ? formatPercent(referenceComparison.humanAmbiguity.rate) : "Not available",
      detail: "Agreement between human-final ambiguity status and manual reference labels.",
    },
  ];

  return (
    <section className="panel page-panel data-page-panel">
      <div className="module-header">
        <div>
          <span className="module-kicker">Evaluation</span>
          <h2>Human-in-the-Loop Evaluation Metrics</h2>
          <p>Research-focused metrics measuring how often LLM-generated requirements analysis outputs were accepted, modified, or rejected by human reviewers.</p>
        </div>
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

      {!filteredReferenceEntries.length && metrics.totalAnalysed > 0 && (
        <div className="workflow-note-card">
          <strong>Reference comparison is optional</strong>
          <p>No manually labelled reference dataset has been added yet. Human validation evidence is available, but gold-standard comparison requires manual reference labels.</p>
        </div>
      )}

      {metrics.totalAnalysed === 0 ? (
        <div className="empty-state inline-empty-state">
          <h3>No evaluation data is available yet</h3>
          <p>Upload and analyse requirements first.</p>
        </div>
      ) : (
        <>
          <div className="evaluation-grid evaluation-grid-wide">
            <div className="metric-card"><span>Total requirements analysed</span><strong>{metrics.totalAnalysed}</strong><p>All analysed requirements in the selected scope.</p></div>
            <div className="metric-card"><span>Human reviewed count</span><strong>{metrics.reviewedCount}</strong><p>Accepted, modified, or rejected by a reviewer.</p></div>
            <div className="metric-card"><span>Pending review count</span><strong>{metrics.pendingCount}</strong><p>Analysed items still awaiting human validation.</p></div>
            <div className="metric-card"><span>Human review rate</span><strong>{formatPercent(metrics.reviewRate)}</strong><p>Reviewed divided by total analysed.</p></div>
            <div className="metric-card"><span>Overall acceptance rate</span><strong>{formatCountRate(metrics.acceptedCount, metrics.reviewedCount)}</strong><p>Accepted divided by reviewed items.</p></div>
            <div className="metric-card"><span>Overall modification rate</span><strong>{formatCountRate(metrics.modifiedCount, metrics.reviewedCount)}</strong><p>Modified divided by reviewed items.</p></div>
            <div className="metric-card"><span>Overall rejection rate</span><strong>{formatCountRate(metrics.rejectedCount, metrics.reviewedCount)}</strong><p>Rejected divided by reviewed items.</p></div>
            <div className="metric-card"><span>Average LLM confidence</span><strong>{formatPercent(metrics.averageConfidence)}</strong><p>Mean model confidence across analysed items.</p></div>
          </div>

          {metrics.reviewedCount === 0 ? (
            <div className="empty-state inline-empty-state">
              <h3>Human validation is still pending</h3>
              <p>LLM outputs have been generated, but human validation is required before usefulness can be evaluated.</p>
            </div>
          ) : (
            <>
              <div className="page-card data-page-card">
                <div className="page-card-header">
                  <div>
                    <h2>Field-Level Evaluation Metrics</h2>
                    <p>Agreement and intervention rates for each Requirements Engineering output using recorded field-level validation decisions.</p>
                  </div>
                </div>
                <AppDataTable
                  columns={fieldMetricColumns}
                  rows={metrics.fieldSummaries}
                  rowKey={(row) => row.key}
                  onRefresh={onRefresh}
                  searchPlaceholder="Search field-level evaluation metrics..."
                  emptyMessage="No field-level evaluation metrics are available."
                  footerLabel="tasks"
                  containerClassName="metrics-table-shell"
                  bodyHeight="min(42vh, 440px)"
                />
              </div>

              <div className="page-card data-page-card">
                <div className="page-card-header">
                  <div>
                    <h2>Human Intervention Summary</h2>
                    <p>Which Requirements Engineering tasks needed the most reviewer intervention in the selected data.</p>
                  </div>
                </div>
                <div className="evaluation-grid">
                  {interventionCards.map((card) => (
                    <div key={card.label} className="metric-card">
                      <span>{card.label}</span>
                      <strong>{card.value}</strong>
                    </div>
                  ))}
                </div>
              </div>

              <div className="page-card data-page-card">
                <div className="page-card-header">
                  <div>
                    <h2>Confidence by Human Decision</h2>
                    <p>Average model confidence grouped by the final human review outcome.</p>
                  </div>
                </div>
                <div className="evaluation-grid">
                  <div className="metric-card"><span>Accepted items</span><strong>{metrics.acceptedConfidence}</strong><p>Average confidence where outputs were accepted.</p></div>
                  <div className="metric-card"><span>Modified items</span><strong>{metrics.modifiedConfidence}</strong><p>Average confidence where outputs needed reviewer changes.</p></div>
                  <div className="metric-card"><span>Rejected items</span><strong>{metrics.rejectedConfidence}</strong><p>Average confidence where outputs were rejected.</p></div>
                </div>
              </div>

              <div className="research-note">
                <h3>Research interpretation</h3>
                <p>{buildInterpretation(metrics.fieldSummaries, metrics.reviewedCount)}</p>
              </div>

              {filteredReferenceEntries.length > 0 && (
                <div className="page-card data-page-card">
                  <div className="page-card-header">
                    <div>
                      <h2>Reference Dataset Comparison</h2>
                      <p>These metrics are calculated only for requirements linked to manually labelled reference data.</p>
                    </div>
                  </div>
                  <AppDataTable
                    columns={completenessColumns}
                    rows={referenceRows}
                    rowKey={(row) => row.metric}
                    onRefresh={onRefresh}
                    searchPlaceholder="Search reference comparison metrics..."
                    emptyMessage="No reference comparison metrics are available."
                    footerLabel="metrics"
                    containerClassName="metrics-table-shell"
                    bodyHeight="min(32vh, 320px)"
                  />
                </div>
              )}
            </>
          )}

          <div className="page-card data-page-card">
            <div className="page-card-header">
              <div>
                <h2>Output Completeness Metrics</h2>
                <p>Secondary coverage indicators showing whether the LLM produced each output type.</p>
              </div>
            </div>
            <AppDataTable
              columns={completenessColumns}
              rows={completenessRows}
              rowKey={(row) => row.metric}
              onRefresh={onRefresh}
              searchPlaceholder="Search output completeness metrics..."
              emptyMessage="No completeness metrics are available."
              footerLabel="metrics"
              containerClassName="metrics-table-shell"
              bodyHeight="min(28vh, 300px)"
            />
          </div>
        </>
      )}
    </section>
  );
}
