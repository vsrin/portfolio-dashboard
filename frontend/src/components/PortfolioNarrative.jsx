import { useApi } from '../hooks/useApi'
import { fmt$, fmtPct } from '../utils/formatters'

export default function PortfolioNarrative() {
  const { data: s }  = useApi('/summary')
  const { data: bm } = useApi('/benchmarks')

  if (!s) return null

  const alpha      = bm?.alpha_itd
  const benchmark  = bm?.benchmark_itd
  const ytdFlat    = s.net_irr_ytd != null && Math.abs(s.net_irr_ytd) < 0.5
  const alphaPos   = alpha != null && alpha > 0

  // Build the 3-part narrative
  const parts = []

  // 1 — Portfolio trajectory
  parts.push(
    `Since inception in July 2024, this portfolio has grown from roughly ${fmt$(s.cost_basis)} to ${fmt$(s.total_value)} — a net gain of ${fmt$(s.total_gain)} (${fmtPct(s.total_gain_pct)} return, time-weighted by Tamarac).`
  )

  // 2 — Sleeve breakdown
  const equityPct = s.equity_pct?.toFixed(0)
  const altsPct   = s.alternatives_pct?.toFixed(0)
  parts.push(
    `Equity (${equityPct}% of AUM) is leading at ${fmtPct(s.equity_return_pct)} since inception. Alternatives (${altsPct}% of AUM at ${fmt$(s.alternatives_value)}) are up ${fmtPct(s.alternatives_return_pct)} — performing as expected given the J-curve effect in private markets, where early-stage capital calls produce near-zero returns before distributions begin.`
  )

  // 3 — Benchmark + YTD context
  if (alphaPos && benchmark != null) {
    parts.push(
      `Against a blended passive benchmark (${fmtPct(benchmark)} ITD), this portfolio is ahead by ${fmtPct(alpha)} — that's the net value active management has added so far.${ytdFlat ? ` Year-to-date 2026 is nearly flat at ${fmtPct(s.net_irr_ytd)}, reflecting broad market volatility and the lag in alternatives valuations, which are marked quarterly.` : ` Year-to-date performance is ${fmtPct(s.net_irr_ytd)}.`}`
    )
  } else if (benchmark != null) {
    parts.push(
      `The blended passive benchmark has returned ${fmtPct(benchmark)} over the same period.${ytdFlat ? ` Year-to-date 2026 is nearly flat at ${fmtPct(s.net_irr_ytd)}, consistent with broader market conditions.` : ''}`
    )
  }

  // 4 — Fee context
  const totalFees = (s.total_fees || 0) + (s.fee_gap || 0)
  if (totalFees > 0) {
    parts.push(
      `Total cost of management is approximately ${fmt$(totalFees)} annually — ${fmt$(s.total_fees)} in direct advisor fees and ${fmt$(s.fee_gap)} embedded in sub-manager funds. That's ${((totalFees / s.total_value) * 100).toFixed(1)}% of AUM per year, the hurdle rate active management needs to clear to justify itself.`
    )
  }

  return (
    <div style={{
      background:   'var(--bg-card)',
      border:       '1px solid var(--border)',
      borderTop:    '2px solid var(--cyan)',
      borderRadius: 'var(--radius-lg)',
      padding:      '20px 24px',
      marginBottom: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span style={{ fontSize: 10, color: 'var(--cyan)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Portfolio Narrative</span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>— plain-English summary as of {s.as_of || 'May 5, 2026'}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {parts.map((p, i) => (
          <p key={i} style={{
            margin:      0,
            fontSize:    13,
            color:       'var(--text-secondary)',
            lineHeight:  1.75,
            fontFamily:  'var(--font-ui)',
          }}>
            {i === 0 && <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Bottom line: </strong>}
            {p}
          </p>
        ))}
      </div>
    </div>
  )
}
