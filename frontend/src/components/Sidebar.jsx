const menuSections = [
  { title: 'Main', items: [
    { key: 'dashboard', label: 'Dashboard', icon: '⌂' },
    { key: 'requirements', label: 'Requirements', icon: '▤' },
    { key: 'upload', label: 'Upload Requirements', icon: '⇧' }
  ]},
  { title: 'Analysis', items: [
    { key: 'classification', label: 'Classification', icon: '◇' },
    { key: 'prioritisation', label: 'Prioritisation', icon: '◎' },
    { key: 'ambiguity', label: 'Ambiguity Detection', icon: '!' },
    { key: 'acceptance', label: 'Acceptance Criteria', icon: '☑' },
    { key: 'testcases', label: 'Test Case Generation', icon: '✕' }
  ]},
  { title: 'Reviews', items: [
    { key: 'validation', label: 'Human Validation', icon: '✓' },
    { key: 'history', label: 'Review History', icon: '↺' }
  ]},
  { title: 'Evaluation', items: [
    { key: 'evaluation', label: 'Evaluation Metrics', icon: '▥' },
    { key: 'reports', label: 'Reports', icon: '◫' }
  ]},
  { title: 'Other', items: [
    { key: 'settings', label: 'Settings', icon: '⚙' }
  ]}
];

export default function Sidebar({ activePage, onNavigate }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-icon">AI</div>
        <div>
          <h1>LLM-RE</h1>
          <p>Requirements Analysis Tool</p>
        </div>
      </div>
      <nav className="sidebar-nav">
        {menuSections.map((section) => (
          <div className="nav-section" key={section.title}>
            <span className="nav-section-title">{section.title}</span>
            {section.items.map((item) => (
              <button key={item.key} className={`nav-item ${activePage === item.key ? 'active' : ''}`} onClick={() => onNavigate(item.key)}>
                <span className="nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}