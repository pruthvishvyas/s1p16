import { useGoals } from '../../hooks/decide/useGoals.js'
import { useOutcome } from '../../context/OutcomeContext.jsx'
import { validateGoals } from '../../utils/dataValidator.js'
import { prettyKey } from '../../utils/formatters.js'
import { DataBoundary } from '../shared/DataBoundary.jsx'
import { useTerm } from '../shared/TerminologyProvider.jsx'

export function GoalTracker() {
  const term = useTerm()
  const { data: raw, loading, error } = useGoals()
  const { valid, data } = validateGoals(raw)
  const { goalOverrides, setGoalOverride, resetGoalOverrides } = useOutcome()
  const entries = valid ? Object.entries(data).filter(([, g]) => g && typeof g === 'object') : []

  return (
    <DataBoundary loading={loading} error={error} valid={valid} what="goals">
      <div className="toolbar">
        <p className="muted">
          Targets used to judge your performance. Change a value to preview it on this device. To make it permanent for everyone, edit goals.json in the pipeline project and re-run it.
        </p>
        <button className="btn btn--ghost" onClick={resetGoalOverrides}>Reset my changes</button>
      </div>
      <div className="kpi-grid">
        {entries.map(([key, g]) => {
          const edited = goalOverrides[key] !== undefined
          const value = edited ? goalOverrides[key] : g.value
          return (
            <div key={key} className="card goal-card">
              <div className="kpi-label">{key === 'revenue_target' ? term('revenue') + ' target' : prettyKey(key)}</div>
              <div className="goal-input">
                <input
                  type="number"
                  className="input"
                  value={value === null || value === undefined ? '' : value}
                  placeholder={g.client_sets ? 'Not set - enter a target' : ''}
                  onChange={(e) => setGoalOverride(key, e.target.value)}
                  aria-label={prettyKey(key)}
                />
                <span className="muted small">{g.unit}</span>
              </div>
              {g.description && <p className="muted small">{g.description}</p>}
              {edited && <p className="small accent-text">Preview only (this device)</p>}
            </div>
          )
        })}
      </div>
    </DataBoundary>
  )
}
