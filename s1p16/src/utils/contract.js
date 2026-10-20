import { CONTRACT } from '../generated.js'

const o = CONTRACT.outcomes || {}
const u = o.understand || {}
const dd = o.decide || {}
const m = o.monitor || {}
const clean = (p) => String(p).replace(/^\/+/, '')
const file = (p, fallback) => '/data/' + clean(p || fallback)
const dir = (p, fallback) => {
  const v = '/data/' + clean(p || fallback)
  return v.endsWith('/') ? v : v + '/'
}

export const P = {
  kpis: file(u.kpis, 'understand/kpis.json'),
  charts: dir(u.charts, 'understand/charts/'),
  segments: file(u.segments, 'understand/segments.json'),
  anomalies: file(u.anomalies, 'understand/anomalies.json'),
  insights: file(dd.insights, 'decide/insights.json'),
  recommendations: file(dd.recommendations, 'decide/recommendations.json'),
  simulations: dir(dd.simulations, 'decide/simulations/'),
  goals: file(dd.goals, 'decide/goals.json'),
  forecast: file(m.forecast, 'monitor/forecast.json'),
  goalProgress: file(m.goal_progress, 'monitor/goal_progress.json'),
  alerts: file(m.alerts, 'monitor/alerts.json'),
  runLog: '/data/meta/run_log.json',
  summary: '/data/meta/summary.json',
  contract: '/data/meta/contract.json'
}
P.chartsIndex = P.charts + 'index.json'

export const PROJECT = CONTRACT.project || {}
