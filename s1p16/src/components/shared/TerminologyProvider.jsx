import { useMemo } from 'react'
import { CONTRACT } from '../../generated.js'
import { makeTerm } from '../../utils/terminology.js'
import { TerminologyContext, useTerm } from '../../context/TerminologyContext.jsx'

export function TerminologyProvider({ children }) {
  const term = useMemo(() => makeTerm(CONTRACT.terminology), [])
  return <TerminologyContext.Provider value={term}>{children}</TerminologyContext.Provider>
}

export { useTerm }
