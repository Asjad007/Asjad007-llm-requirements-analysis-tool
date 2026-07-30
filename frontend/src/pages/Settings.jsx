export default function Settings() {
  return (
    <section className="panel page-panel">
      <div className="module-header">
        <div>
          <span className="module-kicker">Configuration</span>
          <h2>Settings</h2>
          <p>Security and model configuration are managed through protected backend environment variables.</p>
        </div>
      </div>

      <div className="settings-grid">
        <div className="settings-card">
          <h3>LLM Provider</h3>
          <p>Mock and OpenAI modes are configured in the backend environment.</p>
        </div>

        <div className="settings-card">
          <h3>Security</h3>
          <p>API keys are not exposed by the frontend and must not be committed to version control.</p>
        </div>

        <div className="settings-card">
          <h3>Prototype Scope</h3>
          <p>Authentication, user roles, and protected multi-user review workflows are not implemented.</p>
        </div>
      </div>
    </section>
  );
}
