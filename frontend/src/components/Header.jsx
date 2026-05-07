import { useApi } from '../hooks/useApi'
import { fmt$, fmtDate } from '../utils/formatters'

export default function Header({ theme, onToggleTheme }) {
  const { data } = useApi('/summary')
  const isDark = theme === 'dark'

  return (
    <div style={{
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
          <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
            SRINIVASAN HOUSEHOLD · ALLSOURCE ADVISORY
          </div>
        </div>
      </div>

      {/* Right: theme toggle + AUM */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>

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
          <div style={{
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
      </div>
    </div>
  )
}
