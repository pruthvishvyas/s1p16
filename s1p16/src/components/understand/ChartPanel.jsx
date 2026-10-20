import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useCharts } from '../../hooks/understand/useCharts.js'
import { validateChartData } from '../../utils/dataValidator.js'
import { fmtCompact, fmtMoney, fmtNum, fmtPct, tickLabel, valueKind } from '../../utils/formatters.js'
import { SkeletonCard } from '../shared/SkeletonCard.jsx'
import { EmptyState } from '../shared/EmptyState.jsx'
import { DataBoundary } from '../shared/DataBoundary.jsx'
import { ErrorBoundary } from '../shared/ErrorBoundary.jsx'

const tipStyle = { background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, color: 'var(--color-text-primary)' }
const tick = { fill: 'var(--color-text-secondary)', fontSize: 12 }

function ChartBody({ chart }) {
  const { valid, data, error } = validateChartData(chart)
  if (!valid) return <EmptyState message={error} />
  const kind = valueKind(chart)
  const fmtTip = (v) => (kind === 'money' ? fmtMoney(v) : kind === 'pct' ? fmtPct(v) : fmtNum(v, 2))
  const fmtAxis = (v) => (kind === 'pct' ? fmtNum(v, 0) + '%' : fmtCompact(v))
  const margin = { top: 10, right: 24, bottom: 8, left: 8 }

  if (chart.type === 'line') {
    return (
      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={data} margin={margin}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis dataKey="x" tick={tick} tickFormatter={tickLabel} interval="preserveStartEnd" minTickGap={32} />
          <YAxis tick={tick} tickFormatter={fmtAxis} width={64} />
          <Tooltip contentStyle={tipStyle} formatter={(v) => [fmtTip(v), chart.y_label || 'Value']} labelFormatter={tickLabel} />
          <Line type="monotone" dataKey="y" stroke="var(--color-accent)" strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    )
  }
  if (chart.type === 'bar' || chart.type === 'histogram') {
    const horizontal = chart.type === 'bar' && data.some((d) => d.x.length > 12)
    const height = horizontal ? Math.max(350, data.length * 34) : 350
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={margin} layout={horizontal ? 'vertical' : 'horizontal'}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          {horizontal ? (
            <>
              <YAxis type="category" dataKey="x" tick={{ ...tick, fontSize: 11 }} width={140} interval={0} />
              <XAxis type="number" tick={tick} tickFormatter={fmtAxis} />
            </>
          ) : (
            <>
              <XAxis dataKey="x" tick={tick} tickFormatter={tickLabel} interval={0} />
              <YAxis tick={tick} tickFormatter={fmtAxis} width={64} />
            </>
          )}
          <Tooltip contentStyle={tipStyle} formatter={(v) => [fmtTip(v), chart.y_label || 'Value']} cursor={{ fill: 'var(--color-accent-soft)' }} />
          <Bar dataKey="y" radius={[4, 4, 0, 0]} isAnimationActive={false}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.y < 0 ? 'var(--color-danger)' : 'var(--color-accent)'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    )
  }
  return <EmptyState message={'Unsupported chart type: ' + chart.type} />
}

// outcome: 'UNDERSTAND' | 'DECIDE' | 'MONITOR' - shows only charts tagged for that outcome
export function ChartPanel({ outcome, title }) {
  const { charts, loading, error } = useCharts()
  const list = charts.filter((c) => !outcome || String(c.outcome).toUpperCase() === outcome)
  return (
    <DataBoundary loading={loading} error={error} valid={list.length > 0} what="charts" skeleton={<div className="chart-grid"><SkeletonCard height={380} count={2} /></div>}>
      {title && <h2 className="section-title">{title}</h2>}
      <div className="chart-grid">
        {list.map((c) => (
          <div key={c.id} className="card chart-card">
            <h3 className="card-title">{c.title}</h3>
            {c.business_question && <p className="muted small">{c.business_question}</p>}
            <ErrorBoundary message="This chart could not be displayed.">
              <ChartBody chart={c} />
            </ErrorBoundary>
          </div>
        ))}
      </div>
    </DataBoundary>
  )
}
