import { useMemo, useState } from 'react'
import { PROJECT } from '../../utils/contract.js'
import { buildManual } from '../../utils/manualContent.js'
import { useTerm } from '../shared/TerminologyProvider.jsx'
import { ManualSection } from './ManualSection.jsx'
import { GlossaryTable } from './GlossaryTable.jsx'

export function UserManual() {
  const term = useTerm()
  const [query, setQuery] = useState('')
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const { sections, glossary } = useMemo(() => buildManual(term, origin), [term, origin])
  const q = query.trim().toLowerCase()
  const shown = sections.filter((s) => !q || (s.title + ' ' + s.items.map((i) => i.h + ' ' + i.p).join(' ')).toLowerCase().includes(q))
  const gl = glossary.filter((g) => !q || (g.term + ' ' + g.meaning).toLowerCase().includes(q))
  return (
    <div className="manual">
      <div className="toolbar no-print">
        <input className="input" placeholder="Search the manual..." value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search the manual" />
        <button className="btn" onClick={() => window.print()}>Print manual</button>
      </div>
      <h2 className="manual-title">{PROJECT.name} - Your Analytics Guide</h2>
      {shown.length === 0 && gl.length === 0 && <p className="muted">Nothing matches "{query}".</p>}
      {shown.map((s) => <ManualSection key={s.id} section={s} query={query} />)}
      <GlossaryTable glossary={gl} />
    </div>
  )
}
