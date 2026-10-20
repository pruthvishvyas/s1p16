export const CHART_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)', 'var(--chart-6)']

export function toneOf(value) {
  const v = String(value || '').toUpperCase()
  if (['HIGH', 'OFF_TRACK', 'P1_URGENT'].includes(v)) return 'danger'
  if (['MEDIUM', 'P2_HIGH'].includes(v)) return 'warning'
  if (['LOW', 'ON_TRACK', 'P4_ROUTINE'].includes(v)) return 'success'
  if (['P3_MEDIUM'].includes(v)) return 'info'
  return 'muted'
}

export function segmentTone(name) {
  const n = String(name || '')
  if (/engine/i.test(n)) return 'success'
  if (/drain/i.test(n)) return 'danger'
  if (/core/i.test(n)) return 'info'
  return 'muted'
}
