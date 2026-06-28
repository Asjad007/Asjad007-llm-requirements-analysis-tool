import { useEffect, useMemo, useState } from "react";
import { FIELD_REVIEW_KEYS, FIELD_REVIEW_LABELS, normalizeFieldReviewDecisions } from "../utils/fieldReviewDecisions";
import { REVIEW_STATUSES, normalizeReviewStatus } from "../utils/reviewStatuses";
import { buildReferenceComparison } from "../utils/referenceDatasetMetrics";

const REPORT_TYPES = [
  {
    id: "project-analysis",
    label: "Project Analysis Report",
    description: "Structured project context, LLM analysis outputs, and a concise overview of decision-support workflow outcomes.",
    sections: ["project", "dataset", "llm", "validation", "confidence", "examples", "interpretation"],
  },
  {
    id: "human-validation",
    label: "Human Validation Report",
    description: "Reviewer decisions, field-level validation evidence, and examples of accepted, modified, and rejected outputs.",
    sections: ["project", "dataset", "validation", "fieldAgreement", "examples", "interpretation"],
  },
  {
    id: "evaluation-summary",
    label: "Evaluation Summary Report",
    description: "Research-focused metrics summarising human agreement, intervention, and confidence patterns.",
    sections: ["project", "dataset", "validation", "fieldAgreement", "confidence", "completeness", "goldStandard", "interpretation"],
  },
  {
    id: "full-evidence",
    label: "Full Dissertation Evidence Report",
    description: "Combined project context, analysis summary, human validation evidence, field-level agreement, and selected examples.",
    sections: ["project", "dataset", "llm", "validation", "fieldAgreement", "confidence", "examples", "completeness", "goldStandard", "interpretation"],
  },
];

const SECTION_OPTIONS = [
  { key: "project", label: "Project Information" },
  { key: "dataset", label: "Dataset Summary" },
  { key: "llm", label: "LLM Analysis Summary" },
  { key: "validation", label: "Human Validation Summary" },
  { key: "fieldAgreement", label: "Field-Level Human Agreement" },
  { key: "confidence", label: "Confidence Analysis" },
  { key: "examples", label: "Evidence Examples" },
  { key: "completeness", label: "Output Completeness Metrics" },
  { key: "goldStandard", label: "Gold Standard Comparison" },
  { key: "interpretation", label: "Research Interpretation" },
];

function formatPercent(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "Not available";
  return `${Math.round(value * 100)}%`;
}

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeValue(value) {
  return normalizeText(value).toLowerCase();
}

function getNumericConfidence(item) {
  const value = Number(item?.confidence_score);
  return Number.isFinite(value) ? value : null;
}

function getRefinedAnalysisId(item) {
  return (
    item?.refined_analysis_result_id ||
    item?.refined_analysis_id ||
    item?.modified_analysis_id ||
    item?.modified_into_analysis_id ||
    null
  );
}

function averageConfidence(items) {
  const values = items.map(getNumericConfidence).filter((value) => value !== null);
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function summarizeByKey(items, getter) {
  return items.reduce((accumulator, item) => {
    const key = getter(item);
    if (!key) return accumulator;
    accumulator[key] = (accumulator[key] || 0) + 1;
    return accumulator;
  }, {});
}

function formatBreakdown(breakdown) {
  const entries = Object.entries(breakdown || {});
  if (!entries.length) return "Not available";
  return entries
    .sort((left, right) => right[1] - left[1])
    .map(([label, count]) => `${label}: ${count}`)
    .join(" | ");
}

function canInferTextDecision(originalValue, finalValue) {
  const original = normalizeText(originalValue);
  const finalText = normalizeText(finalValue);

  if (!original && !finalText) return REVIEW_STATUSES.ACCEPTED;
  if (!finalText) return null;
  return original === finalText ? REVIEW_STATUSES.ACCEPTED : REVIEW_STATUSES.MODIFIED;
}

function inferFieldDecisionSummary(item) {
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

  if (overallDecision === REVIEW_STATUSES.REJECTED) {
    return FIELD_REVIEW_KEYS.reduce((accumulator, key) => {
      accumulator[key] = REVIEW_STATUSES.REJECTED;
      return accumulator;
    }, {});
  }

  return FIELD_REVIEW_KEYS.reduce((accumulator, key) => {
    accumulator[key] = null;
    return accumulator;
  }, {});
}

function buildInterpretation(reportData) {
  if (!reportData.reviewedCount) {
    return "LLM analysis data is available, but human validation is required before evaluation evidence can be reported.";
  }

  const availableFields = reportData.fieldAgreement.filter((item) => item.agreementRate !== null);

  if (!availableFields.length) {
    return "Human review decisions are available, but field-level validation evidence is not yet sufficient to interpret agreement by Requirements Engineering task safely.";
  }

  const agreementRates = availableFields.map((item) => item.agreementRate);
  const interventionCounts = availableFields.map((item) => item.humanIntervention);

  const allAgreementEqual = agreementRates.every((rate) => rate === agreementRates[0]);
  const allInterventionEqual = interventionCounts.every((count) => count === interventionCounts[0]);

  const referenceNote = reportData.referenceComparison?.linkedCount
    ? ` Gold-standard comparison is available for ${reportData.referenceComparison.linkedCount} linked reference entries and should be interpreted as alignment with manual reference labels rather than a claim of full correctness.`
    : "";

  if (allAgreementEqual && allInterventionEqual) {
    const first = availableFields[0];

    return `All Requirements Engineering output fields show the same validation pattern in the selected dataset: ${formatPercent(
      first.agreementRate
    )} accepted/agreed, ${formatPercent(
      first.modificationRate
    )} modified, and ${formatPercent(
      first.rejectionRate
    )} rejected. This indicates that the LLM produced complete outputs, but human reviewers still made meaningful corrections to improve requirement quality.${referenceNote}`;
  }

  const highestAgreement = [...availableFields].sort(
    (left, right) => (right.agreementRate || 0) - (left.agreementRate || 0)
  )[0];

  const lowestAgreement = [...availableFields].sort(
    (left, right) => (left.agreementRate || 0) - (right.agreementRate || 0)
  )[0];

  const mostIntervention = [...availableFields].sort(
    (left, right) => right.humanIntervention - left.humanIntervention
  )[0];

  return `${highestAgreement.label} has the highest human agreement, while ${lowestAgreement.label} shows the lowest agreement overall. ${mostIntervention.label} shows the most human intervention in the selected data, suggesting reviewers needed more correction effort there than in other Requirements Engineering outputs.${referenceNote}`;
}

function ReportSection({ title, children }) {
  return (
    <section className="report-preview-section">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

function ReportMetricList({ items }) {
  return (
    <div className="report-metric-grid">
      {items.map((item) => (
        <div key={item.label} className="report-metric-card">
          <span>{item.label}</span>
          <strong>{item.value}</strong>
          {item.description && <p>{item.description}</p>}
        </div>
      ))}
    </div>
  );
}

function EvidenceCard({ item }) {
  const decision = normalizeReviewStatus(item.review_decision);
  const llmSummary = [
    item.requirement_type ? `Type: ${item.requirement_type}` : null,
    item.priority_level ? `Priority: ${item.priority_level}` : null,
    item.ambiguity_status ? `Ambiguity: ${item.ambiguity_status}` : null,
    getNumericConfidence(item) !== null ? `Confidence: ${Math.round(Number(item.confidence_score) * 100)}%` : null,
  ]
    .filter(Boolean)
    .join(" | ");

  return (
    <article className="report-example-card">
      <div className="report-example-header">
        <strong>{`REQ-${String(item.analysis_id).padStart(3, "0")}`}</strong>
        <span className="history-subtext">{decision}</span>
      </div>

      <p>
        <strong>Original requirement:</strong> {item.original_text}
      </p>

      <p>
        <strong>LLM output summary:</strong> {llmSummary || "Not available"}
      </p>

      {decision === REVIEW_STATUSES.MODIFIED && (
        <p>
          <strong>Human final output:</strong> {item.final_refined_requirement || "Not available"}
        </p>
      )}

      {decision === REVIEW_STATUSES.ACCEPTED && (
        <p>
          <strong>Human final output:</strong> Accepted as generated.
        </p>
      )}

      <p>
        <strong>{decision === REVIEW_STATUSES.REJECTED ? "Rejection reason" : "Reviewer notes"}:</strong>{" "}
        {item.rejection_reason || item.reviewer_notes || item.review_notes || "Not available"}
      </p>
    </article>
  );
}

export default function Reports({ history, referenceEntries = [], projects = [], onRefresh }) {
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [reportType, setReportType] = useState(REPORT_TYPES[0].id);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [includedSections, setIncludedSections] = useState(REPORT_TYPES[0].sections);

  useEffect(() => {
    const nextReportType = REPORT_TYPES.find((report) => report.id === reportType) || REPORT_TYPES[0];
    setIncludedSections(nextReportType.sections);
  }, [reportType]);

  const selectedProject = projects.find((project) => String(project.id) === String(selectedProjectId));
  const selectedReport = REPORT_TYPES.find((report) => report.id === reportType) || REPORT_TYPES[0];

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

  const refinedAnalysisIds = useMemo(() => {
    const ids = new Set();

    filteredHistory.forEach((item) => {
      const refinedId = getRefinedAnalysisId(item);
      if (refinedId) {
        ids.add(Number(refinedId));
      }
    });

    return ids;
  }, [filteredHistory]);

  const validationHistory = useMemo(() => {
    return filteredHistory.filter((item) => {
      const analysisId = Number(item.analysis_id || item.id);
      return !refinedAnalysisIds.has(analysisId);
    });
  }, [filteredHistory, refinedAnalysisIds]);

  const filteredReferenceEntries = useMemo(() => {
    return referenceEntries.filter((item) => {
      const matchesProject = selectedProjectId ? String(item.project_id || "") === String(selectedProjectId) : true;
      const itemDate = item.updated_at || item.created_at;
      const dateValue = itemDate ? new Date(itemDate) : null;
      const matchesFrom = dateFrom && dateValue ? dateValue >= new Date(dateFrom) : true;
      const matchesTo = dateTo && dateValue ? dateValue <= new Date(`${dateTo}T23:59:59`) : true;
      return matchesProject && matchesFrom && matchesTo;
    });
  }, [dateFrom, dateTo, referenceEntries, selectedProjectId]);

  const reportData = useMemo(() => {
    const totalAnalysed = filteredHistory.length;
    const totalValidationItems = validationHistory.length;

    const reviewedItems = validationHistory.filter(
      (item) => normalizeReviewStatus(item.review_decision) !== REVIEW_STATUSES.PENDING
    );

    const pendingItems = validationHistory.filter(
      (item) => normalizeReviewStatus(item.review_decision) === REVIEW_STATUSES.PENDING
    );

    const acceptedItems = reviewedItems.filter(
      (item) => normalizeReviewStatus(item.review_decision) === REVIEW_STATUSES.ACCEPTED
    );

    const modifiedItems = reviewedItems.filter(
      (item) => normalizeReviewStatus(item.review_decision) === REVIEW_STATUSES.MODIFIED
    );

    const rejectedItems = reviewedItems.filter(
      (item) => normalizeReviewStatus(item.review_decision) === REVIEW_STATUSES.REJECTED
    );

    const reviewedCount = reviewedItems.length;
    const acceptedCount = acceptedItems.length;
    const modifiedCount = modifiedItems.length;
    const rejectedCount = rejectedItems.length;
    const pendingCount = pendingItems.length;

    const fieldAgreement = FIELD_REVIEW_KEYS.map((key) => {
      let accepted = 0;
      let modified = 0;
      let rejected = 0;
      let available = 0;

      reviewedItems.forEach((item) => {
        const decision = inferFieldDecisionSummary(item)[key];
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

    const referenceComparison = buildReferenceComparison(filteredReferenceEntries, filteredHistory);

    return {
      generatedAt: new Date().toLocaleString(),
      totalAnalysed,
      totalValidationItems,
      reviewedCount,
      pendingCount,
      acceptedCount,
      modifiedCount,
      rejectedCount,
      reviewRate: totalValidationItems ? reviewedCount / totalValidationItems : 0,
      acceptanceRate: reviewedCount ? acceptedCount / reviewedCount : 0,
      modificationRate: reviewedCount ? modifiedCount / reviewedCount : 0,
      rejectionRate: reviewedCount ? rejectedCount / reviewedCount : 0,
      averageConfidence: averageConfidence(filteredHistory),
      acceptedConfidence: averageConfidence(acceptedItems),
      modifiedConfidence: averageConfidence(modifiedItems),
      rejectedConfidence: averageConfidence(rejectedItems),
      typeBreakdown: summarizeByKey(filteredHistory, (item) => normalizeText(item.requirement_type)),
      priorityBreakdown: summarizeByKey(filteredHistory, (item) => normalizeText(item.priority_level)),
      clarityBreakdown: {
        Clear: filteredHistory.filter((item) => normalizeValue(item.ambiguity_status).includes("clear")).length,
        Ambiguous: filteredHistory.filter((item) => normalizeValue(item.ambiguity_status).includes("ambiguous")).length,
      },
      fieldAgreement,
      acceptedExamples: acceptedItems.slice(0, 3),
      modifiedExamples: modifiedItems.slice(0, 3),
      rejectedExamples: rejectedItems.slice(0, 3),
      completeness: {
        classification: totalAnalysed ? filteredHistory.filter((item) => item.requirement_type).length / totalAnalysed : 0,
        ambiguity: totalAnalysed ? filteredHistory.filter((item) => item.ambiguity_status).length / totalAnalysed : 0,
        acceptanceCriteria: totalAnalysed ? filteredHistory.filter((item) => item.acceptance_criteria).length / totalAnalysed : 0,
        testCases: totalAnalysed ? filteredHistory.filter((item) => item.test_case).length / totalAnalysed : 0,
      },
      referenceComparison,
    };
  }, [filteredHistory, validationHistory, filteredReferenceEntries]);

  const sectionEnabled = (key) => includedSections.includes(key);

  function toggleSection(key) {
    setIncludedSections((previous) =>
      previous.includes(key)
        ? previous.filter((value) => value !== key)
        : [...previous, key]
    );
  }

  const summaryLines = [
    selectedProject ? `Project: ${selectedProject.name}` : "Project: All projects",
    `Report type: ${selectedReport.label}`,
    dateFrom || dateTo ? `Date filter: ${dateFrom || "Start"} to ${dateTo || "Now"}` : "Date filter: All available records",
    `Included analysis records: ${filteredHistory.length}`,
    `Reviewer-facing validation items: ${validationHistory.length}`,
    `Included sections: ${includedSections.length}`,
  ];

  return (
    <section className="panel page-panel data-page-panel">
      <div className="module-header">
        <div>
          <span className="module-kicker">Reports</span>
          <h2>Research Reports</h2>
          <p>Generate dissertation-ready reports summarising LLM analysis outputs, human validation decisions, and evaluation evidence.</p>
        </div>
      </div>

      <div className="reports-layout report-controls">
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

          <div className="report-section-checkboxes">
            {SECTION_OPTIONS.map((section) => (
              <label key={section.key} className="review-checkbox-item">
                <input
                  type="checkbox"
                  checked={includedSections.includes(section.key)}
                  onChange={() => toggleSection(section.key)}
                />
                <span>{section.label}</span>
              </label>
            ))}
          </div>

          <div className="reports-action-row">
            <button className="primary-button" type="button" onClick={() => window.print()}>
              Print / Save as PDF
            </button>
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
        <div className="empty-state inline-empty-state">
          <h3>No report data is available yet</h3>
          <p>Upload and analyse requirements first.</p>
          <button className="secondary-button report-controls" type="button" onClick={onRefresh}>Refresh</button>
        </div>
      ) : (
        <div className="report-preview-shell">
          {!filteredReferenceEntries.length && (
            <div className="workflow-note-card">
              <strong>Gold-standard comparison is optional</strong>
              <p>No manually labelled reference dataset has been added yet for this report scope. Human validation evidence is still included, while reference comparison remains unavailable until manual reference labels are added.</p>
            </div>
          )}

          <div className="report-preview-header">
            <div>
              <h3>{selectedReport.label}</h3>
              <p>Dissertation-style evidence preview generated from the current project, requirement, analysis, and review data.</p>
            </div>
            <span className="badge badge-blue">{reportData.generatedAt}</span>
          </div>

          {sectionEnabled("project") && (
            <ReportSection title="A. Project Information">
              <ReportMetricList
                items={[
                  { label: "Project name", value: selectedProject?.name || "All projects" },
                  { label: "Description", value: selectedProject?.description || "Combined dataset across all projects." },
                  { label: "Domain / system type", value: selectedProject?.domain_system_type || "Multiple domains / not specified" },
                  { label: "Validation items", value: reportData.totalValidationItems },
                  { label: "Total analysed records", value: reportData.totalAnalysed },
                  { label: "Report generated date", value: reportData.generatedAt },
                ]}
              />
            </ReportSection>
          )}

          {sectionEnabled("dataset") && (
            <ReportSection title="B. Dataset Summary">
              <ReportMetricList
                items={[
                  { label: "Total analysed records", value: reportData.totalAnalysed },
                  { label: "Reviewer-facing validation items", value: reportData.totalValidationItems },
                  { label: "Reviewed validation items", value: reportData.reviewedCount },
                  { label: "Pending validation items", value: reportData.pendingCount },
                  { label: "Accepted", value: reportData.acceptedCount },
                  { label: "Modified", value: reportData.modifiedCount },
                  { label: "Rejected", value: reportData.rejectedCount },
                ]}
              />
            </ReportSection>
          )}

          {sectionEnabled("llm") && (
            <ReportSection title="C. LLM Analysis Summary">
              <ReportMetricList
                items={[
                  { label: "Requirements by type", value: formatBreakdown(reportData.typeBreakdown) },
                  { label: "Requirements by priority", value: formatBreakdown(reportData.priorityBreakdown) },
                  { label: "Clear vs ambiguous requirements", value: formatBreakdown(reportData.clarityBreakdown) },
                  { label: "Average confidence", value: formatPercent(reportData.averageConfidence) },
                ]}
              />
            </ReportSection>
          )}

          {reportData.reviewedCount === 0 ? (
            <div className="empty-state inline-empty-state">
              <h3>Human validation evidence is not available yet</h3>
              <p>LLM analysis data is available, but human validation is required before evaluation evidence can be reported.</p>
            </div>
          ) : (
            <>
              {sectionEnabled("validation") && (
                <ReportSection title="D. Human Validation Summary">
                  <ReportMetricList
                    items={[
                      { label: "Acceptance rate", value: formatPercent(reportData.acceptanceRate) },
                      { label: "Modification rate", value: formatPercent(reportData.modificationRate) },
                      { label: "Rejection rate", value: formatPercent(reportData.rejectionRate) },
                      { label: "Human review rate", value: formatPercent(reportData.reviewRate) },
                    ]}
                  />
                </ReportSection>
              )}

              {sectionEnabled("fieldAgreement") && (
                <ReportSection title="E. Field-Level Human Agreement">
                  <div className="report-simple-table">
                    <div className="report-simple-row report-simple-header">
                      <span>Field</span>
                      <span>Accepted</span>
                      <span>Modified</span>
                      <span>Rejected</span>
                      <span>Agreement rate</span>
                    </div>

                    {reportData.fieldAgreement.map((field) => (
                      <div key={field.key} className="report-simple-row">
                        <span>{field.label}</span>
                        <span>{field.accepted}</span>
                        <span>{field.modified}</span>
                        <span>{field.rejected}</span>
                        <span>{field.available ? formatPercent(field.agreementRate) : "Not available"}</span>
                      </div>
                    ))}
                  </div>
                </ReportSection>
              )}

              {sectionEnabled("confidence") && (
                <ReportSection title="F. Confidence Analysis">
                  <ReportMetricList
                    items={[
                      { label: "Average confidence for accepted items", value: formatPercent(reportData.acceptedConfidence) },
                      { label: "Average confidence for modified items", value: formatPercent(reportData.modifiedConfidence) },
                      { label: "Average confidence for rejected items", value: formatPercent(reportData.rejectedConfidence) },
                    ].map((item) => ({
                      ...item,
                      value: item.value === "Not available" ? "Not enough data" : item.value,
                    }))}
                  />
                </ReportSection>
              )}

              {sectionEnabled("examples") && (
                <ReportSection title="G. Evidence Examples">
                  <div className="report-examples-stack">
                    <div>
                      <h4>Accepted examples</h4>
                      <div className="report-evidence-grid">
                        {reportData.acceptedExamples.length
                          ? reportData.acceptedExamples.map((item) => <EvidenceCard key={`accepted-${item.analysis_id}`} item={item} />)
                          : <p className="history-subtext">No accepted examples are available in the selected scope.</p>}
                      </div>
                    </div>

                    <div>
                      <h4>Modified examples</h4>
                      <div className="report-evidence-grid">
                        {reportData.modifiedExamples.length
                          ? reportData.modifiedExamples.map((item) => <EvidenceCard key={`modified-${item.analysis_id}`} item={item} />)
                          : <p className="history-subtext">No modified examples are available in the selected scope.</p>}
                      </div>
                    </div>

                    <div>
                      <h4>Rejected examples</h4>
                      <div className="report-evidence-grid">
                        {reportData.rejectedExamples.length
                          ? reportData.rejectedExamples.map((item) => <EvidenceCard key={`rejected-${item.analysis_id}`} item={item} />)
                          : <p className="history-subtext">No rejected examples are available in the selected scope.</p>}
                      </div>
                    </div>
                  </div>
                </ReportSection>
              )}

              {sectionEnabled("interpretation") && (
                <ReportSection title="H. Research Interpretation">
                  <p className="report-interpretation-text">{buildInterpretation(reportData)}</p>
                </ReportSection>
              )}
            </>
          )}

          {sectionEnabled("completeness") && (
            <ReportSection title="Output Completeness Metrics">
              <ReportMetricList
                items={[
                  { label: "Classification coverage", value: formatPercent(reportData.completeness.classification) },
                  { label: "Ambiguity coverage", value: formatPercent(reportData.completeness.ambiguity) },
                  { label: "Acceptance criteria coverage", value: formatPercent(reportData.completeness.acceptanceCriteria) },
                  { label: "Test case coverage", value: formatPercent(reportData.completeness.testCases) },
                ]}
              />
            </ReportSection>
          )}

          {sectionEnabled("goldStandard") && filteredReferenceEntries.length > 0 && (
            <ReportSection title="Gold Standard Comparison">
              <p>These comparison metrics are calculated only for requirements linked to manually labelled reference data and should be interpreted as alignment with a manual reference dataset.</p>

              <ReportMetricList
                items={[
                  { label: "Linked reference entries", value: reportData.referenceComparison.linkedCount },
                  { label: "LLM classification accuracy against reference", value: reportData.referenceComparison.llmClassification ? formatPercent(reportData.referenceComparison.llmClassification.rate) : "Not available" },
                  { label: "Human final classification accuracy against reference", value: reportData.referenceComparison.humanClassification ? formatPercent(reportData.referenceComparison.humanClassification.rate) : "Not available" },
                  { label: "LLM priority agreement against reference", value: reportData.referenceComparison.llmPriority ? formatPercent(reportData.referenceComparison.llmPriority.rate) : "Not available" },
                  { label: "Human final priority agreement against reference", value: reportData.referenceComparison.humanPriority ? formatPercent(reportData.referenceComparison.humanPriority.rate) : "Not available" },
                  { label: "LLM ambiguity agreement against reference", value: reportData.referenceComparison.llmAmbiguity ? formatPercent(reportData.referenceComparison.llmAmbiguity.rate) : "Not available" },
                  { label: "Human final ambiguity agreement against reference", value: reportData.referenceComparison.humanAmbiguity ? formatPercent(reportData.referenceComparison.humanAmbiguity.rate) : "Not available" },
                ]}
              />
            </ReportSection>
          )}
        </div>
      )}
    </section>
  );
}