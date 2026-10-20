function Highlight({ text, query }) {
  const q = query.trim()
  if (!q) return text
  const safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const parts = String(text).split(new RegExp('(' + safe + ')', 'gi'))
  return parts.map((p, i) => (p.toLowerCase() === q.toLowerCase() ? <mark key={i}>{p}</mark> : p))
}

export function ManualSection({ section, query }) {
  return (
    <section className="card manual-section" id={'manual-' + section.id}>
      <div className="manual-outcome">{section.outcome}</div>
      <h2 className="card-title"><Highlight text={section.title} query={query} /></h2>
      {section.items.map((it, i) => (
        <div key={i} className="manual-item">
          <h4><Highlight text={it.h} query={query} /></h4>
          <p><Highlight text={it.p} query={query} /></p>
        </div>
      ))}
    </section>
  )
}
