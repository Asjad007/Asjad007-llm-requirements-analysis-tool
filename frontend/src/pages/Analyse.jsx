import { useState } from 'react';
import { analyseRequirement } from '../services/api';
import ResultCard from '../components/ResultCard';

export default function Analyse({ mode = 'analyse', onAnalysed }) {
  const [requirementText, setRequirementText] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [isAnalysing, setIsAnalysing] = useState(false);

  async function handleAnalyse() {
    setError('');
    setResult(null);
    if (!requirementText.trim()) {
      setError('Please enter a requirement before analysis.');
      return;
    }
    setIsAnalysing(true);
    try {
      const analysis = await analyseRequirement(requirementText);
      setResult(analysis);
      if (onAnalysed) onAnalysed();
    } catch (err) {
      setError(err.message || 'Failed to analyse requirement.');
    } finally {
      setIsAnalysing(false);
    }
  }

  return (
    <div className="module-page">
      <section className="panel page-panel">
        <div className="module-header">
          <div>
            <span className="module-kicker">{mode === 'upload' ? 'Batch Input' : 'Requirements Analysis'}</span>
            <h2>{mode === 'upload' ? 'Upload Requirements' : 'Requirement Input'}</h2>
            <p>Enter a software requirement or user story. The LLM-assisted pipeline will generate structured RE outputs for review.</p>
          </div>
        </div>
        <textarea className="requirement-textarea" value={requirementText} onChange={(event) => setRequirementText(event.target.value)} placeholder="Example: The system shall allow users to upload PDF requirement documents and automatically generate test cases." />
        <div className="button-row">
          <button className="primary-button" onClick={handleAnalyse} disabled={isAnalysing}>{isAnalysing ? 'Analysing...' : 'Analyse Requirement'}</button>
          <button className="secondary-button" onClick={() => { setRequirementText(''); setResult(null); }}>Clear</button>
        </div>
        {error && <div className="error-message">{error}</div>}
      </section>
      {result && <ResultCard result={result} onReviewSaved={onAnalysed} />}
    </div>
  );
}