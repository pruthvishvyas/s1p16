import { useState } from 'react'
import { useRecommendations } from '../../hooks/decide/useRecommendations.js'
import { validateRecommendations } from '../../utils/dataValidator.js'
import { fmtDate, fmtInt, fmtMoney, fmtNum, fmtPct } from '../../utils/formatters.js'
import { DataBoundary } from '../shared/DataBoundary.jsx'
import { DataTable } from '../shared/DataTable.jsx'
import { SeverityBadge } from '../shared/SeverityBadge.jsx'
import { useTerm } from '../shared/TerminologyProvider.jsx'

const first = (r) => r[Object.keys(r)[0]]

export function RecommendationEngine() {
  const term = useTerm()
  const { data: raw, loading, error } = useRecommendations()
  const { valid, data } = validateRecommendations(raw)
  const [tab, setTab] = useState('shipments')

  const shipCols = [
    { key: 'priority', label: 'Priority', render: (r) => <SeverityBadge level={r.priority} /> },
    { key: 'Shipment_ID', label: term('transaction') + ' ID' },
    { key: 'Ship_Date', label: 'Date', format: fmtDate },
    { key: 'Lane', label: term('product') },
    { key: 'Customer', label: term('customer') },
    { key: 'recommendations', label: 'What to do' },
    { key: 'net_profit', label: 'Net profit', align: 'right', format: fmtMoney }
  ]
  const laneCols = [
    { key: 'name', label: term('product'), value: first },
    { key: 'shipments', label: term('transaction', { plural: true }), align: 'right', format: fmtInt },
    { key: 'revenue', label: term('revenue'), align: 'right', format: fmtMoney },
    { key: 'net_margin_pct', label: 'Net margin', align: 'right', format: (v) => fmtPct(v) },
    { key: 'price_increase_to_floor_pct', label: 'Price rise needed', align: 'right', format: (v) => (v > 0 ? fmtNum(v, 1) + '%' : '-') },
    { key: 'late_rate_pct', label: 'Late rate', align: 'right', format: (v) => fmtPct(v) },
    { key: 'action', label: 'What to do' }
  ]
  const custCols = [
    { key: 'name', label: term('customer'), value: first },
    { key: 'shipments', label: term('transaction', { plural: true }), align: 'right', format: fmtInt },
    { key: 'revenue', label: term('revenue'), align: 'right', format: fmtMoney },
    { key: 'net_margin_pct', label: 'Net margin', align: 'right', format: (v) => fmtPct(v) },
    { key: 'overdue_ar', label: 'Overdue', align: 'right', format: fmtMoney },
    { key: 'days_over_terms', label: 'Days late paying', align: 'right', format: (v) => (typeof v === 'number' ? fmtNum(v, 1) : '-') },
    { key: 'action', label: 'What to do' }
  ]
  const tabs = [
    { id: 'shipments', label: term('transaction', { plural: true }) + ' to act on', cols: shipCols, rows: valid ? data.shipment_actions : [], sort: { key: 'priority', dir: 'asc' } },
    { id: 'lanes', label: term('product', { plural: true }) + ' to fix', cols: laneCols, rows: valid ? data.lane_actions : [], sort: { key: 'revenue', dir: 'desc' } },
    { id: 'customers', label: term('customer', { plural: true }) + ' to talk to', cols: custCols, rows: valid ? data.customer_actions : [], sort: { key: 'revenue', dir: 'desc' } }
  ]
  const active = tabs.find((t) => t.id === tab) || tabs[0]

  return (
    <DataBoundary loading={loading} error={error} valid={valid} what="recommendations">
      <div className="pill-row">
        {tabs.map((t) => (
          <button key={t.id} className={'pill' + (tab === t.id ? ' pill--active' : '')} onClick={() => setTab(t.id)}>
            {t.label} ({t.rows.length})
          </button>
        ))}
      </div>
      <div className="card">
        <DataTable columns={active.cols} rows={active.rows} initialSort={active.sort} empty="Nothing needs action here right now." />
      </div>
    </DataBoundary>
  )
}
