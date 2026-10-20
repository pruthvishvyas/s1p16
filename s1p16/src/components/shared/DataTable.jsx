import { useMemo, useState } from 'react'

// columns: [{ key, label, align, format(value,row), render(row), value(row) }]
export function DataTable({ columns, rows, initialSort, pageSize = 25, empty = 'No rows to show.' }) {
  const [sort, setSort] = useState(initialSort || null)
  const [limit, setLimit] = useState(pageSize)

  const sorted = useMemo(() => {
    if (!sort) return rows
    const col = columns.find((c) => c.key === sort.key)
    const get = (r) => (col && col.value ? col.value(r) : r[sort.key])
    const dir = sort.dir === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
      const x = get(a)
      const y = get(b)
      if (typeof x === 'number' && typeof y === 'number') return (x - y) * dir
      return String(x ?? '').localeCompare(String(y ?? '')) * dir
    })
  }, [rows, sort, columns])

  if (!rows || rows.length === 0) return <p className="muted pad">{empty}</p>

  const onSort = (key) => setSort((s) => (s && s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' }))
  const visible = sorted.slice(0, limit)

  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} className={c.align === 'right' ? 'right sortable' : 'sortable'} onClick={() => onSort(c.key)}>
                {c.label}
                {sort && sort.key === c.key ? (sort.dir === 'asc' ? ' \u25B2' : ' \u25BC') : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visible.map((r, i) => (
            <tr key={i}>
              {columns.map((c) => {
                const raw = c.value ? c.value(r) : r[c.key]
                const cell = c.render ? c.render(r) : c.format ? c.format(raw, r) : raw === null || raw === undefined || raw === '' ? '-' : String(raw)
                return (
                  <td key={c.key} className={c.align === 'right' ? 'right' : ''}>
                    {cell}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="table-foot">
        <span className="muted">
          Showing {visible.length} of {sorted.length}
        </span>
        {limit < sorted.length && (
          <button className="btn btn--ghost" onClick={() => setLimit((l) => l + pageSize)}>
            Show more
          </button>
        )}
      </div>
    </div>
  )
}
