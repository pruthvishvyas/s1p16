import { useData, useDataMany } from '../useData.js'
import { P } from '../../utils/contract.js'

export function useCharts() {
  const idx = useData(P.chartsIndex)
  const ids = idx.data && Array.isArray(idx.data.charts) ? idx.data.charts : null
  const many = useDataMany(ids ? ids.map((id) => P.charts + id + '.json') : null)
  return {
    charts: many.data.filter(Boolean),
    loading: idx.loading || many.loading,
    error: idx.error || (many.data.length === 0 ? many.error : null)
  }
}
