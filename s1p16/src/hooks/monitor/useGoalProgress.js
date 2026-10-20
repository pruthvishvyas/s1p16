import { useData } from '../useData.js'
import { P } from '../../utils/contract.js'

export function useGoalProgress() {
  return useData(P.goalProgress)
}
