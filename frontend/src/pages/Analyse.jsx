import { useState } from 'react';
import RequirementInput from '../components/RequirementInput';
import ResultCard from '../components/ResultCard';
import { analyseRequirement } from '../services/api';

function Analyse() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const handleAnalyse = async (text) => {
    try { setLoading(true); setError(''); setResult(null); setResult(await analyseRequirement(text)); }
    catch (err) { setError(err.message || 'Analysis failed.'); }
    finally { setLoading(false); }
  };
  return <main className="page"><RequirementInput onAnalyse={handleAnalyse} loading={loading} />{error && <div className="error">{error}</div>}{result && <ResultCard result={result} />}</main>;
}
export default Analyse;
