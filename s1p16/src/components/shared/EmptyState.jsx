export function EmptyState({ message, action }) {
  return (
    <div className="empty-state">
      <span className="empty-icon" aria-hidden="true">&#9776;</span>
      <p className="empty-message">{message}</p>
      {action && <p className="empty-action">{action}</p>}
    </div>
  )
}
