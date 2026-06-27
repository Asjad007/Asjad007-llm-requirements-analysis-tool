const menuSections = [
  { title: 'Main', items: [
    { key: 'dashboard', label: 'Dashboard', icon: 'D' },
    { key: 'projects', label: 'Projects', icon: 'P' },
    { key: 'requirements', label: 'Requirements', icon: 'R' },
    { key: 'upload', label: 'Upload Requirements', icon: 'U' }
  ]},
  { title: 'Analysis', items: [
    { key: 'classification', label: 'Classification', icon: 'C' },
    { key: 'prioritisation', label: 'Prioritisation', icon: 'P' },
    { key: 'ambiguity', label: 'Ambiguity Detection', icon: '!' },
    { key: 'acceptance', label: 'Acceptance Criteria', icon: 'A' },
    { key: 'testcases', label: 'Test Case Generation', icon: 'T' }
  ]},
  { title: 'Reviews', items: [
    { key: 'validation', label: 'Human Validation', icon: 'V' },
    { key: 'history', label: 'Review History', icon: 'H' }
  ]},
  { title: 'Evaluation', items: [
    { key: 'evaluation', label: 'Evaluation Metrics', icon: 'E' },
    { key: 'reports', label: 'Reports', icon: 'Rp' },
    { key: 'reference', label: 'Reference Dataset', icon: 'G' }
  ]},
  { title: 'Other', items: [
    { key: 'settings', label: 'Settings', icon: 'S' }
  ]}
];

export default function Sidebar({ activePage, onNavigate }) {
  return (
    <aside className="sidebar">
      <div className="brand">
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
