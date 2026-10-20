import { useEffect, useState } from 'react'

// Single point of truth for loading JSON: validates status, emptiness, JSON syntax and basic shape.
export async function fetchJSON(path, signal) {
  const res = await fetch(path, { signal, cache: 'no-cache' })
  if (!res.ok) throw new Error('HTTP ' + res.status + ' loading ' + path)
  const text = await res.text()
  if (!text || !text.trim()) throw new Error('Empty file at ' + path)
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch (e) {
    throw new Error('Invalid JSON at ' + path + ' (the server may have returned a web page instead of data)')
  }
  if (parsed === null || typeof parsed !== 'object') throw new Error('Unexpected data shape at ' + path)
  return parsed
}

export function useData(path, options = {}) {
  const { transform, fallback = null } = options
  const [state, setState] = useState({ data: null, loading: !!path, error: null })

  useEffect(() => {
    if (!path) {
      setState({ data: null, loading: false, error: null })
      return undefined
    }
    const controller = new AbortController()
    setState((s) => ({ data: s.data, loading: true, error: null }))
    fetchJSON(path, controller.signal)
      .then((parsed) => (transform ? transform(parsed) : parsed))
      .then((result) => {
        if (!controller.signal.aborted) setState({ data: result, loading: false, error: null })
      })
      .catch((err) => {
        if (err && err.name === 'AbortError') return
        console.error('useData error [' + path + ']:', err && err.message)
        if (!controller.signal.aborted) setState({ data: fallback, loading: false, error: (err && err.message) || 'Failed to load' })
      })
    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path])

  return state
}

// Several files at once (same validation per file). A failed file gives null in its slot.
export function useDataMany(paths) {
  const key = paths ? JSON.stringify(paths) : ''
  const [state, setState] = useState({ data: [], loading: !!(paths && paths.length), error: null })

  useEffect(() => {
    if (!paths || paths.length === 0) {
      setState({ data: [], loading: false, error: null })
      return undefined
    }
    const controller = new AbortController()
    setState((s) => ({ data: s.data, loading: true, error: null }))
    Promise.allSettled(paths.map((p) => fetchJSON(p, controller.signal))).then((results) => {
      if (controller.signal.aborted) return
      const firstErr = results.find((r) => r.status === 'rejected')
      setState({ data: results.map((r) => (r.status === 'fulfilled' ? r.value : null)), loading: false, error: firstErr ? String(firstErr.reason && firstErr.reason.message) : null })
    })
    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return state
}
