import { useData } from '../useData.js'
import { P } from '../../utils/contract.js'

export function useAnomalies() {
  return useData(P.anomalies)
}
