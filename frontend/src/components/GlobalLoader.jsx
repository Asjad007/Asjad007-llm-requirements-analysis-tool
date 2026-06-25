export default function GlobalLoader({ visible, title, message, scope = "viewport" }) {
  if (!visible) return null;

  const overlayClassName =
    scope === "content"
      ? "page-loading-overlay page-loading-overlay-content"
      : "page-loading-overlay";

  return (
    <div className={overlayClassName} role="status" aria-live="polite" aria-busy="true">
      <div className="page-loading-card">
        <span className="page-loading-spinner" aria-hidden="true" />
        <h3>{title}</h3>
        <p>{message}</p>
      </div>
    </div>
  );
}
