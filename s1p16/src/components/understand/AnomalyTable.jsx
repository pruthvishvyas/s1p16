import { useMemo, useState } from 'react'
import { useAnomalies } from '../../hooks/understand/useAnomalies.js'
import { validateAnomalies } from '../../utils/dataValidator.js'
import { fmtDate, fmtMoney, fmtNum } from '../../utils/formatters.js'
import { DataBoundary } from '../shared/DataBoundary.jsx'
import { DataTable } from '../shared/DataTable.jsx'
import { useTerm } from '../shared/TerminologyProvider.jsx'

export function AnomalyTable() {
  const term = useTerm()
  const { data: raw, loading, error } = useAnomalies()
  const { valid, data } = validateAnomalies(raw)
  const [q, setQ] = useState('')
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    return valid ? data.filter((r) => !s || JSON.stringify(r).toLowerCase().includes(s)) : []
  }, [valid, data, q])
  const total = raw && typeof raw.count === 'number' ? raw.count : data.length

  const columns = [
    { key: 'Shipment_ID', label: term('transaction') + ' ID' },
    { key: 'Ship_Date', label: 'Date', format: fmtDate },
    { key: 'Lane', label: term('product') },
    { key: 'Customer', label: term('customer') },
    { key: 'anomaly_score', label: 'Unusualness', align: 'right', format: (v) => fmtNum(v, 3) },
    { key: 'anomaly_reason', label: 'Why it looks unusual' },
    { key: 'Total_Revenue', label: term('revenue'), align: 'right', format: fmtMoney },
    { key: 'net_profit', label: 'Net profit', align: 'right', format: fmtMoney }
  ]

  return (
    <DataBoundary loading={loading} error={error} valid={valid} what="unusual activity">
      <div className="toolbar">
        <p>
          <strong>{total}</strong> {term('transaction', { plural: true, lower: true })} look unusual compared with your normal business. Showing the {data.length} most unusual.
        </p>
        <input className="input" placeholder="Search..." value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search unusual activity" />
      </div>
      <div className="card">
        <DataTable columns={columns} rows={rows} initialSort={{ key: 'anomaly_score', dir: 'desc' }} />
      </div>
    </DataBoundary>
  )
}
