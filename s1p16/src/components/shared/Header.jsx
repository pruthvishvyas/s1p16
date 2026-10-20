import { ThemeToggle } from './ThemeToggle.jsx'
import { useRunLog } from '../../hooks/shared/useRunLog.js'
import { timeAgo, fmtDate } from '../../utils/formatters.js'

export function Header({ title, outcome, onMenu }) {
  const { data } = useRunLog()
  const last = Array.isArray(data) && data.length ? data[data.length - 1] : null
  const ago = last ? timeAgo(last.run_at) : null
  return (
    <header className="header">
      <button className="menu-btn" onClick={onMenu} aria-label="Open menu">&#9776;</button>
      <div className="header-title">
        {outcome && <span className="header-outcome">{outcome}</span>}
        <h1>{title}</h1>
      </div>
      <div className="header-meta">
        {last && (
          <span className="muted small">
            Last updated {ago || fmtDate(last.run_at)} &middot; data up to {fmtDate(last.data_as_of)}
          </span>
        )}
        <ThemeToggle />
      </div>
    </header>
  )
}
