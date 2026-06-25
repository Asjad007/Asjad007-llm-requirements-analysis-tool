export default function Topbar({ title, onRefresh }) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="icon-button" aria-label="Open navigation">☰</button>
        <h2>{title}</h2>
      </div>
      <div className="topbar-actions">
        {/* <button className="ghost-button" onClick={onRefresh}>Refresh</button> */}
        {/* <button className="icon-button">◐</button> */}
        {/* <button className="notification-button">🔔<span>3</span></button> */}
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
