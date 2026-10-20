import { useEffect, useState } from 'react'
import { CartesianGrid, Line, LineChart, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useSimulations } from '../../hooks/decide/useSimulations.js'
import { validateSimulation } from '../../utils/dataValidator.js'
import { fmtCompact, fmtMoney, fmtNum, prettyKey } from '../../utils/formatters.js'
import { DataBoundary } from '../shared/DataBoundary.jsx'
import { EmptyState } from '../shared/EmptyState.jsx'
import { ErrorBoundary } from '../shared/ErrorBoundary.jsx'

const TITLES = { price_change_pct: 'What if I change my prices?', late_reduction_pct: 'What if I cut late deliveries?', empty_reduction_pct: 'What if I reduce empty return trips?' }
const MAIN_METRICS = ['net_profit', 'savings_per_month', 'savings_period']

function fmtMetric(key, v) {
  if (typeof v !== 'number') return '-'
  if (/revenue|profit|savings/.test(key)) return fmtMoney(v)
  if (/pct|on_time/.test(key)) return fmtNum(v, 1) + '%'
  return fmtNum(v, 0)
}

function Scenario({ sim }) {
  const rows = sim.scenarios
  const xKey = sim.variable
  const keys = Object.keys(rows[0]).filter((k) => k !== xKey && typeof rows[0][k] === 'number')
  const mainKey = MAIN_METRICS.find((k) => keys.includes(k)) || keys[0]
  const [idx, setIdx] = useState(0)
  useEffect(() => setIdx(0), [sim.variable])
  const cur = rows[Math.min(idx, rows.length - 1)]
  const delta = rows.length ? cur[mainKey] - rows[0][mainKey] : 0

  return (
    <div className="card sim-card">
      <h3 className="card-title">{TITLES[xKey] || prettyKey(xKey)}</h3>
      <label className="slider-label">
        {prettyKey(xKey)}: <strong>{cur[xKey]}%</strong>
        <input type="range" min={0} max={rows.length - 1} step={1} value={idx} onChange={(e) => setIdx(Number(e.target.value))} className="slider" aria-label={prettyKey(xKey)} />
      </label>
      <div className="kpi-grid kpi-grid--compact">
        {keys.map((k) => (
          <div key={k} className={'card kpi-card' + (k === mainKey ? ' kpi-card--accent' : '')}>
            <div className="kpi-label">{prettyKey(k)}</div>
            <div className="kpi-value">{fmtMetric(k, cur[k])}</div>
          </div>
        ))}
      </div>
      <p className="muted">
        Compared with doing nothing, <strong>{prettyKey(mainKey)}</strong> changes by <strong>{fmtMetric(mainKey, delta)}</strong>.
      </p>
      <ErrorBoundary message="This chart could not be displayed.">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={rows} margin={{ top: 10, right: 24, bottom: 8, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey={xKey} tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }} unit="%" />
            <YAxis tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }} tickFormatter={(v) => fmtCompact(v)} width={64} />
            <Tooltip contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8 }} formatter={(v) => [fmtMetric(mainKey, v), prettyKey(mainKey)]} labelFormatter={(l) => prettyKey(xKey) + ': ' + l + '%'} />
            <Line type="monotone" dataKey={mainKey} stroke="var(--color-accent)" strokeWidth={2} dot={false} isAnimationActive={false} />
            <ReferenceDot x={cur[xKey]} y={cur[mainKey]} r={6} fill="var(--color-accent)" stroke="var(--color-surface)" />
          </LineChart>
        </ResponsiveContainer>
      </ErrorBoundary>
      {sim.assumptions && sim.assumptions.note && <p className="muted small">Assumption: {sim.assumptions.note}</p>}
      {sim.best_price_change_pct !== undefined && <p className="muted small">Best price change in this range: {sim.best_price_change_pct}%</p>}
    </div>
  )
}

export function WhatIfSimulator() {
  const { sims, loading, error } = useSimulations()
  const valid = sims.map((s) => validateSimulation(s)).filter((v) => v.valid).map((v) => v.data)
  return (
    <DataBoundary loading={loading} error={error && valid.length === 0 ? error : null} valid={valid.length > 0} what="simulations">
      <p className="muted">Move a slider to see the estimated effect. Figures are estimates based on your past data, not guarantees.</p>
      <div className="stack">
        {valid.map((s) => (
          <ErrorBoundary key={s.variable} message="This simulation could not be displayed.">
            <Scenario sim={s} />
          </ErrorBoundary>
        ))}
        {valid.length === 0 && <EmptyState message="No valid simulations found." />}
      </div>
    </DataBoundary>
  )
}
