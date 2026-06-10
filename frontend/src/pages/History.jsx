import { useEffect, useState } from 'react';
import HistoryTable from '../components/HistoryTable';
import { getHistory, deleteHistoryItem } from '../services/api';

function History() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const loadHistory = async () => { try { setError(''); setItems(await getHistory()); } catch (err) { setError(err.message || 'Failed to load history.'); } };
  const handleDelete = async (analysisId) => { try { await deleteHistoryItem(analysisId); await loadHistory(); } catch (err) { setError(err.message || 'Failed to delete item.'); } };
  useEffect(() => { loadHistory(); }, []);
  return <main className="page"><section className="card"><div className="card-header"><h2>Analysis History</h2><p>Saved requirement analysis records and review decisions.</p></div>{error && <div className="error">{error}</div>}<HistoryTable items={items} onDelete={handleDelete} /></section></main>;
}
export default History;
