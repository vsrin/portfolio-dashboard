import { useApi } from '../hooks/useApi'
import { fmt$ } from '../utils/formatters'
import InfoButton from './InfoButton'
import { WIDGET_INFO } from '../data/widgetInfo'
import WandPanel from './WandPanel'

const SUPER_COLOR = {
  equity:       'var(--cyan)',
  alternatives: 'var(--amber)',
  cash:         'var(--text-muted)',
}

function AssetCard({ ac, compact }) {
  const color  = SUPER_COLOR[ac.super_category] || 'var(--cyan)'
  const isNeg  = ac.net_gain < 0
  const retColor = isNeg ? 'var(--red)' : 'var(--green)'

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderTop: `2px solid ${color}`,
        borderRadius: 'var(--radius-lg)',
        padding: compact ? 14 : 18,
        display: 'flex',
        flexDirection: 'column',
        gap: compact ? 8 : 12,
        transition: 'background 0.2s',
        cursor: 'default',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
      onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-card)'}
    >
      {/* Name + return badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: compact ? 11 : 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>
            {ac.label}
          </div>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            {ac.super_category}
          </div>
        </div>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 13,
          fontWeight: 700,
          color: retColor,
        }}>
          {ac.return_pct > 0 ? '+' : ''}{ac.return_pct.toFixed(2)}%
        </span>
      </div>

      {/* Value */}
      <div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: compact ? 16 : 20, fontWeight: 700, color }}>
          {fmt$(ac.value, 0)}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
          {ac.weight_pct.toFixed(2)}% of portfolio
        </div>
      </div>

      {/* Gain + income row (full mode only) */}
      {!compact && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div>
            <div style={{ fontSize: 9, color: 'var(--text-label)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 2 }}>
              Net Gain
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: retColor }}>
              {ac.net_gain >= 0 ? '+' : ''}{fmt$(ac.net_gain, 0)}
            </div>
          </div>
          {ac.income > 0 && (
            <div>
              <div style={{ fontSize: 9, color: 'var(--text-label)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 2 }}>
                Income
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--cyan)' }}>
                {fmt$(ac.income, 0)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function SleeveGrid({ compact }) {
  const { data, loading } = useApi('/asset-classes')

  if (loading) return (
    <div className="card">
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>
    </div>
  )

  const classes = [...(data || [])]
    .filter(ac => ac.super_category !== 'cash')
    .sort((a, b) => b.value - a.value)

  const equityCount = classes.filter(ac => ac.super_category === 'equity').length
  const altsCount   = classes.filter(ac => ac.super_category === 'alternatives').length
  const total       = classes.reduce((s, a) => s + a.value, 0)

  return (
    <div>
      {compact ? (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span className="card-title">Asset Classes</span>
            <InfoButton title={WIDGET_INFO.assetClassGrid.title} content={WIDGET_INFO.assetClassGrid.content} />
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {fmt$(total, 0)} · {classes.length} classes
          </span>
        </div>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Equity &amp; Alternatives</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                {fmt$(total, 0)} · {classes.length} asset classes
              </div>
            </div>
            <InfoButton title={WIDGET_INFO.assetClassGrid.title} content={WIDGET_INFO.assetClassGrid.content} />
          </div>
          <div className="pill cyan">{equityCount} equity · {altsCount} alts</div>
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: compact
          ? 'repeat(auto-fill, minmax(180px, 1fr))'
          : 'repeat(auto-fill, minmax(240px, 1fr))',
        gap: 14,
      }}>
        {classes.map(ac => <AssetCard key={ac.id} ac={ac} compact={compact} />)}
      </div>
      <WandPanel buildPrompt={() => {
        if (!classes.length) return null
        const top3 = [...classes].sort((a,b) => b.return_pct - a.return_pct).slice(0,3).map(c => `${c.label} +${c.return_pct?.toFixed(1)}%`).join(', ')
        const total = classes.reduce((s,c) => s + c.value, 0)
        const bottom3 = [...classes].sort((a,b) => a.return_pct - b.return_pct).slice(0,3).map(c => `${c.label} ${c.return_pct >= 0 ? '+' : ''}${c.return_pct?.toFixed(1)}%`).join(', ')
        return `You are a fiduciary financial advisor writing a structured advisory note. Use the exact data below. Format your response using the section headers shown.

DATA (${classes.length} asset classes | inception July 10, 2024 to May 5, 2026):
- Total AUM: $${total?.toLocaleString('en-US', {maximumFractionDigits:0})}
- Top 3 performers ITD: ${top3}
- Bottom 3 performers ITD: ${bottom3}

Write your response using exactly this structure. Use **bold** for asset class names and return figures.

**Leaders**
One sentence: name the top performers by return and assess whether their gains are sustainable or reflect elevated risk.

**Laggards**
One sentence: name the bottom performers and say clearly whether their underperformance is structural (sell) or cyclical (hold).

**Action**
One sentence: one specific position action the client should discuss with their advisor, with a number-backed rationale.`
      }} />
    </div>
  )
}
