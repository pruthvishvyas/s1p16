import { useData } from '../useData.js'
import { P } from '../../utils/contract.js'

export function useKPIs() {
  return useData(P.kpis)
}
