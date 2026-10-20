import { useGoalProgress } from '../../hooks/monitor/useGoalProgress.js'
import { useOutcome } from '../../context/OutcomeContext.jsx'
import { validateGoalProgress } from '../../utils/dataValidator.js'
import { fmtMoney, fmtNum, fmtRatioPct, fmtPct, fmtDate } from '../../utils/formatters.js'
import { DataBoundary } from '../shared/DataBoundary.jsx'
import { SeverityBadge } from '../shared/SeverityBadge.jsx'

const LOWER_BETTER = ['empty_ratio_max', 'overdue_grace_days']

function show(goal, v) {
  if (v === null || v === undefined) return '-'
  if (goal === 'revenue_target') return fmtMoney(v)
  if (goal === 'empty_ratio_max') return fmtRatioPct(v)
  if (goal === 'overdue_grace_days') return fmtNum(v, 1) + ' days'
  return fmtPct(v)
}

export function GoalProgress() {
  const { data: raw, loading, error } = useGoalProgress()
  const { valid, data } = validateGoalProgress(raw)
  const { goalOverrides } = useOutcome()

  const rows = valid
    ? data.goals.map((g) => {
        const override = g.goal === 'revenue_target' ? goalOverrides.revenue_target : undefined
        const target = override !== undefined ? override : g.target
        let status = g.status
        if (override !== undefined && typeof g.actual === 'number') status = g.actual >= override ? 'ON_TRACK' : 'OFF_TRACK'
        return { ...g, target, status, edited: override !== undefined }
      })
    : []

  return (
    <DataBoundary loading={loading} error={error} valid={valid} what="goal progress">
      {valid && <p className="muted">As of {fmtDate(data.as_of)}</p>}
      <div className="kpi-grid">
        {rows.map((g, i) => {
          const lower = LOWER_BETTER.includes(g.goal)
          let pct = null
          if (typeof g.actual === 'number' && typeof g.target === 'number' && g.target > 0) {
            pct = lower ? (g.actual <= 0 ? 100 : (g.target / g.actual) * 100) : (g.actual / g.target) * 100
            pct = Math.max(0, Math.min(100, pct))
          }
          return (
            <div key={i} className="card goal-card">
              <div className="goal-head">
                <div className="kpi-label">{g.label}</div>
                <SeverityBadge level={g.status} />
              </div>
              <div className="kpi-value">{show(g.goal, g.actual)}</div>
              <div className="muted small">
                Target: {g.target === null || g.target === undefined ? 'not set' : show(g.goal, g.target)} {g.edited ? '(your preview)' : ''}
              </div>
              {pct !== null && (
                <div className="progress" aria-hidden="true">
                  <div className={'progress-bar progress-bar--' + (g.status === 'OFF_TRACK' ? 'danger' : 'success')} style={{ width: pct + '%' }} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </DataBoundary>
  )
}
