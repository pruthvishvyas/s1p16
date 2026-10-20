import { useData } from '../useData.js'
import { P } from '../../utils/contract.js'

export function useInsights() {
  return useData(P.insights)
}
