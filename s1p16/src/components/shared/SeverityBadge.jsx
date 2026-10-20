import { toneOf } from '../../utils/colors.js'

const LABELS = { HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low', ON_TRACK: 'On track', OFF_TRACK: 'Off track', NOT_SET: 'Not set', NO_DATA: 'No data', P1_URGENT: 'P1 Urgent', P2_HIGH: 'P2 High', P3_MEDIUM: 'P3 Medium', P4_ROUTINE: 'P4 Routine' }

export function SeverityBadge({ level, tone }) {
  const t = tone || toneOf(level)
  return <span className={'badge badge--' + t}>{LABELS[String(level).toUpperCase()] || String(level)}</span>
}
