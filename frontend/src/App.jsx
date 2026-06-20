import { useEffect, useMemo, useState } from 'react';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Dashboard from './pages/Dashboard';
import Requirements from './pages/Requirements';
import Analyse from './pages/Analyse';
import ModulePage from './pages/ModulePage';
import Validation from './pages/Validation';
import Evaluation from './pages/Evaluation';
import Settings from './pages/Settings';
import { getHistory } from './services/api';
import './styles/main.css';

const MODULES = {
  dashboard: 'Dashboard',
  requirements: 'Requirements',
  upload: 'Upload Requirements',
  classification: 'Classification',
  prioritisation: 'Prioritisation',
  ambiguity: 'Ambiguity Detection',
  acceptance: 'Acceptance Criteria',
  testcases: 'Test Case Generation',
  validation: 'Human Validation',
  history: 'Review History',
  evaluation: 'Evaluation Metrics',
  reports: 'Reports',
  settings: 'Settings'
};

export default function App() {
  const [activePage, setActivePage] = useState('dashboard');
  const [history, setHistory] = useState([]);
  const [historyError, setHistoryError] = useState('');
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  async function refreshHistory() {
    setIsLoadingHistory(true);
    setHistoryError('');
    try {
      const data = await getHistory();
      setHistory(Array.isArray(data) ? data : []);
    } catch (error) {
      setHistoryError(error.message || 'Failed to load requirement history.');
    } finally {
      setIsLoadingHistory(false);
    }
  }

  useEffect(() => {
    refreshHistory();
  }, []);

  const pageTitle = MODULES[activePage] || 'Dashboard';

  const stats = useMemo(() => {
    const total = history.length;
    const functional = history.filter((item) =>
      (item.requirement_type || '').toLowerCase().includes('functional') &&
      !(item.requirement_type || '').toLowerCase().includes('non')
    ).length;
    const nonFunctional = history.filter((item) =>
      (item.requirement_type || '').toLowerCase().includes('non')
    ).length;
    const ambiguous = history.filter((item) =>
      (item.ambiguity_status || '').toLowerCase().includes('ambiguous')
    ).length;
    const high = history.filter((item) => (item.priority_level || '').toLowerCase() === 'high').length;
    const medium = history.filter((item) => (item.priority_level || '').toLowerCase() === 'medium').length;
    const low = history.filter((item) => (item.priority_level || '').toLowerCase() === 'low').length;
    const accepted = history.filter((item) => (item.review_decision || '').toLowerCase() === 'accept').length;
    const modified = history.filter((item) => (item.review_decision || '').toLowerCase() === 'modify').length;
    const rejected = history.filter((item) => (item.review_decision || '').toLowerCase() === 'reject').length;
    const reviewed = accepted + modified + rejected;
    const pending = Math.max(total - reviewed, 0);
    const avgConfidence =
      total > 0 ? history.reduce((sum, item) => sum + Number(item.confidence_score || 0), 0) / total : 0;

    return { total, functional, nonFunctional, ambiguous, high, medium, low, accepted, modified, rejected, reviewed, pending, avgConfidence };
  }, [history]);

  function renderPage() {
    if (activePage === 'dashboard') {
      return <Dashboard history={history} stats={stats} isLoading={isLoadingHistory} error={historyError} onNavigate={setActivePage} onRefresh={refreshHistory} />;
    }

    if (activePage === 'requirements' || activePage === 'history') {
      return (
        <Requirements
          title={activePage === 'history' ? 'Review History' : 'Requirements Repository'}
          subtitle={activePage === 'history' ? 'Saved requirement analysis records with human validation decisions.' : 'Central repository of analysed requirements and structured RE outputs.'}
          history={history}
          isLoading={isLoadingHistory}
          error={historyError}
          onRefresh={refreshHistory}
        />
      );
    }

    if (activePage === 'upload') {
      return <Analyse mode="upload" onAnalysed={refreshHistory} />;
    }

    if (activePage === 'validation') {
      return <Validation history={history} stats={stats} onRefresh={refreshHistory} />;
    }

    if (activePage === 'evaluation' || activePage === 'reports') {
      return <Evaluation title={activePage === 'reports' ? 'Reports' : 'Evaluation Metrics'} history={history} stats={stats} />;
    }

    if (activePage === 'settings') return <Settings />;

    return <ModulePage moduleKey={activePage} title={pageTitle} history={history} onAnalysed={refreshHistory} />;
  }

  return (
    <div className="app-shell">
      <Sidebar activePage={activePage} onNavigate={setActivePage} />
      <main className="main-area">
        <Topbar title={pageTitle} onRefresh={refreshHistory} />
        <div className="page-content">{renderPage()}</div>
      </main>
    </div>
  );
}