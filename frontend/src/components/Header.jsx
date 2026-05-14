import { useState } from 'react'
import { useApi } from '../hooks/useApi'
import { fmt$, fmtDate } from '../utils/formatters'
import { generateInsightsToken } from '../utils/insightsAuth'

export default function Header({ theme, onToggleTheme, user, onLogout, role = 'owner', name = 'Vinod' }) {
  const { data } = useApi('/summary')
  const isDark = theme === 'dark'
  const [copied, setCopied] = useState(false)

  const handleShareInsights = async () => {
    const token = await generateInsightsToken()
    const url = `${window.location.origin}${window.location.pathname}?insights=${token}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div className="app-header" style={{
      background: 'var(--bg-surface)',
      borderBottom: '1px solid var(--border)',
      padding: '14px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}>
      {/* Left: branding */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{
          width: 32, height: 32,
          background: 'linear-gradient(135deg, var(--cyan), var(--cyan-dim))',
          borderRadius: 6,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, fontWeight: 800, color: '#fff',
          fontFamily: 'var(--font-mono)',
        }}>P</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.02em' }}>
            PORTFOLIO INTELLIGENCE
          </div>
          <div className="app-header-sub" style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
            SRINIVASAN HOUSEHOLD · ALLSOURCE ADVISORY
          </div>
        </div>
      </div>

      {/* Right: theme toggle + AUM */}
      <div className="app-header-right" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>

        {/* Theme toggle */}
        <button
          onClick={onToggleTheme}
          title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'var(--bg-input)',
            border: '1px solid var(--border-light)',
            borderRadius: 20,
            padding: '5px 12px',
            cursor: 'pointer',
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--text-secondary)',
            letterSpacing: '0.04em',
            transition: 'all 0.2s',
            fontFamily: 'var(--font-ui)',
          }}
        >
          <span style={{ fontSize: 13 }}>{isDark ? '☀' : '◑'}</span>
          {isDark ? 'Light' : 'Dark'}
        </button>

        {/* AUM */}
        <div style={{ textAlign: 'right' }}>
          <div className="app-header-aum" style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 22,
            fontWeight: 600,
            color: 'var(--cyan)',
            letterSpacing: '-0.02em',
          }}>
            {data ? fmt$(data.total_value) : '—'}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em', marginTop: 2 }}>
            TOTAL AUM · AS OF {data ? fmtDate(data.as_of_date) : '…'}
          </div>
        </div>

        {/* Share Insights — owner only */}
        {role === 'owner' && (
          <button
            onClick={handleShareInsights}
            title="Copy a link that gives Patrick access to the Insights tab for today"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: copied ? 'var(--green)' : 'var(--bg-input)',
              border: `1px solid ${copied ? 'var(--green)' : 'var(--border-light)'}`,
              borderRadius: 20, padding: '5px 12px', cursor: 'pointer',
              fontSize: 11, fontWeight: 600,
              color: copied ? '#000' : 'var(--text-secondary)',
              letterSpacing: '0.04em', transition: 'all 0.2s',
              fontFamily: 'var(--font-ui)',
            }}
          >
            <span style={{ fontSize: 12 }}>{copied ? '✓' : '🔗'}</span>
            {copied ? 'Copied!' : 'Share Insights'}
          </button>
        )}

        {/* Advisor badge */}
        {role === 'advisor' && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(0,212,255,0.08)', border: '1px solid var(--cyan)',
            borderRadius: 20, padding: '5px 12px',
            fontSize: 11, fontWeight: 600, color: 'var(--cyan)',
            letterSpacing: '0.04em', fontFamily: 'var(--font-ui)',
          }}>
            <span style={{ fontSize: 10 }}>◆</span> Advisor View
          </div>
        )}

        {/* User + logout */}
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderLeft: '1px solid var(--border)', paddingLeft: 20 }}>
            {user.picture && (
              <img src={user.picture} alt={user.name} style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid var(--border)' }} />
            )}
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>{name}</div>
              <button
                onClick={onLogout}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 10, color: 'var(--text-muted)', padding: 0,
                  fontFamily: 'var(--font-ui)', letterSpacing: '0.04em',
                  textDecoration: 'underline',
                }}
              >
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
