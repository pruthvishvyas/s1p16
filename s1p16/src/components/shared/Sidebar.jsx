import { NavLink } from 'react-router-dom'
import { PROJECT } from '../../utils/contract.js'
import { TABS, OUTCOME_ORDER, OUTCOME_HINT } from '../../utils/tabs.js'

export function Sidebar({ open, onNavigate }) {
  return (
    <aside className={'sidebar' + (open ? ' sidebar--open' : '')}>
      <div className="sidebar-brand">
        <div className="sidebar-title">{PROJECT.name}</div>
        <div className="sidebar-sub">{String(PROJECT.domain || '').replace(/_/g, ' ')}</div>
      </div>
      <nav className="sidebar-nav">
        {OUTCOME_ORDER.map((o) => (
          <div key={o} className="nav-group">
            <div className="nav-group-title">
              {o === 'TOOLS' ? 'TOOLS' : o}
              <span>{OUTCOME_HINT[o]}</span>
            </div>
            {TABS.filter((t) => t.outcome === o).map((t) => (
              <NavLink key={t.id} to={'/' + t.id} onClick={onNavigate} className={({ isActive }) => 'nav-item' + (isActive ? ' nav-item--active' : '')}>
                {t.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  )
}
