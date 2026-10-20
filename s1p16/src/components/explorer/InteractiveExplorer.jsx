import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from 'recharts'
import { useSegments } from '../../hooks/understand/useSegments.js'
import { validateSegments } from '../../utils/dataValidator.js'
import { DIMENSIONS, METRICS, aggregate, applyFilters, groupBy, toRows } from './explorerModel.js'
import { useExplorer } from './CrossFilterContext.jsx'
import { FilterBar } from './FilterBar.jsx'
import { DrillDownPanel } from './DrillDownPanel.jsx'
import { fmtCompact, fmtInt, fmtMoney, fmtNum, fmtPct } from '../../utils/formatters.js'
import { DataBoundary } from '../shared/DataBoundary.jsx'
import { DataTable } from '../shared/DataTable.jsx'
import { ErrorBoundary } from '../shared/ErrorBoundary.jsx'
import { useTerm } from '../shared/TerminologyProvider.jsx'

const tipStyle = { background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, color: 'var(--color-text-primary)' }
const tick = { fill: 'var(--color-text-secondary)', fontSize: 11 }
const fmtByKind = (kind, v) => (kind === 'money' ? fmtMoney(v) : kind === 'pct' ? fmtPct(v) : fmtInt(v))

function GroupChart({ rows, dim, metricId, title }) {
  const { filters, toggleFilter } = useExplorer()
  const metric = METRICS.find((m) => m.id === metricId) || METRICS[0]
  const data = useMemo(() => groupBy(rows, dim, metric.id), [rows, dim, metric.id])
  if (data.length === 0) return <p className="muted pad">No data for the current filters.</p>
  const height = Math.max(300, data.length * 30)
  const active = filters[dim]
  return (
    <div className="card chart-card">
      <h3 className="card-title">{title}</h3>
      <p className="muted small">Click a bar to filter everything else to that group.</p>
      <ErrorBoundary message="This chart could not be displayed.">
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <YAxis type="category" dataKey="name" tick={tick} width={130} interval={0} />
            <XAxis type="number" tick={tick} tickFormatter={(v) => (metric.kind === 'money' ? fmtCompact(v) : fmtNum(v, 0))} />
            <Tooltip contentStyle={tipStyle} formatter={(v) => [fmtByKind(metric.kind, v), metric.label]} cursor={{ fill: 'var(--color-accent-soft)' }} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} isAnimationActive={false} cursor="pointer" onClick={(entry) => { const nm = entry && (entry.name !== undefined ? entry.name : entry.payload && entry.payload.name); if (nm !== undefined) toggleFilter(dim, String(nm)) }}>
              {data.map((d) => (
                <Cell key={d.name} fill={active && String(active) !== d.name ? 'var(--color-border)' : d.value < 0 ? 'var(--color-danger)' : 'var(--color-accent)'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ErrorBoundary>
    </div>
  )
}

export function InteractiveExplorer() {
  const term = useTerm()
  const { data: raw, loading, error } = useSegments()
  const { valid, data } = validateSegments(raw)
  const { filters, activeFilters } = useExplorer()
  const [dim, setDim] = useState('lane_segment')
  const [metric, setMetric] = useState('revenue')
  const [metric2, setMetric2] = useState('net_margin_pct')
  const [minShipments, setMinShipments] = useState(0)
  const [search, setSearch] = useState('')
  const [copied, setCopied] = useState(false)

  const allRows = useMemo(() => (valid ? toRows(data.lanes) : []), [valid, data])
  const rows = useMemo(() => applyFilters(allRows, filters, minShipments, search), [allRows, filters, minShipments, search])
  const agg = useMemo(() => aggregate(rows), [rows])
  const m1 = METRICS.find((m) => m.id === metric) || METRICS[0]
  const m2 = METRICS.find((m) => m.id === metric2) || METRICS[1]
  const dimLabel = (DIMENSIONS.find((d) => d.id === dim) || {}).label

  const copySummary = async () => {
    const text = ['Explorer summary', 'Filters: ' + (activeFilters ? Object.entries(filters).map(([k, v]) => k + '=' + v).join(', ') : 'none'), term('product', { plural: true }) + ': ' + agg.count, term('revenue') + ': ' + fmtMoney(agg.revenue), 'Net profit: ' + fmtMoney(agg.net_profit), 'Net margin: ' + fmtPct(agg.net_margin_pct), 'Late rate: ' + fmtPct(agg.late_rate_pct)].join('\n')
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch (e) {
      window.prompt('Copy this summary:', text)
    }
  }

  const columns = [
    { key: 'name', label: term('product') },
    { key: 'lane_segment', label: 'Segment' },
    { key: 'shipments', label: term('transaction', { plural: true }), align: 'right', format: fmtInt },
    { key: 'revenue', label: term('revenue'), align: 'right', format: fmtMoney },
    { key: 'net_profit', label: 'Net profit', align: 'right', format: fmtMoney },
    { key: 'net_margin_pct', label: 'Net margin', align: 'right', format: (v) => fmtPct(v) },
    { key: 'late_rate_pct', label: 'Late rate', align: 'right', format: (v) => fmtPct(v) }
  ]

  return (
    <DataBoundary loading={loading} error={error} valid={valid} what="explorer data">
      <FilterBar rows={allRows} minShipments={minShipments} setMinShipments={setMinShipments} search={search} setSearch={setSearch} />
      <div className="kpi-grid kpi-grid--compact">
        {[
          [term('product', { plural: true }), fmtInt(agg.count)],
          [term('revenue'), fmtMoney(agg.revenue)],
          ['Net profit', fmtMoney(agg.net_profit)],
          ['Net margin', fmtPct(agg.net_margin_pct)],
          ['Late rate', fmtPct(agg.late_rate_pct)]
        ].map(([label, value]) => (
          <div key={label} className="card kpi-card">
            <div className="kpi-label">{label}</div>
            <div className="kpi-value">{value}</div>
          </div>
        ))}
      </div>
      <div className="toolbar">
        <label className="inline-field">
          Group by
          <select className="input" value={dim} onChange={(e) => setDim(e.target.value)}>
            {DIMENSIONS.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
          </select>
        </label>
        <label className="inline-field">
          Measure
          <select className="input" value={metric} onChange={(e) => setMetric(e.target.value)}>
            {METRICS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        </label>
        <label className="inline-field">
          Compare with
          <select className="input" value={metric2} onChange={(e) => setMetric2(e.target.value)}>
            {METRICS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        </label>
        <button className="btn" onClick={copySummary}>{copied ? 'Copied!' : 'Copy filtered summary'}</button>
      </div>
      <div className="explorer-layout">
        <div className="explorer-main">
          <GroupChart rows={rows} dim={dim} metricId={m1.id} title={m1.label + ' by ' + dimLabel} />
          <div className="chart-grid">
            <GroupChart rows={rows} dim={dim} metricId={m2.id} title={m2.label + ' by ' + dimLabel} />
            <div className="card chart-card">
              <h3 className="card-title">{term('revenue')} vs net margin per {term('product', { lower: true })}</h3>
              <p className="muted small">Each dot is one {term('product', { lower: true })}. Click a dot to see its details.</p>
              <ErrorBoundary message="This chart could not be displayed.">
                <ScatterPlot rows={rows} />
              </ErrorBoundary>
            </div>
          </div>
          <div className="card">
            <h3 className="card-title pad">{term('product', { plural: true })} in the current view</h3>
            <DataTable columns={columns} rows={rows} initialSort={{ key: 'revenue', dir: 'desc' }} />
          </div>
        </div>
        <DrillDownPanel rows={allRows} />
      </div>
    </DataBoundary>
  )
}

function ScatterPlot({ rows }) {
  const { setSelected } = useExplorer()
  const pts = rows.map((r) => ({ x: r.revenue, y: r.net_margin_pct, z: r.shipments, name: r.name }))
  if (pts.length === 0) return <p className="muted pad">No data for the current filters.</p>
  return (
    <ResponsiveContainer width="100%" height={350}>
      <ScatterChart margin={{ top: 10, right: 24, bottom: 16, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis type="number" dataKey="x" name="Revenue" tick={tick} tickFormatter={fmtCompact} />
        <YAxis type="number" dataKey="y" name="Net margin %" tick={tick} tickFormatter={(v) => fmtNum(v, 0) + '%'} width={56} />
        <ZAxis type="number" dataKey="z" range={[30, 160]} />
        <Tooltip contentStyle={tipStyle} cursor={{ strokeDasharray: '3 3' }} formatter={(v, n) => [n === 'Revenue' ? fmtMoney(v) : n === 'Net margin %' ? fmtPct(v) : fmtNum(v, 0), n]} />
        <Scatter data={pts} fill="var(--color-accent)" isAnimationActive={false} cursor="pointer" onClick={(p) => { const nm = p && (p.name || (p.payload && p.payload.name)); if (nm) setSelected({ dimension: 'name', value: nm }) }} />
      </ScatterChart>
    </ResponsiveContainer>
  )
}
