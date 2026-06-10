import { useState } from 'react';

const SAMPLE_REQUIREMENT = 'The system shall allow users to upload project requirements and receive classification, priority, ambiguity warnings, and test cases.';

function RequirementInput({ onAnalyse, loading }) {
  const [text, setText] = useState(SAMPLE_REQUIREMENT);
  const handleSubmit = (e) => { e.preventDefault(); onAnalyse(text); };
  return (
    <section className="card">
      <div className="card-header"><h2>Requirement Input</h2><p>Enter a software requirement or user story for analysis.</p></div>
      <form onSubmit={handleSubmit}>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={8} placeholder="Example: The system shall allow users to reset their password using email verification." />
        <div className="actions">
          <button type="submit" disabled={loading}>{loading ? 'Analysing...' : 'Analyse Requirement'}</button>
          <button type="button" className="secondary" onClick={() => setText('')} disabled={loading}>Clear</button>
        </div>
      </form>
    </section>
  );
}
export default RequirementInput;
