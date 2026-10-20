import { useMemo } from 'react'
import { useKPIs } from '../../hooks/understand/useKPIs.js'
import { validateKPIs } from '../../utils/dataValidator.js'
import { kpiDefs, KPI_GROUP_ORDER } from '../../utils/kpiDefs.js'
import { fmtValue, fmtDate } from '../../utils/formatters.js'
import { SkeletonCard } from '../shared/SkeletonCard.jsx'
import { DataBoundary } from '../shared/DataBoundary.jsx'
import { useTerm } from '../shared/TerminologyProvider.jsx'

export function KPICards() {
  const term = useTerm()
  const { data: raw, loading, error } = useKPIs()
  const defs = useMemo(() => kpiDefs(term), [term])
  const { valid, data } = validateKPIs(raw, defs)

  return (
    <DataBoundary loading={loading} error={error} valid={valid} what={term('revenue', { lower: true }) + ' numbers'} skeleton={<div className="kpi-grid"><SkeletonCard height={110} count={8} /></div>}>
      {raw && raw.period_start && (
        <p className="muted">
          Period covered: {fmtDate(raw.period_start)} to {fmtDate(raw.period_end)}
        </p>
      )}
      {KPI_GROUP_ORDER.map((g) => {
        const cards = data.filter((k) => (k.group || 'Other') === g)
        if (cards.length === 0) return null
        return (
          <section key={g} className="kpi-section">
            <h2 className="section-title">{g}</h2>
            <div className="kpi-grid">
              {cards.map((k) => (
                <div key={k.key || k.label} className={'card kpi-card' + (k.tone ? ' kpi-card--' + k.tone : '')}>
                  <div className="kpi-label">{k.label}</div>
                  <div className="kpi-value">{k.format === 'text' ? String(k.value).replace(/_/g, ' ') : fmtValue(k.format, k.value)}</div>
                </div>
              ))}
            </div>
          </section>
        )
      })}
    </DataBoundary>
  )
}
