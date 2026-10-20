import { useMemo, useState } from 'react'
import { useSegments } from '../../hooks/understand/useSegments.js'
import { validateSegments } from '../../utils/dataValidator.js'
import { segmentTone } from '../../utils/colors.js'
import { fmtInt, fmtMoney, fmtPct, fmtRatioPct } from '../../utils/formatters.js'
import { DataBoundary } from '../shared/DataBoundary.jsx'
import { DataTable } from '../shared/DataTable.jsx'
import { SeverityBadge } from '../shared/SeverityBadge.jsx'
import { useTerm } from '../shared/TerminologyProvider.jsx'

export function SegmentExplorer() {
  const term = useTerm()
  const { data: raw, loading, error } = useSegments()
  const { valid, data } = validateSegments(raw)
  const [seg, setSeg] = useState('ALL')
  const rows = useMemo(() => (valid ? data.lanes.filter((r) => seg === 'ALL' || r.lane_segment === seg) : []), [valid, data, seg])
  const L = term('product')
  const keyOf = (r) => r[Object.keys(r)[0]]

  const columns = [
    { key: 'name', label: L, value: keyOf },
    { key: 'lane_segment', label: 'Segment', render: (r) => <SeverityBadge level={r.lane_segment} tone={segmentTone(r.lane_segment)} /> },
    { key: 'shipments', label: term('transaction', { plural: true }), align: 'right', format: fmtInt },
    { key: 'revenue', label: term('revenue'), align: 'right', format: fmtMoney },
    { key: 'net_profit', label: 'Net profit', align: 'right', format: fmtMoney },
    { key: 'net_margin_pct', label: 'Net margin', align: 'right', format: (v) => fmtPct(v) },
    { key: 'late_rate_pct', label: 'Late rate', align: 'right', format: (v) => fmtPct(v) },
    { key: 'avg_load', label: 'Avg load', align: 'right', format: (v) => fmtPct(v) },
    { key: 'avg_empty_ratio', label: 'Empty return', align: 'right', format: (v) => fmtRatioPct(v) },
    { key: 'penalties_claims', label: 'Penalties + claims', align: 'right', format: fmtMoney }
  ]

  return (
    <DataBoundary loading={loading} error={error} valid={valid} what={term('product', { lower: true }) + ' segments'}>
      <div className="pill-row">
        <button className={'pill' + (seg === 'ALL' ? ' pill--active' : '')} onClick={() => setSeg('ALL')}>
          All ({valid ? data.lanes.length : 0})
        </button>
        {valid && Object.entries(data.summary || {}).map(([name, n]) => (
          <button key={name} className={'pill' + (seg === name ? ' pill--active' : '')} onClick={() => setSeg(seg === name ? 'ALL' : name)}>
            {name} ({n})
          </button>
        ))}
      </div>
      <div className="card">
        <DataTable columns={columns} rows={rows} initialSort={{ key: 'revenue', dir: 'desc' }} />
      </div>
    </DataBoundary>
  )
}
