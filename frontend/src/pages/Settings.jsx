export default function Settings() {
  return (
    <section className="panel page-panel">
      <div className="module-header">
        <div><span className="module-kicker">Configuration</span><h2>Settings</h2><p>Security and model configuration should be handled through environment variables and protected backend settings.</p></div>
      </div>
      <div className="settings-grid">
        <div className="settings-card"><h3>LLM Provider</h3><p>OpenAI / Mock fallback configured through backend environment variables.</p></div>
        <div className="settings-card"><h3>Security</h3><p>API keys are excluded from GitHub using .gitignore and should never be committed.</p></div>
        <div className="settings-card"><h3>Future Authentication</h3><p>Login, JWT, user roles, and protected review workflows can be added in the next increment.</p></div>
      </div>
    </section>
  );
}