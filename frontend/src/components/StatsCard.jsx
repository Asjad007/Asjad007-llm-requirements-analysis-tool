export default function StatsCard({ title, value, subtitle, icon, tone = 'purple' }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${tone}`}>{icon}</div>
      <div>
        <p>{title}</p>
        <strong>{value}</strong>
        <span>{subtitle}</span>
      </div>
    </div>
  );
}