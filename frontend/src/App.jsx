import { useEffect, useMemo, useRef, useState } from 'react';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import GlobalLoader from './components/GlobalLoader';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import Requirements from './pages/Requirements';
import Analyse from './pages/Analyse';
import ModulePage from './pages/ModulePage';
import Validation from './pages/Validation';
import Evaluation from './pages/Evaluation';
import Reports from './pages/Reports';
import ReferenceDataset from './pages/ReferenceDataset';
import { getHistory, getProjects, getReferenceDataset } from './services/api';
import { REVIEW_STATUSES, isReviewedStatus, normalizeReviewStatus } from './utils/reviewStatuses';
import './styles/main.css';

const MODULES = {
  dashboard: 'Dashboard',
  projects: 'Projects',
  requirements: 'Requirements',
  upload: 'Upload Requirements',
  classification: 'Classification',
  prioritisation: 'Prioritisation',
  ambiguity: 'Ambiguity Detection',
  acceptance: 'Acceptance Criteria',
  testcases: 'Test Case Generation',
  validation: 'Human Validation',
  history: 'Review History',
  evaluation: 'Human-in-the-Loop Evaluation Metrics',
  reference: 'Reference Dataset',
  reports: 'Research Reports'
};

export default function App() {
  const [activePage, setActivePage] = useState('dashboard');
  const [pendingPage, setPendingPage] = useState(null);
  const [isNavigationLoading, setIsNavigationLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [historyError, setHistoryError] = useState('');
  const [projectsError, setProjectsError] = useState('');
  const [referenceEntries, setReferenceEntries] = useState([]);
  const [referenceError, setReferenceError] = useState('');
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [isLoadingReferenceEntries, setIsLoadingReferenceEntries] = useState(false);
  const navigationFrame = useRef(null);

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

  async function refreshProjects() {
    setIsLoadingProjects(true);
    setProjectsError('');
    try {
      const data = await getProjects();
      const projectList = Array.isArray(data) ? data : [];
      setProjects(projectList);

      if (projectList.length === 0) {
        setSelectedProjectId('');
      } else if (!projectList.some((project) => String(project.id) === String(selectedProjectId))) {
        setSelectedProjectId(String(projectList[0].id));
      }
    } catch (error) {
      setProjectsError(error.message || 'Failed to load projects.');
    } finally {
      setIsLoadingProjects(false);
    }
  }

  async function refreshReferenceEntries() {
    setIsLoadingReferenceEntries(true);
    setReferenceError('');
    try {
      const data = await getReferenceDataset();
      setReferenceEntries(Array.isArray(data) ? data : []);
    } catch (error) {
      setReferenceError(error.message || 'Failed to load reference dataset.');
    } finally {
      setIsLoadingReferenceEntries(false);
    }
  }

  async function refreshAllData() {
    await Promise.all([refreshHistory(), refreshProjects(), refreshReferenceEntries()]);
  }

  useEffect(() => {
    refreshAllData();
  }, []);

  useEffect(() => {
    if (!isNavigationLoading) return undefined;

    navigationFrame.current = window.requestAnimationFrame(() => {
      navigationFrame.current = window.requestAnimationFrame(() => {
        setIsNavigationLoading(false);
        setPendingPage(null);
      });
    });

    return () => {
      if (navigationFrame.current) {
        window.cancelAnimationFrame(navigationFrame.current);
      }
    };
  }, [activePage, isNavigationLoading]);

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
    const accepted = history.filter((item) => normalizeReviewStatus(item.review_decision) === REVIEW_STATUSES.ACCEPTED).length;
    const modified = history.filter((item) => normalizeReviewStatus(item.review_decision) === REVIEW_STATUSES.MODIFIED).length;
    const rejected = history.filter((item) => normalizeReviewStatus(item.review_decision) === REVIEW_STATUSES.REJECTED).length;
    const reviewed = history.filter((item) => isReviewedStatus(item.review_decision)).length;
    const pending = history.filter((item) => normalizeReviewStatus(item.review_decision) === REVIEW_STATUSES.PENDING).length;
    const avgConfidence =
      total > 0 ? history.reduce((sum, item) => sum + Number(item.confidence_score || 0), 0) / total : 0;
    const latestProjectActivity = history.length > 0 ? history[0].project_name || 'Unassigned project' : 'No recent project activity';

    return {
      totalProjects: projects.length,
      total,
      functional,
      nonFunctional,
      ambiguous,
      high,
      medium,
      low,
      accepted,
      modified,
      rejected,
      reviewed,
      pending,
      avgConfidence,
      latestProjectActivity,
    };
  }, [history, projects]);

  function handleNavigate(nextPage) {
    if (!nextPage || nextPage === activePage) return;

    setPendingPage(nextPage);
    setIsNavigationLoading(true);
    setActivePage(nextPage);
  }

  function renderPage() {
    if (activePage === 'dashboard') {
      return <Dashboard history={history} stats={stats} isLoading={isLoadingHistory} error={historyError || projectsError} onNavigate={handleNavigate} onRefresh={refreshAllData} />;
    }

    if (activePage === 'projects') {
      return <Projects projects={projects} isLoading={isLoadingProjects} error={projectsError} onRefresh={refreshProjects} />;
    }

    if (activePage === 'requirements' || activePage === 'history') {
      return (
        <Requirements
          title={activePage === 'history' ? 'Review History' : 'Requirements Repository'}
          subtitle={activePage === 'history' ? 'Audit trail of completed human validation decisions.' : 'Master catalogue of analysed requirements and lifecycle status.'}
          history={history}
          projects={projects}
          isLoading={isLoadingHistory}
          error={historyError || projectsError}
          onRefresh={refreshAllData}
          onNavigate={handleNavigate}
          mode={activePage === 'history' ? 'history' : 'repository'}
        />
      );
    }

    if (activePage === 'upload') {
      return (
        <Analyse
          mode="upload"
          onAnalysed={refreshAllData}
          projects={projects}
          selectedProjectId={selectedProjectId}
          onProjectChange={setSelectedProjectId}
        />
      );
    }

    if (activePage === 'validation') {
      return <Validation history={history} stats={stats} onRefresh={refreshAllData} />;
    }

    if (activePage === 'evaluation') {
      return <Evaluation history={history} referenceEntries={referenceEntries} onRefresh={refreshAllData} projects={projects} />;
    }

    if (activePage === 'reference') {
      return (
        <ReferenceDataset
          references={referenceEntries}
          projects={projects}
          history={history}
          isLoading={isLoadingReferenceEntries}
          error={referenceError}
          onRefresh={refreshAllData}
        />
      );
    }

    if (activePage === 'reports') {
      return <Reports history={history} referenceEntries={referenceEntries} projects={projects} onRefresh={refreshAllData} />;
    }

    return (
      <ModulePage
        moduleKey={activePage}
        history={history}
        onAnalysed={refreshAllData}
      />
    );
  }

  const contentLoaderTitle = MODULES[pendingPage] || MODULES[activePage] || 'Loading';

  return (
    <div className="app-shell">
      <Sidebar activePage={activePage} onNavigate={handleNavigate} />
      <main className="main-area">
        <Topbar title={pageTitle} />
        <div className="page-content page-content-shell">
          <GlobalLoader
            visible={isNavigationLoading}
            title={`Loading ${contentLoaderTitle}`}
            message="Please wait while the selected screen is prepared."
            scope="content"
          />
          {renderPage()}
        </div>
      </main>
    </div>
  );
}
