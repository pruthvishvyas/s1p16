import { useMemo } from 'react'
import { DIMENSIONS, aggregate } from './explorerModel.js'
import { useExplorer } from './CrossFilterContext.jsx'
import { fmtInt, fmtMoney, fmtPct } from '../../utils/formatters.js'
import { useTerm } from '../shared/TerminologyProvider.jsx'

export function DrillDownPanel({ rows }) {
  const term = useTerm()
  const { selected, setSelected } = useExplorer()
  const subset = useMemo(() => (selected ? rows.filter((r) => String(r[selected.dimension]) === String(selected.value)) : []), [rows, selected])
  if (!selected) return null
  const a = aggregate(subset)
  const dimLabel = (DIMENSIONS.find((d) => d.id === selected.dimension) || {}).label || selected.dimension
  const top = [...subset].sort((x, y) => y.revenue - x.revenue).slice(0, 5)
  const worst = [...subset].filter((r) => r.shipments >= 1).sort((x, y) => x.net_margin_pct - y.net_margin_pct).slice(0, 3)
  return (
    <aside className="drill" role="dialog" aria-label="Details">
      <div className="drill-head">
        <div>
          <div className="muted small">{dimLabel}</div>
          <h3>{selected.value}</h3>
        </div>
        <button className="btn btn--ghost" onClick={() => setSelected(null)} aria-label="Close details">Close &times;</button>
      </div>
      <dl className="drill-list">
        <dt>Total {term('revenue', { lower: true })}</dt><dd>{fmtMoney(a.revenue)}</dd>
        <dt>Net profit</dt><dd>{fmtMoney(a.net_profit)}</dd>
        <dt>Net margin</dt><dd>{fmtPct(a.net_margin_pct)}</dd>
        <dt>{term('transaction', { plural: true })}</dt><dd>{fmtInt(a.shipments)}</dd>
        <dt>{term('product', { plural: true })}</dt><dd>{fmtInt(a.count)}</dd>
        <dt>Late rate</dt><dd>{fmtPct(a.late_rate_pct)}</dd>
        <dt>Penalties + claims</dt><dd>{fmtMoney(a.penalties_claims)}</dd>
      </dl>
      <h4>Top {term('product', { plural: true, lower: true })} by {term('revenue', { lower: true })}</h4>
      <ul className="drill-ul">{top.map((r) => <li key={r.name}>{r.name} <span className="muted">{fmtMoney(r.revenue)}</span></li>)}</ul>
      <h4>Weakest margins</h4>
      <ul className="drill-ul">{worst.map((r) => <li key={r.name}>{r.name} <span className="muted">{fmtPct(r.net_margin_pct)}</span></li>)}</ul>
    </aside>
  )
}
