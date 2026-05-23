import { useApi } from '../hooks/useApi'
import { fmt$ } from '../utils/formatters'
import InfoButton from './InfoButton'
import { getWidgetInfo } from '../data/widgetInfo'
import { useIdentity } from '../context/IdentityContext'

function lastReportedColor(dateStr) {
  const days = (Date.now() - new Date(dateStr + 'T12:00:00').getTime()) / 86_400_000
  if (days <= 7)   return 'var(--green)'
  if (days <= 100) return 'var(--amber)'
  return 'var(--red)'
}

const SUPER_COLOR = {
  equity:       'var(--cyan)',
  alternatives: 'var(--amber)',
  cash:         'var(--text-muted)',
}

function periodData(ac, period) {
  if (period === 'ITD') return { gain: ac.net_gain,          ret: ac.return_pct,          label: 'ITD' }
  if (period === 'YTD') return { gain: ac.ytd_gain,          ret: ac.ytd_return_pct,      label: 'YTD' }
  if (period === '1Y')  return { gain: ac.one_year_gain,     ret: ac.one_year_return_pct, label: 'Prev Year' }
  return { gain: null, ret: null, label: period }
}

function AssetCard({ ac, compact, period = 'ITD' }) {
  const color  = SUPER_COLOR[ac.super_category] || 'var(--cyan)'
  const { gain, ret, label } = periodData(ac, period)
  const isNeg    = gain != null && gain < 0
  const retColor = gain == null ? 'var(--text-muted)' : (isNeg ? 'var(--red)' : 'var(--green)')

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
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: retColor }}>
            {ret == null ? '—' : `${ret > 0 ? '+' : ''}${ret.toFixed(2)}%`}
          </div>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.04em', textTransform: 'uppercase', marginTop: 1 }}>
            {label}
          </div>
        </div>
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

      {/* Gain row */}
      <div style={{ display: 'grid', gridTemplateColumns: !compact && ac.income > 0 ? '1fr 1fr' : '1fr', gap: 8 }}>
        <div>
          <div style={{ fontSize: 9, color: 'var(--text-label)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 2 }}>
            Net Gain {label}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: retColor }}>
            {gain == null ? <span style={{ color: 'var(--text-muted)' }}>—</span> : `${gain >= 0 ? '+' : ''}${fmt$(gain, 0)}`}
          </div>
        </div>
        {!compact && ac.income > 0 && period === 'ITD' && (
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

      {/* Last-reported badge for alternatives */}
      {ac.last_reported && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5, marginTop: 2,
          paddingTop: compact ? 6 : 8, borderTop: '1px solid var(--border)',
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
            background: lastReportedColor(ac.last_reported),
          }} />
          <span style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
            As of {new Date(ac.last_reported + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            {ac.reporting_freq && ` · ${ac.reporting_freq}`}
          </span>
        </div>
      )}
    </div>
  )
}

export default function SleeveGrid({ compact, onNavigate, categoryFilter, period = 'ITD' }) {
  const { data, loading } = useApi('/asset-classes')
  const { role } = useIdentity()

  if (loading) return (
    <div className="card">
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>
    </div>
  )

  const allClasses = [...(data || [])].filter(ac => ac.super_category !== 'cash')
  const classes = categoryFilter && categoryFilter !== 'all'
    ? allClasses.filter(ac => ac.super_category === categoryFilter)
    : allClasses
  const sortedClasses = [...classes].sort((a, b) => b.value - a.value)

  const equityCount = sortedClasses.filter(ac => ac.super_category === 'equity').length
  const altsCount   = sortedClasses.filter(ac => ac.super_category === 'alternatives').length
  const total       = sortedClasses.reduce((s, a) => s + a.value, 0)

  // Build dynamic info content from live data — replaces hardcoded widgetInfo entries
  const allPositions = data || []
  const totalCount   = allPositions.length
  const biggest      = sortedClasses[0]
  const byReturn     = [...sortedClasses].sort((a, b) => (b.return_pct || 0) - (a.return_pct || 0))
  const bestPerformer = byReturn[0]
  const negPositions  = sortedClasses.filter(ac => (ac.return_pct || 0) < 0)
  const negWeight     = negPositions.reduce((s, ac) => s + ac.weight_pct, 0)

  const fmtRet = (v) => v == null ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`

  const negSection = negPositions.length > 0
    ? `\n\n**Negative ITD returns:** ${negPositions.map(p => `${p.label} (${fmtRet(p.return_pct)})`).join(' · ')} — combined ${negWeight.toFixed(2)}% of portfolio. Small positions that won't move the needle, but worth asking the advisor why they are held.`
    : '\n\n**No asset class shows a negative ITD return** — all positions are above their cost basis since inception.'

  const bestSection = bestPerformer
    ? `\n\n**Standout: ${bestPerformer.label} ${fmtRet(bestPerformer.return_pct)}** — ${fmt$(bestPerformer.value, 0)} at ${bestPerformer.weight_pct.toFixed(1)}% of portfolio. ${bestPerformer.super_category === 'alternatives' ? 'A genuine outlier inside the alternatives sleeve.' : 'Top equity performer.'}`
    : ''

  const dynamicAssetGridInfo = biggest ? {
    title: 'Asset Class Cards',
    content: `**${totalCount} asset classes** total · Blue border = equity sleeve · Amber = alternatives · Cash shown separately below.\n\n**Largest single allocation: ${biggest.label}** — ${fmt$(biggest.value, 0)} · ${biggest.weight_pct.toFixed(1)}% of portfolio · ITD return ${fmtRet(biggest.return_pct)}. ${biggest.weight_pct > 20 ? `At ${biggest.weight_pct.toFixed(1)}%, this is a concentrated position. Most institutional allocators cap any single illiquid vehicle at 10–15% of AUM.` : ''}${negSection}${bestSection}\n\n**What the colours mean:** Blue border = equity managers (replaces passive ETFs). Amber border = alternatives (PE, VC, hedge funds, private credit, real assets). Red return figure = negative ITD. Return badge shows the selected period (ITD by default).`,
  } : getWidgetInfo('assetClassGrid', role)

  return (
    <div>
      {compact ? (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span className="card-title">Asset Classes</span>
            <InfoButton title={dynamicAssetGridInfo?.title} content={dynamicAssetGridInfo?.content} />
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
            <InfoButton title={dynamicAssetGridInfo?.title} content={dynamicAssetGridInfo?.content} />
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
        {sortedClasses.map(ac => (
          <div key={ac.id} onClick={() => onNavigate?.(ac.id)} style={{ cursor: onNavigate ? 'pointer' : 'default' }}>
            <AssetCard ac={ac} compact={compact} period={period} />
          </div>
        ))}
      </div>
    </div>
  )
}
