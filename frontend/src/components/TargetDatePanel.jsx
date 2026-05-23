/**
 * TargetDatePanel — compares portfolio vs Vanguard target-date funds (VTTHX / VFORX)
 * Uses simplified lump-sum model on cost basis.
 */
import { useApi } from '../hooks/useApi'
import { fmt$ } from '../utils/formatters'
import InfoButton from './InfoButton'
import { getWidgetInfo } from '../data/widgetInfo'

export default function TargetDatePanel() {
  const { data, loading } = useApi('/target-date')

  if (loading) return (
    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading target-date comparison…</div>
  )
  if (!data) return null

  const primary   = data.target_date.primary
  const secondary = data.target_date.secondary
  const portVal   = data.portfolio_value
  const portRet   = data.portfolio_return_pct
  const priDiff   = primary.dollar_difference    // positive = portfolio beat fund
  const secDiff   = secondary.dollar_difference  // positive = portfolio beat fund

  const fmtPct = (p) => p !== null ? `${p > 0 ? '+' : ''}${p.toFixed(2)}%` : '–'
  const diffColor = (d) => d >= 0 ? 'var(--green)' : 'var(--red)'
  const diffArrow = (d) => d >= 0 ? '▲' : '▼'

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Target-Date Fund Comparison</span>
        <InfoButton title={getWidgetInfo('targetDate', 'owner', data)?.title} content={getWidgetInfo('targetDate', 'owner', data)?.content} />
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
          Age {data.user_age} &mdash; simplified lump-sum model &middot; {data.inception} &rarr; {data.as_of}
        </span>
      </div>

      {/* Primary comparison headline */}
      <div style={{
        padding: '16px 20px', marginBottom: 20,
        background: priDiff >= 0 ? 'rgba(0,230,118,0.07)' : 'rgba(255,82,82,0.07)',
        border: `1px solid ${priDiff >= 0 ? 'rgba(0,230,118,0.2)' : 'rgba(255,82,82,0.2)'}`,
        borderRadius: 6,
      }}>
        <div className="target-compare" style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 24, alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 6 }}>YOUR PORTFOLIO</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 800, color: 'var(--cyan)', lineHeight: 1 }}>
              {fmtPct(portRet)}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
              {fmt$(portVal, 0)} today
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 18, color: 'var(--text-muted)' }}>vs</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 800, color: diffColor(priDiff), marginTop: 8 }}>
              {diffArrow(priDiff)} {priDiff >= 0 ? '+' : ''}{fmt$(priDiff, 0)}
            </div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.06em', marginTop: 4 }}>VS VTTHX 2035</div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 6 }}>VANGUARD TARGET 2035</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 800, color: 'var(--text-muted)', lineHeight: 1 }}>
              {fmtPct(primary.return_pct)}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--text-muted)', marginTop: 4 }}>
              {fmt$(primary.hypothetical_value, 0)} hypothetical
            </div>
          </div>
        </div>
      </div>

      {/* Comparison table */}
      <div style={{ overflowX: 'auto', marginBottom: 16 }}>
        <table style={{ fontSize: 12, width: '100%' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }} />
              <th>Your Portfolio</th>
              <th>{primary.ticker} 2035</th>
              <th>{secondary.ticker} 2040</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ color: 'var(--text-muted)', textAlign: 'left' }}>Return ITD</td>
              <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--cyan)' }}>{fmtPct(portRet)}</td>
              <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{fmtPct(primary.return_pct)}</td>
              <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{fmtPct(secondary.return_pct)}</td>
            </tr>
            <tr>
              <td style={{ color: 'var(--text-muted)', textAlign: 'left' }}>Hypothetical Value</td>
              <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-primary)' }}>{fmt$(portVal, 0)}</td>
              <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{fmt$(primary.hypothetical_value, 0)}</td>
              <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{fmt$(secondary.hypothetical_value, 0)}</td>
            </tr>
            <tr>
              <td style={{ color: 'var(--text-muted)', textAlign: 'left' }}>vs Your Portfolio</td>
              <td style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>&mdash;</td>
              <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: diffColor(priDiff) }}>
                {priDiff >= 0 ? '+' : ''}{fmt$(priDiff, 0)}
              </td>
              <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: diffColor(secDiff) }}>
                {secDiff >= 0 ? '+' : ''}{fmt$(secDiff, 0)}
              </td>
            </tr>
            <tr>
              <td style={{ color: 'var(--text-muted)', textAlign: 'left' }}>Allocation</td>
              <td style={{ color: 'var(--text-secondary)', fontSize: 11 }}>38% equity / 57% alts / 5% cash</td>
              <td style={{ color: 'var(--text-muted)', fontSize: 11 }}>{primary.allocation}</td>
              <td style={{ color: 'var(--text-muted)', fontSize: 11 }}>{secondary.allocation}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Caveat */}
      <div style={{ padding: '10px 14px', background: 'rgba(255,179,0,0.06)', border: '1px solid rgba(255,179,0,0.2)', borderRadius: 5, fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6 }}>
        <strong style={{ color: 'var(--amber)' }}>Context: </strong>{data.caveat} This comparison uses a simplified lump-sum model &mdash; actual cash-weighted returns would differ.
      </div>
    </div>
  )
}
