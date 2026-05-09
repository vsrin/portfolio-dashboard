import { useState, useEffect } from 'react'
import Header from './components/Header'
import KPIBar from './components/KPIBar'
import PerformanceChart from './components/PerformanceChart'
import AllocationChart from './components/AllocationChart'
import SleeveGrid from './components/SleeveGrid'
import AccountsTable from './components/AccountsTable'
import FeePanel from './components/FeePanel'
import TransactionTable from './components/TransactionTable'
import BenchmarkBar from './components/BenchmarkBar'
import PerformanceMatrix from './components/PerformanceMatrix'
import AlternativesPanel from './components/AlternativesPanel'
import InsightsPanel from './components/InsightsPanel'
import ChatPanel from './components/ChatPanel'
import ManagerScorecard from './components/ManagerScorecard'
import TargetDatePanel from './components/TargetDatePanel'
import RiskPanel from './components/RiskPanel'
import { InfoProvider } from './context/InfoContext'
import InfoDrawer from './components/InfoDrawer'

const TABS = [
  { id: 'overview',      label: 'Overview' },
  { id: 'performance',   label: 'My Insights' },
  { id: 'accounts',      label: 'Accounts' },
  { id: 'fees',          label: 'Fees & Costs' },
  { id: 'transactions',  label: 'Transactions' },
]

const PERF_SUBTABS = [
  { id: 'portfolio',  label: 'Portfolio' },
  { id: 'equity',     label: 'Equity' },
  { id: 'alts',       label: 'Alternatives' },
  { id: 'risk',       label: 'Risk & Planning' },
]

export default function App() {
  const [activeTab, setActiveTab]   = useState('overview')
  const [perfSubtab, setPerfSubtab] = useState('portfolio')
  const [equityView, setEquityView] = useState('scorecard')
  const [theme, setTheme]           = useState(() =>
    localStorage.getItem('theme') || 'light'
  )

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.dataset.theme = 'dark'
    } else {
      delete document.documentElement.dataset.theme
    }
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light')

  return (
    <InfoProvider>
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      <ChatPanel />
      <Header theme={theme} onToggleTheme={toggleTheme} />
      <KPIBar />
      <BenchmarkBar />

      {/* Tab nav */}
      <div className="tab-nav" style={{
        borderBottom: '1px solid var(--border)',
        padding: '0 24px',
        display: 'flex',
        gap: 0,
      }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '12px 18px',
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              color: activeTab === t.id ? 'var(--cyan)' : 'var(--text-muted)',
              borderBottom: activeTab === t.id
                ? '2px solid var(--cyan)'
                : '2px solid transparent',
              marginBottom: -1,
              transition: 'color 0.15s',
              fontFamily: 'var(--font-ui)',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="app-content" style={{ padding: '24px', maxWidth: 1600, margin: '0 auto' }}>

        {activeTab === 'overview' && (
          <div style={{ display: 'grid', gap: 20 }}>
            <div className="overview-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
              <PerformanceChart />
              <AllocationChart />
            </div>
            <SleeveGrid compact />
          </div>
        )}

        {activeTab === 'performance' && (
          <div>
            {/* Sub-tab nav */}
            <div style={{
              display: 'flex',
              gap: 4,
              marginBottom: 20,
              padding: '4px',
              background: 'var(--bg-card)',
              borderRadius: 6,
              border: '1px solid var(--border)',
              width: 'fit-content',
            }}>
              {PERF_SUBTABS.map(st => (
                <button
                  key={st.id}
                  onClick={() => setPerfSubtab(st.id)}
                  style={{
                    background: perfSubtab === st.id ? 'var(--cyan)' : 'transparent',
                    border: 'none',
                    borderRadius: 4,
                    color: perfSubtab === st.id ? 'var(--bg-base)' : 'var(--text-muted)',
                    padding: '6px 16px',
                    fontSize: 11,
                    fontWeight: perfSubtab === st.id ? 700 : 400,
                    cursor: 'pointer',
                    letterSpacing: '0.04em',
                    fontFamily: 'var(--font-ui)',
                    transition: 'all 0.15s',
                  }}
                >
                  {st.label}
                </button>
              ))}
            </div>

            {perfSubtab === 'portfolio' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <InsightsPanel />
                <TargetDatePanel />
              </div>
            )}
            {perfSubtab === 'equity' && (
              <div>
                {/* Equity view toggle */}
                <div style={{
                  display: 'flex', gap: 4, marginBottom: 20,
                  padding: 4, background: 'var(--bg-card)',
                  borderRadius: 6, border: '1px solid var(--border)',
                  width: 'fit-content',
                }}>
                  {[['scorecard', 'Scorecard'], ['raw', 'Raw Returns']].map(([v, lbl]) => (
                    <button key={v} onClick={() => setEquityView(v)} style={{
                      background: equityView === v ? 'var(--cyan)' : 'transparent',
                      border: 'none', borderRadius: 4,
                      color: equityView === v ? 'var(--bg-base)' : 'var(--text-muted)',
                      padding: '6px 16px', fontSize: 11,
                      fontWeight: equityView === v ? 700 : 400,
                      cursor: 'pointer', letterSpacing: '0.04em',
                      fontFamily: 'var(--font-ui)', transition: 'all 0.15s',
                    }}>{lbl}</button>
                  ))}
                </div>
                {equityView === 'scorecard' ? <ManagerScorecard /> : <PerformanceMatrix />}
              </div>
            )}
            {perfSubtab === 'alts'      && <AlternativesPanel />}
            {perfSubtab === 'risk'      && <RiskPanel />}
          </div>
        )}

        {activeTab === 'accounts'      && <AccountsTable />}
        {activeTab === 'fees'          && <FeePanel />}
        {activeTab === 'transactions'  && <TransactionTable />}
      </div>
    </div>
    <InfoDrawer />
    </InfoProvider>
  )
}
