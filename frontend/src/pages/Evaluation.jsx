export default function Evaluation({ title, history, stats }) {
  const total = stats.total || 1;
  const classificationCoverage = Math.round((history.filter((x) => x.requirement_type).length / total) * 100);
  const ambiguityCoverage = Math.round((history.filter((x) => x.ambiguity_status).length / total) * 100);
  const reviewRate = Math.round((stats.reviewed / total) * 100);
  const averageConfidence = Math.round((stats.avgConfidence || 0) * 100);

  return (
    <section className="panel page-panel">
      <div className="module-header">
        <div><span className="module-kicker">Evaluation</span><h2>{title}</h2><p>Evaluation-ready metrics for the dissertation. These measures can later be compared against manually labelled reference requirements.</p></div>
      </div>
      <div className="evaluation-grid">
        <div className="metric-card"><span>Classification Coverage</span><strong>{classificationCoverage}%</strong><p>Requirements receiving a type label.</p></div>
        <div className="metric-card"><span>Ambiguity Detection Coverage</span><strong>{ambiguityCoverage}%</strong><p>Requirements receiving ambiguity judgement.</p></div>
        <div className="metric-card"><span>Human Review Rate</span><strong>{reviewRate}%</strong><p>Outputs accepted, modified, or rejected.</p></div>
        <div className="metric-card"><span>Average Confidence</span><strong>{averageConfidence}%</strong><p>Mean LLM confidence across analysed items.</p></div>
      </div>
      <div className="research-note"><h3>Next evaluation step</h3><p>Add a manual reference dataset and compare generated outputs against expected labels for requirement type, priority, ambiguity, acceptance criteria usefulness, and test case relevance.</p></div>
    </section>
  );
}