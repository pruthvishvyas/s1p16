import { useData } from '../useData.js'
import { P } from '../../utils/contract.js'

export function useContract() {
  return useData(P.contract)
}
