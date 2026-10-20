import { useData } from '../useData.js'
import { P } from '../../utils/contract.js'

export function useRunLog() {
  return useData(P.runLog)
}
