import { useState } from 'react'
import { useInsights } from '../../hooks/decide/useInsights.js'
import { validateInsights } from '../../utils/dataValidator.js'
import { fmtMoney } from '../../utils/formatters.js'
import { DataBoundary } from '../shared/DataBoundary.jsx'
import { SeverityBadge } from '../shared/SeverityBadge.jsx'

export function InsightCards() {
  const { data: raw, loading, error } = useInsights()
  const { valid, data } = validateInsights(raw)
  const [filter, setFilter] = useState('ALL')
  const list = data.filter((i) => filter === 'ALL' || String(i.severity).toUpperCase() === filter)
  return (
    <DataBoundary loading={loading} error={error} valid={valid} what="insights">
      <div className="pill-row">
        {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map((s) => (
          <button key={s} className={'pill' + (filter === s ? ' pill--active' : '')} onClick={() => setFilter(s)}>
            {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()} ({s === 'ALL' ? data.length : data.filter((i) => String(i.severity).toUpperCase() === s).length})
          </button>
        ))}
      </div>
      <div className="stack">
        {list.map((i, n) => (
          <article key={n} className={'card insight insight--' + String(i.severity).toLowerCase()}>
            <div className="insight-head">
              <SeverityBadge level={i.severity} />
              <span className="insight-cat">{i.category}</span>
              {typeof i.impact_value === 'number' && i.impact_value > 0 && <span className="insight-impact">Money at stake: {fmtMoney(i.impact_value)}</span>}
            </div>
            <h3 className="insight-finding">{i.finding}</h3>
            {i.evidence && <p className="muted">{i.evidence}</p>}
            {i.action && (
              <p className="insight-action">
                <strong>What to do this week:</strong> {i.action}
              </p>
            )}
          </article>
        ))}
      </div>
    </DataBoundary>
  )
}
