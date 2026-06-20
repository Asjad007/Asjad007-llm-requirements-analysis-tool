import RequirementsTable from '../components/RequirementsTable';

export default function Requirements({ title, subtitle, history, isLoading, error, onRefresh }) {
  return (
    <section className="panel page-panel">
      <div className="panel-title-row">
        <div><h2>{title}</h2><p>{subtitle}</p></div>
        <button className="primary-outline" onClick={onRefresh}>{isLoading ? 'Refreshing...' : 'Refresh'}</button>
      </div>
      {error && <div className="error-message">{error}</div>}
      <RequirementsTable history={history} onRefresh={onRefresh} />
    </section>
  );
}