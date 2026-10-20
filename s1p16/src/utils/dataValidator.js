// Each validator returns { valid, data, error }
import { prettyKey } from './formatters.js'

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)

export function validateKPIs(raw, defs = []) {
  if (Array.isArray(raw)) {
    const cleaned = raw.filter((k) => k && typeof k.label === 'string' && k.value !== undefined)
    return { valid: cleaned.length > 0, data: cleaned, error: cleaned.length ? null : 'No valid KPI entries' }
  }
  if (!isObj(raw)) return { valid: false, data: [], error: 'KPIs must be an object or array' }
  const used = new Set()
  const cards = []
  defs.forEach((d) => {
    const v = raw[d.key]
    used.add(d.key)
    if (v !== undefined && v !== null) cards.push({ ...d, value: v })
  })
  Object.keys(raw).forEach((k) => {
    if (used.has(k)) return
    const v = raw[k]
    if (v !== null && v !== undefined && typeof v !== 'object') {
      cards.push({ key: k, label: prettyKey(k), value: v, format: typeof v === 'number' ? 'num' : 'text', group: 'Other' })
    }
  })
  return { valid: cards.length > 0, data: cards, error: cards.length ? null : 'No valid KPI entries' }
}

export function validateChartData(chart) {
  if (!isObj(chart)) return { valid: false, data: null, error: 'Invalid chart data' }
  let rows = null
  if (Array.isArray(chart.data)) {
    rows = chart.data
      .filter((d) => d && d.label !== undefined && typeof d.value === 'number' && isFinite(d.value))
      .map((d) => ({ x: String(d.label), y: d.value }))
  } else if (Array.isArray(chart.x) && Array.isArray(chart.y)) {
    if (chart.x.length !== chart.y.length) return { valid: false, data: null, error: 'Chart x/y length mismatch' }
    rows = chart.x.map((x, i) => ({ x: String(x), y: Number(chart.y[i]) || 0 }))
  }
  if (!rows || rows.length === 0) return { valid: false, data: null, error: 'Chart has no data points' }
  return { valid: true, data: rows, error: null }
}

export function validateInsights(raw) {
  if (!Array.isArray(raw)) return { valid: false, data: [], error: 'Insights must be an array' }
  const cleaned = raw.filter((i) => i && i.finding && i.severity)
  return { valid: cleaned.length > 0, data: cleaned, error: cleaned.length ? null : 'No valid insights' }
}

export function validateForecast(raw) {
  if (!isObj(raw) || !Array.isArray(raw.forecast) || raw.forecast.length === 0) return { valid: false, data: null, error: 'Forecast has no rows' }
  return { valid: true, data: raw, error: null }
}

export function validateAnomalies(raw) {
  const rows = Array.isArray(raw) ? raw : isObj(raw) && Array.isArray(raw.rows) ? raw.rows : null
  if (!rows) return { valid: false, data: [], error: 'Anomalies must contain rows' }
  return { valid: true, data: rows, error: null }
}

export function validateSegments(raw) {
  if (!isObj(raw) || !Array.isArray(raw.lanes)) return { valid: false, data: null, error: 'Segments missing lanes' }
  return { valid: raw.lanes.length > 0, data: raw, error: raw.lanes.length ? null : 'No lanes' }
}

export function validateRecommendations(raw) {
  if (!isObj(raw)) return { valid: false, data: null, error: 'Invalid recommendations' }
  const d = {
    shipment_actions: Array.isArray(raw.shipment_actions) ? raw.shipment_actions : [],
    lane_actions: Array.isArray(raw.lane_actions) ? raw.lane_actions : [],
    customer_actions: Array.isArray(raw.customer_actions) ? raw.customer_actions : []
  }
  return { valid: true, data: d, error: null }
}

export function validateSimulation(raw) {
  if (!isObj(raw) || !Array.isArray(raw.scenarios) || raw.scenarios.length === 0 || !raw.variable) return { valid: false, data: null, error: 'Simulation has no scenarios' }
  return { valid: true, data: raw, error: null }
}

export function validateGoals(raw) {
  if (!isObj(raw)) return { valid: false, data: null, error: 'Invalid goals' }
  return { valid: Object.keys(raw).length > 0, data: raw, error: null }
}

export function validateGoalProgress(raw) {
  if (!isObj(raw) || !Array.isArray(raw.goals)) return { valid: false, data: null, error: 'Invalid goal progress' }
  return { valid: raw.goals.length > 0, data: raw, error: null }
}

export function validateAlerts(raw) {
  if (!isObj(raw) || !Array.isArray(raw.alerts)) return { valid: false, data: null, error: 'Invalid alerts' }
  return { valid: true, data: raw, error: null }
}
