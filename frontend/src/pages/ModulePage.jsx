import FocusedAnalysisView from './FocusedAnalysisView';

export default function ModulePage({ moduleKey, history, onAnalysed }) {
  return <FocusedAnalysisView moduleKey={moduleKey} history={history} onRefresh={onAnalysed} />;
}
