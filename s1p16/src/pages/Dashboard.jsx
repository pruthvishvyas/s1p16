import { useEffect, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { Sidebar } from '../components/shared/Sidebar.jsx'
import { Header } from '../components/shared/Header.jsx'
import { ErrorBoundary } from '../components/shared/ErrorBoundary.jsx'
import { KPICards } from '../components/understand/KPICards.jsx'
import { ChartPanel } from '../components/understand/ChartPanel.jsx'
import { SegmentExplorer } from '../components/understand/SegmentExplorer.jsx'
import { AnomalyTable } from '../components/understand/AnomalyTable.jsx'
import { InsightCards } from '../components/decide/InsightCards.jsx'
import { RecommendationEngine } from '../components/decide/RecommendationEngine.jsx'
import { WhatIfSimulator } from '../components/decide/WhatIfSimulator.jsx'
import { GoalTracker } from '../components/decide/GoalTracker.jsx'
import { Forecaster } from '../components/monitor/Forecaster.jsx'
import { GoalProgress } from '../components/monitor/GoalProgress.jsx'
import { AlertCenter } from '../components/monitor/AlertCenter.jsx'
import { InteractiveExplorer } from '../components/explorer/InteractiveExplorer.jsx'
import { UserManual } from '../components/manual/UserManual.jsx'
import { useOutcome } from '../context/OutcomeContext.jsx'
import { TABS } from '../utils/tabs.js'

function renderTab(id) {
  switch (id) {
    case 'numbers': return <KPICards />
    case 'analysis': return <ChartPanel outcome="UNDERSTAND" />
    case 'segments': return <SegmentExplorer />
    case 'anomalies': return <AnomalyTable />
    case 'insights': return (<><InsightCards /><ChartPanel outcome="DECIDE" title="Supporting charts" /></>)
    case 'recommendations': return <RecommendationEngine />
    case 'whatif': return <WhatIfSimulator />
    case 'goals': return <GoalTracker />
    case 'forecast': return (<><Forecaster /><ChartPanel outcome="MONITOR" title="Trends" /></>)
    case 'progress': return <GoalProgress />
    case 'alerts': return <AlertCenter />
    case 'explorer': return <InteractiveExplorer />
    case 'manual': return <UserManual />
    default: return null
  }
}

export default function Dashboard() {
  const { tab } = useParams()
  const { setOutcome } = useOutcome()
  const [menu, setMenu] = useState(false)
  const current = TABS.find((t) => t.id === tab)

  useEffect(() => {
    if (current) setOutcome(current.outcome)
    setMenu(false)
    window.scrollTo(0, 0)
  }, [tab]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!current) return <Navigate to={'/' + TABS[0].id} replace />
  return (
    <div className="layout">
      <Sidebar open={menu} onNavigate={() => setMenu(false)} />
      {menu && <div className="scrim" onClick={() => setMenu(false)} />}
      <div className="main">
        <Header title={current.label} outcome={current.outcome === 'TOOLS' ? null : current.outcome} onMenu={() => setMenu((m) => !m)} />
        <main className="content">
          <ErrorBoundary resetKey={tab} message="This section could not be displayed.">
            {renderTab(current.id)}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}
