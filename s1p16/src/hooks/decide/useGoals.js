import { useData } from '../useData.js'
import { P } from '../../utils/contract.js'

export function useGoals() {
  return useData(P.goals)
}
