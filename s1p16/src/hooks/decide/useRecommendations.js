import { useData } from '../useData.js'
import { P } from '../../utils/contract.js'

export function useRecommendations() {
  return useData(P.recommendations)
}
