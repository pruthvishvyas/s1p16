import { createContext, useContext } from 'react'
import { makeTerm } from '../utils/terminology.js'

export const TerminologyContext = createContext(makeTerm({}))
export function useTerm() {
  return useContext(TerminologyContext)
}
