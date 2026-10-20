export function makeTerm(map) {
  const safeMap = map || {}
  return function term(key, opts = {}) {
    const base = safeMap[key] || String(key)
    let out = base
    if (opts.plural && !/revenue$/i.test(base)) out = /s$/i.test(base) ? base : /y$/i.test(base) ? base.slice(0, -1) + 'ies' : base + 's'
    return opts.lower ? out.toLowerCase() : out
  }
}
