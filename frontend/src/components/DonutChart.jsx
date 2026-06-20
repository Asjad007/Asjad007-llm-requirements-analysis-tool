function percent(value, total) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

export default function DonutChart({ title, items }) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  let current = 0;
  const segments = items.map((item) => {
    const start = current;
    const size = total ? (item.value / total) * 100 : 0;
    current += size;
    return `${item.color} ${start}% ${current}%`;
  }).join(', ');

  return (
    <section className="panel chart-panel">
      <h3>{title}</h3>
      <div className="chart-layout">
        <div className="donut" style={{ background: total ? `conic-gradient(${segments})` : '#eef2f7' }}>
          <div className="donut-hole">{total}</div>
        </div>
        <div className="legend">
          {items.map((item) => (
            <div className="legend-row" key={item.label}>
              <span className="legend-dot" style={{ background: item.color }} />
              <span>{item.label}</span>
              <strong>{item.value} ({percent(item.value, total)}%)</strong>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}