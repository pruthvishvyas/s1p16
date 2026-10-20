import { DIMENSIONS } from './explorerModel.js'
import { useExplorer } from './CrossFilterContext.jsx'

export function FilterBar({ rows, minShipments, setMinShipments, search, setSearch }) {
  const { filters, setFilter, clearFilters, activeFilters } = useExplorer()
  const options = (dim) => [...new Set(rows.map((r) => String(r[dim])))].sort()
  return (
    <div className="filter-bar">
      {DIMENSIONS.filter((d) => d.id !== 'name').map((d) => (
        <label key={d.id} className="inline-field">
          {d.label}
          <select className="input" value={filters[d.id] || 'ALL'} onChange={(e) => setFilter(d.id, e.target.value)}>
            <option value="ALL">All</option>
            {options(d.id).map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </label>
      ))}
      <label className="inline-field">
        Min shipments
        <input className="input input--narrow" type="number" min="0" value={minShipments} onChange={(e) => setMinShipments(Math.max(0, Number(e.target.value) || 0))} />
      </label>
      <label className="inline-field">
        Search
        <input className="input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Lane name" />
      </label>
      <button className="btn btn--ghost" onClick={clearFilters} disabled={activeFilters === 0}>
        Clear filters{activeFilters ? ' (' + activeFilters + ')' : ''}
      </button>
    </div>
  )
}
