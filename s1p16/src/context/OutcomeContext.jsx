import { createContext, useCallback, useContext, useState } from 'react'

const OutcomeContext = createContext({ outcome: 'UNDERSTAND', setOutcome: () => {}, goalOverrides: {}, setGoalOverride: () => {}, resetGoalOverrides: () => {} })

function readOverrides() {
  try {
    const raw = localStorage.getItem('goal_overrides')
    const parsed = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch (e) {
    return {}
  }
}

export function OutcomeProvider({ children }) {
  const [outcome, setOutcome] = useState('UNDERSTAND')
  const [goalOverrides, setOverrides] = useState(readOverrides)

  const setGoalOverride = useCallback((key, value) => {
    setOverrides((prev) => {
      const next = { ...prev }
      if (value === '' || value === null || value === undefined || isNaN(Number(value))) delete next[key]
      else next[key] = Number(value)
      try { localStorage.setItem('goal_overrides', JSON.stringify(next)) } catch (e) {}
      return next
    })
  }, [])

  const resetGoalOverrides = useCallback(() => {
    setOverrides({})
    try { localStorage.removeItem('goal_overrides') } catch (e) {}
  }, [])

  return <OutcomeContext.Provider value={{ outcome, setOutcome, goalOverrides, setGoalOverride, resetGoalOverrides }}>{children}</OutcomeContext.Provider>
}

export function useOutcome() {
  return useContext(OutcomeContext)
}
