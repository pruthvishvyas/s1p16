import { useCallback, useState } from 'react'
import { useData } from '../useData.js'
import { P } from '../../utils/contract.js'

export function useForecast() {
  return useData(P.forecast)
}

// Calls the Worker (/api). In local dev (no worker) it falls back to the loaded forecast file.
export function usePredict(forecast) {
  const [state, setState] = useState({ loading: false, result: null, error: null })

  const predict = useCallback(async (days) => {
    const n = Number(days)
    if (days === '' || days === null || isNaN(n)) {
      setState({ loading: false, result: null, error: 'Enter a number of days ahead (for example 7).' })
      return
    }
    setState({ loading: true, result: null, error: null })
    try {
      const res = await fetch('/api', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ input: Number(n) }) })
      const text = await res.text()
      let body = null
      try { body = JSON.parse(text) } catch (e) { body = null }
      if (body && res.ok) {
        if (body.prediction === undefined || body.prediction === null) throw new Error('The forecast service returned no prediction.')
        setState({ loading: false, result: { ...body, source: 'live' }, error: null })
        return
      }
      if (body && body.error) throw new Error(body.error)
      const rows = forecast && Array.isArray(forecast.forecast) ? forecast.forecast : []
      if (rows.length === 0) throw new Error('Forecast service is not available and no local forecast was loaded.')
      const idx = Math.min(Math.max(Math.round(n), 1), rows.length) - 1
      const r = rows[idx]
      setState({ loading: false, result: { prediction: r.forecast_revenue, range_low: r.lower_80, range_high: r.upper_80, date: r.date, nearest_key: idx + 1, input_received: n, source: 'local' }, error: null })
    } catch (e) {
      setState({ loading: false, result: null, error: e.message || 'Forecast request failed' })
    }
  }, [forecast])

  return { ...state, predict }
}
