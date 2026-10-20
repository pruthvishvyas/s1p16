import { useMemo, useState } from 'react'
import { Area, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useForecast, usePredict } from '../../hooks/monitor/useForecast.js'
import { validateForecast } from '../../utils/dataValidator.js'
import { fmtCompact, fmtDate, fmtMoney, fmtPct, prettyKey } from '../../utils/formatters.js'
import { DataBoundary } from '../shared/DataBoundary.jsx'
import { ErrorBoundary } from '../shared/ErrorBoundary.jsx'
import { useTerm } from '../shared/TerminologyProvider.jsx'

export function Forecaster() {
  const term = useTerm()
  const { data: raw, loading, error } = useForecast()
  const { valid, data } = validateForecast(raw)
  const [days, setDays] = useState('7')
  const { loading: pLoading, result, error: pError, predict } = usePredict(valid ? data : null)

  const series = useMemo(() => {
    if (!valid) return []
    const actual = (Array.isArray(data.recent_actuals) ? data.recent_actuals : []).map((r) => ({ date: fmtDate(r.date), actual: r.revenue }))
    const fc = data.forecast.map((r) => ({ date: fmtDate(r.date), forecast: r.forecast_revenue, lower: r.lower_80, band: Math.max(0, (r.upper_80 ?? 0) - (r.lower_80 ?? 0)) }))
    return [...actual, ...fc]
  }, [valid, data])

  const m = valid && data.metrics ? data.metrics : {}
  const total = valid ? data.forecast.reduce((s, r) => s + (r.forecast_revenue || 0), 0) : 0

  return (
    <DataBoundary loading={loading} error={error} valid={valid} what="forecast">
      <div className="kpi-grid">
        <div className="card kpi-card kpi-card--accent">
          <div className="kpi-label">Expected {term('revenue', { lower: true })} (next {valid ? data.forecast.length : 0} days)</div>
          <div className="kpi-value">{fmtMoney(total)}</div>
        </div>
        <div className="card kpi-card">
          <div className="kpi-label">Last 30 days</div>
          <div className="kpi-value">{fmtMoney(m.trailing_30d_revenue)}</div>
        </div>
        <div className="card kpi-card">
          <div className="kpi-label">Change vs last 30 days</div>
          <div className="kpi-value">{fmtPct(m.forecast_vs_trailing_pct)}</div>
        </div>
        <div className="card kpi-card">
          <div className="kpi-label">Method</div>
          <div className="kpi-value kpi-value--text">{prettyKey(m.method || 'n/a')}</div>
        </div>
      </div>
      <div className="card chart-card">
        <h3 className="card-title">Daily {term('revenue', { lower: true })}: recent actuals and forecast</h3>
        <p className="muted small">The shaded band is the likely range (about 4 times out of 5).</p>
        <ErrorBoundary message="The forecast chart could not be displayed.">
          <ResponsiveContainer width="100%" height={350}>
            <ComposedChart data={series} margin={{ top: 10, right: 24, bottom: 8, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="date" tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }} interval="preserveStartEnd" minTickGap={32} />
              <YAxis tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }} tickFormatter={fmtCompact} width={64} />
              <Tooltip contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8 }} formatter={(v, n) => [fmtMoney(v), n === 'actual' ? 'Actual' : 'Forecast']} />
              <Legend />
              <Area type="monotone" dataKey="lower" stackId="range" stroke="none" fill="transparent" legendType="none" tooltipType="none" isAnimationActive={false} />
              <Area type="monotone" dataKey="band" stackId="range" stroke="none" fill="var(--color-accent-soft)" legendType="none" tooltipType="none" isAnimationActive={false} />
              <Line type="monotone" dataKey="actual" name="actual" stroke="var(--chart-2)" strokeWidth={2} dot={false} isAnimationActive={false} connectNulls={false} />
              <Line type="monotone" dataKey="forecast" name="forecast" stroke="var(--color-accent)" strokeWidth={2} dot={false} strokeDasharray="5 4" isAnimationActive={false} connectNulls={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </ErrorBoundary>
      </div>
      <div className="card">
        <h3 className="card-title">Quick forecast lookup</h3>
        <div className="toolbar">
          <label className="inline-field">
            Days ahead
            <input className="input" type="number" min="1" value={days} onChange={(e) => setDays(e.target.value)} />
          </label>
          <button className="btn" disabled={pLoading} onClick={() => predict(days)}>
            {pLoading ? 'Checking...' : 'Get forecast'}
          </button>
        </div>
        {pError && <p className="error-text">{pError}</p>}
        {result && (
          <p>
            {result.date ? fmtDate(result.date) + ': ' : 'Day ' + result.nearest_key + ': '}
            <strong>{fmtMoney(result.prediction)}</strong>
            {result.range_low !== null && result.range_low !== undefined && <span className="muted"> (likely {fmtMoney(result.range_low)} to {fmtMoney(result.range_high)})</span>}
            {result.source === 'local' && <span className="muted small"> - from local data</span>}
          </p>
        )}
      </div>
    </DataBoundary>
  )
}
