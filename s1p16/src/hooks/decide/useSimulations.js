import { useDataMany } from '../useData.js'
import { P } from '../../utils/contract.js'
import { SIM_FILES } from '../../generated.js'

export function useSimulations() {
  const r = useDataMany(SIM_FILES.length ? SIM_FILES.map((f) => P.simulations + f) : null)
  return { sims: r.data.filter(Boolean), loading: r.loading, error: SIM_FILES.length ? r.error : 'No simulation files listed in the contract' }
}
