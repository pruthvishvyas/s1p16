export const TABS = [
  { id: 'numbers', label: 'Your Numbers', outcome: 'UNDERSTAND' },
  { id: 'analysis', label: 'Analysis', outcome: 'UNDERSTAND' },
  { id: 'segments', label: 'Segments', outcome: 'UNDERSTAND' },
  { id: 'anomalies', label: 'Unusual Activity', outcome: 'UNDERSTAND' },
  { id: 'insights', label: 'Insights', outcome: 'DECIDE' },
  { id: 'recommendations', label: 'Recommendations', outcome: 'DECIDE' },
  { id: 'whatif', label: 'What-If Simulator', outcome: 'DECIDE' },
  { id: 'goals', label: 'Goals', outcome: 'DECIDE' },
  { id: 'forecast', label: 'Forecast', outcome: 'MONITOR' },
  { id: 'progress', label: 'Goal Progress', outcome: 'MONITOR' },
  { id: 'alerts', label: 'Alerts', outcome: 'MONITOR' },
  { id: 'explorer', label: 'Explorer', outcome: 'TOOLS' },
  { id: 'manual', label: 'User Manual', outcome: 'TOOLS' }
]
export const OUTCOME_ORDER = ['UNDERSTAND', 'DECIDE', 'MONITOR', 'TOOLS']
export const OUTCOME_HINT = {
  UNDERSTAND: 'What is happening now?',
  DECIDE: 'What should I do?',
  MONITOR: 'Am I on track?',
  TOOLS: 'Explore and learn'
}
