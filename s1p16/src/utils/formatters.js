import { CURRENCY } from '../generated.js'

const isNum = (v) => typeof v === 'number' && isFinite(v)
const safe = (fn) => {
  try { return fn() } catch (e) { return null }
}
const money0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: CURRENCY, maximumFractionDigits: 0 })
const moneyCompact = new Intl.NumberFormat('en-US', { style: 'currency', currency: CURRENCY, notation: 'compact', maximumFractionDigits: 1 })
const numCompact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 })

export const fmtMoney = (v) => (isNum(v) ? money0.format(v) : '-')
export const fmtMoneyCompact = (v) => (isNum(v) ? moneyCompact.format(v) : '-')
export const fmtNum = (v, d = 1) => (isNum(v) ? v.toLocaleString('en-US', { maximumFractionDigits: d }) : '-')
export const fmtInt = (v) => (isNum(v) ? Math.round(v).toLocaleString('en-US') : '-')
export const fmtCompact = (v) => (isNum(v) ? numCompact.format(v) : '-')
export const fmtPct = (v, d = 1) => (isNum(v) ? v.toFixed(d) + '%' : '-')
export const fmtRatioPct = (v, d = 1) => (isNum(v) ? (v * 100).toFixed(d) + '%' : '-')
export const fmtDate = (v) => (v ? String(v).slice(0, 10) : '-')
export const fmtDays = (v) => (isNum(v) ? fmtNum(v, 1) + ' days' : '-')

export function fmtValue(kind, v) {
  switch (kind) {
    case 'money': return fmtMoney(v)
    case 'pct': return fmtPct(v)
    case 'ratio': return fmtRatioPct(v)
    case 'int': return fmtInt(v)
    case 'date': return fmtDate(v)
    case 'days': return fmtDays(v)
    case 'num': return fmtNum(v, 2)
    default: return v === null || v === undefined ? '-' : String(v)
  }
}

export function prettyKey(key) {
  return String(key).replace(/_/g, ' ').replace(/\bpct\b/gi, '%').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function timeAgo(iso) {
  const t = safe(() => new Date(iso).getTime())
  if (!isNum(t)) return null
  const mins = Math.max(0, Math.round((Date.now() - t) / 60000))
  if (mins < 2) return 'just now'
  if (mins < 120) return mins + ' minutes ago'
  const hrs = Math.round(mins / 60)
  if (hrs < 48) return hrs + ' hours ago'
  return Math.round(hrs / 24) + ' days ago'
}

export function valueKind(chart) {
  const label = String((chart && chart.y_label) || '')
  if (label.includes('%')) return 'pct'
  if (/revenue|cost|AR|profit|savings/i.test(label)) return 'money'
  return 'num'
}

export function tickLabel(v) {
  const s = String(v)
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : s
}
