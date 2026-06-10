import { useState } from 'react';
import Analyse from './pages/Analyse';
import History from './pages/History';

function App() {
  const [page, setPage] = useState('analyse');
  return <div className="app"><header className="topbar"><div><h1>LLM-Assisted Requirements Analysis Tool</h1><p>MVP prototype with human-in-the-loop validation</p></div><nav><button className={page === 'analyse' ? 'nav-active' : 'nav-button'} onClick={() => setPage('analyse')}>Analyse</button><button className={page === 'history' ? 'nav-active' : 'nav-button'} onClick={() => setPage('history')}>History</button></nav></header>{page === 'analyse' ? <Analyse /> : <History />}</div>;
}
export default App;
