export default function Topbar({ title }) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="icon-button" aria-label="Open navigation">☰</button>
        <h2>{title}</h2>
      </div>
      <div className="topbar-actions">
        <div className="user-chip">
          <div className="avatar">AA</div>
          <div>
            <strong>Asjad Ali</strong>
            <small>Analyst</small>
          </div>
        </div>
      </div>
    </header>
  );
}
