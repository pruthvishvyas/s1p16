import { useAlerts } from '../../hooks/monitor/useAlerts.js'
import { validateAlerts } from '../../utils/dataValidator.js'
import { fmtDate } from '../../utils/formatters.js'
import { DataBoundary } from '../shared/DataBoundary.jsx'
import { SeverityBadge } from '../shared/SeverityBadge.jsx'

export function AlertCenter() {
  const { data: raw, loading, error } = useAlerts()
  const { valid, data } = validateAlerts(raw)
  return (
    <DataBoundary loading={loading} error={error} valid={valid} what="alerts">
      {valid && data.alerts.length === 0 && (
        <div className="card alert-ok">
          <strong>All clear.</strong> Everything monitored is within your limits as of {fmtDate(data.as_of)}.
        </div>
      )}
      <div className="stack">
        {valid &&
          data.alerts.map((a, i) => (
            <article key={a.id || i} className={'card alert alert--' + String(a.severity).toLowerCase()}>
              <div className="insight-head">
                <SeverityBadge level={a.severity} />
                <span className="insight-cat">{String(a.id || '').replace(/_/g, ' ')}</span>
                <span className="muted small">as of {fmtDate(a.as_of || data.as_of)}</span>
              </div>
              <h3 className="insight-finding">{a.message}</h3>
              {a.action && (
                <p className="insight-action">
                  <strong>What to do:</strong> {a.action}
                </p>
              )}
            </article>
          ))}
      </div>
    </DataBoundary>
  )
}
