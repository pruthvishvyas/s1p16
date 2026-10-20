import { useData } from '../useData.js'
import { P } from '../../utils/contract.js'

export function useSegments() {
  return useData(P.segments)
}
