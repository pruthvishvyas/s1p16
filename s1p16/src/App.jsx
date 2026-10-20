import { Navigate, Route, Routes } from 'react-router-dom'
import { TerminologyProvider } from './components/shared/TerminologyProvider.jsx'
import { OutcomeProvider } from './context/OutcomeContext.jsx'
import { ExplorerProvider } from './context/ExplorerContext.jsx'
import Dashboard from './pages/Dashboard.jsx'
import { TABS } from './utils/tabs.js'

export default function App() {
  return (
    <TerminologyProvider>
      <OutcomeProvider>
        <ExplorerProvider>
          <Routes>
            <Route path="/" element={<Navigate to={'/' + TABS[0].id} replace />} />
            <Route path="/:tab" element={<Dashboard />} />
            <Route path="*" element={<Navigate to={'/' + TABS[0].id} replace />} />
          </Routes>
        </ExplorerProvider>
      </OutcomeProvider>
    </TerminologyProvider>
  )
}
