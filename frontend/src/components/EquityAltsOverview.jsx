/**
 * EquityAltsOverview — top-of-Performance-tab split panel
 * Shows Equity vs Alternatives at a glance with aggregate return, value, gain
 */
import { useApi } from '../hooks/useApi'
import { fmt$ } from '../utils/formatters'

function SuperCard({ title, color, value, gain, returnPct, pctOfPortfolio, numAssetClasses }) {
  const isNeg = returnPct < 0
  const gainColor = isNeg ? 'var(--red)' : 'var(--green)'

  return (
    <div className="card" style={{ borderTop: `3px solid ${color}`, padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: '0.10em', color, fontWeight: 700 }}>{title.toUpperCase()}</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
            {numAssetClasses} asset classes · {pctOfPortfolio.toFixed(1)}% of AUM
          </div>
        </div>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 24,
          fontWeight: 800,
          color: isNeg ? 'var(--red)' : color,
          lineHeight: 1,
        }}>
          {returnPct > 0 ? '+' : ''}{returnPct.toFixed(2)}%
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: 4 }}>MARKET VALUE</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>
            {fmt$(value, 0)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: 4 }}>NET GAIN (INCEPTION)</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 700, color: gainColor }}>
            {gain >= 0 ? '+' : ''}{fmt$(gain, 0)}
          </div>
        </div>
      </div>

      {/* Weight bar */}
      <div style={{ marginTop: 16 }}>
        <div style={{ height: 4, background: 'var(--border)', borderRadius: 2 }}>
          <div style={{ width: `${pctOfPortfolio}%`, height: '100%', background: color, borderRadius: 2, opacity: 0.7 }} />
        </div>
      </div>
    </div>
  )
}

export default function EquityAltsOverview() {
  const { data: acData, loading } = useApi('/asset-classes')
  const { data: summaryData } = useApi('/summary')

  if (loading || !acData) return null

  // Aggregate by super_category
  const groups = { equity: { value: 0, gain: 0, count: 0 }, alternatives: { value: 0, gain: 0, count: 0 }, cash: { value: 0, gain: 0, count: 0 } }
  acData.forEach(ac => {
    const g = groups[ac.super_category]
    if (!g) return
    g.value += ac.value
    g.gain  += ac.net_gain
    g.count += 1
  })

  const total = summaryData?.total_value || 2392970.34
  const portfolioReturn = summaryData?.total_gain_pct || 20.74

  const eq = groups.equity
  const alt = groups.alternatives
  const eqReturn = eq.value > 0 ? (eq.gain / (eq.value - eq.gain)) * 100 : 0
  const altReturn = alt.value > 0 ? (alt.gain / (alt.value - alt.gain)) * 100 : 0

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      {/* Portfolio headline */}
      <div className="card" style={{ background: 'var(--bg-card)', padding: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          <div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.10em', marginBottom: 6 }}>TOTAL PORTFOLIO AUM</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 800, color: 'var(--text-primary)' }}>
              {fmt$(total, 0)}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>as of May 5, 2026</div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.10em', marginBottom: 6 }}>NET RETURN (INCEPTION)</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 800, color: 'var(--green)' }}>
              +{portfolioReturn.toFixed(2)}%
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>Jul 10, 2024 → May 5, 2026</div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.10em', marginBottom: 6 }}>NET INVESTMENT GAIN</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 800, color: 'var(--green)' }}>
              +{fmt$(summaryData?.total_gain || 359599.34, 0)}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>since inception</div>
          </div>
        </div>

        {/* Equity vs Alts bar */}
        <div style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', marginBottom: 6 }}>
            <span style={{ color: 'var(--cyan)' }}>Equity {(eq.value / total * 100).toFixed(1)}%</span>
            <span style={{ color: 'var(--amber)' }}>Alternatives {(alt.value / total * 100).toFixed(1)}%</span>
          </div>
          <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden', display: 'flex' }}>
            <div style={{ width: `${eq.value / total * 100}%`, height: '100%', background: 'var(--cyan)', opacity: 0.8 }} />
            <div style={{ width: `${alt.value / total * 100}%`, height: '100%', background: 'var(--amber)', opacity: 0.8 }} />
            <div style={{ flex: 1, height: '100%', background: 'var(--text-muted)', opacity: 0.3 }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
            <span>Cash {(groups.cash.value / total * 100).toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* Equity vs Alts split cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <SuperCard
          title="Equity"
          color="var(--cyan)"
          value={eq.value}
          gain={eq.gain}
          returnPct={eqReturn}
          pctOfPortfolio={eq.value / total * 100}
          numAssetClasses={eq.count}
        />
        <SuperCard
          title="Alternatives"
          color="var(--amber)"
          value={alt.value}
          gain={alt.gain}
          returnPct={altReturn}
          pctOfPortfolio={alt.value / total * 100}
          numAssetClasses={alt.count}
        />
      </div>
    </div>
  )
}
