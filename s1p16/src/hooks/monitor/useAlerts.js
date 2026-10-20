import { useData } from '../useData.js'
import { P } from '../../utils/contract.js'

export function useAlerts() {
  return useData(P.alerts)
}
