import { createContext, useCallback, useContext, useMemo, useState } from 'react'

export const ExplorerContext = createContext({ filters: {}, setFilter: () => {}, toggleFilter: () => {}, clearFilters: () => {}, activeFilters: 0, selected: null, setSelected: () => {} })

export function ExplorerProvider({ children }) {
  const [filters, setFilters] = useState({})
  const [selected, setSelected] = useState(null)

  const setFilter = useCallback((dimension, value) => {
    setFilters((prev) => {
      const next = { ...prev }
      if (value === null || value === undefined || value === '' || value === 'ALL') delete next[dimension]
      else next[dimension] = value
      return next
    })
  }, [])

  const toggleFilter = useCallback((dimension, value) => {
    setFilters((prev) => {
      const next = { ...prev }
      if (next[dimension] === value) delete next[dimension]
      else next[dimension] = value
      return next
    })
    setSelected((prev) => (prev && prev.dimension === dimension && prev.value === value ? null : { dimension, value }))
  }, [])

  const clearFilters = useCallback(() => {
    setFilters({})
    setSelected(null)
  }, [])

  const value = useMemo(() => ({ filters, setFilter, toggleFilter, clearFilters, activeFilters: Object.keys(filters).length, selected, setSelected }), [filters, selected, setFilter, toggleFilter, clearFilters])
  return <ExplorerContext.Provider value={value}>{children}</ExplorerContext.Provider>
}

export function useExplorer() {
  return useContext(ExplorerContext)
}
