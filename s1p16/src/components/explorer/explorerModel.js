// Lane-level data model used by the Explorer (works on the aggregated rows the pipeline exports)
export const DIMENSIONS = [
  { id: 'lane_segment', label: 'Segment' },
  { id: 'origin', label: 'Origin' },
  { id: 'destination', label: 'Destination' },
  { id: 'band', label: 'Distance band' },
  { id: 'name', label: 'Lane' }
]

export const METRICS = [
  { id: 'revenue', label: 'Revenue', kind: 'money' },
  { id: 'net_profit', label: 'Net profit', kind: 'money' },
  { id: 'net_margin_pct', label: 'Net margin', kind: 'pct' },
  { id: 'shipments', label: 'Shipments', kind: 'int' },
  { id: 'late_rate_pct', label: 'Late rate', kind: 'pct' },
  { id: 'avg_load', label: 'Average load factor', kind: 'pct' },
  { id: 'penalties_claims', label: 'Penalties + claims', kind: 'money' }
]

const bandOf = (km) => (km < 500 ? 'Short (<500km)' : km < 1500 ? 'Medium (500-1500km)' : km < 3000 ? 'Long (1500-3000km)' : 'Ultra-long (3000km+)')

export function toRows(lanes) {
  return lanes.map((r) => {
    const name = String(r[Object.keys(r)[0]])
    const parts = name.split(' - ')
    return {
      ...r,
      name,
      origin: parts.length > 1 ? parts[0].trim() : name,
      destination: parts.length > 1 ? parts[parts.length - 1].trim() : name,
      band: bandOf(Number(r.avg_distance) || 0),
      lane_segment: r.lane_segment || 'Unclassified'
    }
  })
}

// Correct aggregation: sums for amounts, ratios recomputed from sums, weighted averages by shipment count
export function aggregate(rows) {
  const sum = (k) => rows.reduce((s, r) => s + (Number(r[k]) || 0), 0)
  const ship = sum('shipments')
  const revenue = sum('revenue')
  const net = sum('net_profit')
  const wavg = (k) => (ship > 0 ? rows.reduce((s, r) => s + (Number(r[k]) || 0) * (Number(r.shipments) || 0), 0) / ship : 0)
  return {
    count: rows.length,
    shipments: ship,
    revenue,
    net_profit: net,
    net_margin_pct: revenue > 0 ? (net / revenue) * 100 : 0,
    late_rate_pct: wavg('late_rate_pct'),
    avg_load: wavg('avg_load'),
    penalties_claims: sum('penalties_claims')
  }
}

export function groupBy(rows, dim, metric, limit = 15) {
  const map = new Map()
  rows.forEach((r) => {
    const k = String(r[dim])
    if (!map.has(k)) map.set(k, [])
    map.get(k).push(r)
  })
  const out = [...map.entries()].map(([name, list]) => ({ name, value: aggregate(list)[metric], count: list.length }))
  out.sort((a, b) => b.value - a.value)
  return out.slice(0, limit)
}

export function applyFilters(rows, filters, minShipments, search) {
  const s = (search || '').trim().toLowerCase()
  return rows.filter((r) => {
    for (const [dim, val] of Object.entries(filters)) if (String(r[dim]) !== String(val)) return false
    if ((Number(r.shipments) || 0) < minShipments) return false
    if (s && !r.name.toLowerCase().includes(s)) return false
    return true
  })
}
