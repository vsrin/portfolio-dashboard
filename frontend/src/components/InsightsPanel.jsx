/**
 * InsightsPanel — "My Insights" portfolio tab
 * Three scorecards: Alpha vs blended benchmark · 1Y IRR vs bonds · Fee efficiency
 */
import { useApi } from '../hooks/useApi'
import { fmt$ } from '../utils/formatters'
import InfoButton from './InfoButton'
import { WIDGET_INFO } from '../data/widgetInfo'
import NarrativeBlur from './NarrativeBlur'

function ScoreCard({ label, main, mainColor, sub, subLabel, badge, note, infoTitle, infoContent }) {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <span className="card-title">{label}</span>
        {infoTitle && infoContent && (
          <InfoButton title={infoTitle} content={infoContent} />
        )}
      </div>
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 32,
        fontWeight: 800,
        color: mainColor || 'var(--cyan)',
        lineHeight: 1,
        letterSpacing: '-0.02em',
      }}>
        {main}
      </div>
      {badge && (
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          background: badge.bg || 'rgba(0,230,118,0.12)',
          border: `1px solid ${badge.border || 'rgba(0,230,118,0.3)'}`,
          borderRadius: 4,
          padding: '4px 10px',
          fontSize: 10,
          fontWeight: 700,
          color: badge.color || 'var(--green)',
          letterSpacing: '0.06em',
          alignSelf: 'flex-start',
        }}>
          {badge.icon} {badge.text}
        </div>
      )}
      {sub && (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{subLabel}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>
            {sub}
          </span>
        </div>
      )}
      {note && (
        <NarrativeBlur>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5, marginTop: 2 }}>
            {note}
          </div>
        </NarrativeBlur>
      )}
    </div>
  )
}

function BenchmarkRow({ label, value, color, isBold }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '8px 0',
      borderBottom: '1px solid var(--border)',
    }}>
      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</span>
      <span style={{
        fontFamily: 'var(--font-mono)',
        fontSize: isBold ? 15 : 13,
        fontWeight: isBold ? 800 : 600,
        color: color || 'var(--text-primary)',
      }}>
        {value}
      </span>
    </div>
  )
}

function AlphaViz({ portfolio, benchmark }) {
  const max = Math.max(portfolio, benchmark, 1)
  const pBar = Math.round(portfolio / max * 100)
  const bBar = Math.round(benchmark / max * 100)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {[
        { label: 'Your Portfolio', value: portfolio, bar: pBar, color: 'var(--cyan)' },
        { label: 'Blended Passive Benchmark', value: benchmark, bar: bBar, color: 'var(--text-muted)' },
      ].map(({ label, value, bar, color }) => (
        <div key={label}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{label}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color }}>
              {value > 0 ? '+' : ''}{value.toFixed(2)}%
            </span>
          </div>
          <div style={{ height: 6, background: 'var(--bg-input)', borderRadius: 3 }}>
            <div style={{ width: `${bar}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.5s ease' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function InsightsPanel() {
  const { data, loading } = useApi('/insights')

  if (loading) return (
    <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>Loading insights…</div>
  )
  if (!data) return null

  const alpha     = data.alpha_itd
  const alphaGood = alpha > 0

  const irr1y        = data.irr_1y        // 13.11
  const irr1yVsAgg   = data.irr_vs_agg_1y // 13.11 - agg_1y
  const irr1yGood    = irr1yVsAgg > 0

  const feeEff       = data.fee_efficiency_pct  // % of gross gains kept
  const feeGap       = data.fee_gap              // $ lost to fee drag

  const altsVsBonds  = data.alts_vs_bonds
  const altsGood     = altsVsBonds > 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Headline scorecard row ─────────────────────────────────────────────── */}
      <div className="grid-3-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>

        <ScoreCard
          label="Alpha vs Passive Benchmark"
          infoTitle={WIDGET_INFO.alphaBenchmark.title}
          infoContent={WIDGET_INFO.alphaBenchmark.content}
          main={`${alphaGood ? '+' : ''}${alpha.toFixed(2)}%`}
          mainColor={alphaGood ? 'var(--green)' : 'var(--red)'}
          badge={alphaGood ? {
            icon: '▲',
            text: 'OUTPERFORMING',
            bg: 'rgba(0,230,118,0.12)',
            border: 'rgba(0,230,118,0.3)',
            color: 'var(--green)',
          } : {
            icon: '▼',
            text: 'UNDERPERFORMING',
            bg: 'rgba(255,82,82,0.12)',
            border: 'rgba(255,82,82,0.3)',
            color: 'var(--red)',
          }}
          sub={`${data.portfolio_return.toFixed(2)}% portfolio vs ${data.benchmark_itd.toFixed(2)}% benchmark`}
          subLabel="Since inception"
          note={`Benchmark = ${data.spy_weight}% SPY + ${data.agg_weight}% AGG + ${data.cash_weight}% cash yield, weighted to match your actual allocation.`}
        />

        <ScoreCard
          label="1-Year IRR vs Bond Index"
          infoTitle={WIDGET_INFO.irr1yVsBonds.title}
          infoContent={WIDGET_INFO.irr1yVsBonds.content}
          main={`+${irr1y.toFixed(2)}%`}
          mainColor="var(--cyan)"
          badge={irr1yGood ? {
            icon: '▲',
            text: `+${irr1yVsAgg.toFixed(2)}% VS AGG`,
            bg: 'rgba(0,212,255,0.10)',
            border: 'rgba(0,212,255,0.25)',
            color: 'var(--cyan)',
          } : {
            icon: '▼',
            text: `${irr1yVsAgg.toFixed(2)}% VS AGG`,
            bg: 'rgba(255,82,82,0.12)',
            border: 'rgba(255,82,82,0.3)',
            color: 'var(--red)',
          }}
          sub={`${data.agg_1y.toFixed(2)}% AGG 1Y`}
          subLabel="vs"
          note="Portfolio 1-year IRR from Tamarac. Compared against AGG (Bloomberg US Aggregate) as the bond proxy your alternatives are replacing."
        />

        <ScoreCard
          label="Fee Efficiency"
          infoTitle={WIDGET_INFO.feeEfficiency.title}
          infoContent={WIDGET_INFO.feeEfficiency.content}
          main={`${feeEff.toFixed(1)}%`}
          mainColor={feeEff >= 90 ? 'var(--green)' : feeEff >= 80 ? 'var(--amber)' : 'var(--red)'}
          badge={{
            icon: feeEff >= 90 ? '✓' : '!',
            text: feeEff >= 90 ? 'OF GAINS KEPT' : 'DRAG FROM FEES',
            bg: feeEff >= 90 ? 'rgba(0,230,118,0.12)' : 'rgba(255,179,0,0.12)',
            border: feeEff >= 90 ? 'rgba(0,230,118,0.3)' : 'rgba(255,179,0,0.3)',
            color: feeEff >= 90 ? 'var(--green)' : 'var(--amber)',
          }}
          sub={`${fmt$(feeGap, 0)} in fee drag`}
          subLabel="Absorbed"
          note="Fee drag is embedded in managed account NAVs (Weather Mark, Putnam, LEIA). ~$43,847 paid directly; remainder deducted from position values."
        />
      </div>

      {/* ── Benchmark breakdown card ───────────────────────────────────────────── */}
      <div className="grid-2-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Portfolio vs Blended Benchmark</span>
            <InfoButton title={WIDGET_INFO.benchmarkBreakdown.title} content={WIDGET_INFO.benchmarkBreakdown.content} />
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              Since inception {data.inception_date} → {data.as_of_date}
            </span>
          </div>
          <AlphaViz portfolio={data.portfolio_return} benchmark={data.benchmark_itd} />
          <div style={{ marginTop: 20 }}>
            <BenchmarkRow label="Your Portfolio (net of fees)" value={`+${data.portfolio_return.toFixed(2)}%`} color="var(--cyan)" isBold />
            <BenchmarkRow label={`Blended Passive (${data.spy_weight}% SPY + ${data.agg_weight}% AGG + ${data.cash_weight}% Cash)`} value={`+${data.benchmark_itd.toFixed(2)}%`} color="var(--text-muted)" />
            <BenchmarkRow label={`  ∟ S&P 500 (SPY) — inception to date`} value={`${data.spy_itd > 0 ? '+' : ''}${data.spy_itd.toFixed(2)}%`} color={data.spy_itd >= 0 ? 'var(--text-secondary)' : 'var(--red)'} />
            <BenchmarkRow label="  ∟ US Agg Bonds (AGG) — inception to date" value={`${data.agg_itd > 0 ? '+' : ''}${data.agg_itd.toFixed(2)}%`} color={data.agg_itd >= 0 ? 'var(--text-secondary)' : 'var(--red)'} />
            <BenchmarkRow label="  ∟ Cash yield (approx. 4.75% ann.)" value={`+${data.cash_itd.toFixed(2)}%`} color="var(--text-secondary)" />
            <div style={{ marginTop: 12, padding: '10px 12px', background: alphaGood ? 'rgba(0,230,118,0.08)' : 'rgba(255,82,82,0.08)', borderRadius: 6, border: `1px solid ${alphaGood ? 'rgba(0,230,118,0.2)' : 'rgba(255,82,82,0.2)'}` }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Alpha generated: </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 800, color: alphaGood ? 'var(--green)' : 'var(--red)' }}>
                {alpha > 0 ? '+' : ''}{alpha.toFixed(2)}%
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>
                ≈ {fmt$(Math.abs(alpha / 100 * data.net_gain / data.portfolio_return * 100), 0)} in additional value created
              </span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Alternatives as Bond Substitute</span>
            <InfoButton title={WIDGET_INFO.altsBondSubstitute.title} content={WIDGET_INFO.altsBondSubstitute.content} />
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              57% of portfolio replacing bonds
            </span>
          </div>

          <div style={{ marginBottom: 16, padding: '10px 14px', background: altsGood ? 'rgba(0,230,118,0.07)' : 'rgba(255,179,0,0.07)', borderRadius: 6, border: `1px solid ${altsGood ? 'rgba(0,230,118,0.2)' : 'rgba(255,179,0,0.2)'}` }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Alts inception-to-date vs AGG (bond index)</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 800, color: altsGood ? 'var(--green)' : 'var(--amber)' }}>
                {data.alts_itd > 0 ? '+' : ''}{data.alts_itd.toFixed(2)}%
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>alts</span>
              <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>vs</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, color: 'var(--text-muted)' }}>
                {data.agg_itd > 0 ? '+' : ''}{data.agg_itd.toFixed(2)}%
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>AGG</span>
            </div>
            {altsGood && (
              <div style={{ fontSize: 11, color: 'var(--green)', marginTop: 6, fontWeight: 600 }}>
                ▲ Alts outperformed bonds by {altsVsBonds.toFixed(2)}% since inception
              </div>
            )}
          </div>

          <BenchmarkRow label="Alternatives sleeve return (ITD)" value={`${data.alts_itd > 0 ? '+' : ''}${data.alts_itd.toFixed(2)}%`} color="var(--amber)" isBold />
          <BenchmarkRow label="AGG (Bloomberg US Agg) ITD" value={`${data.agg_itd > 0 ? '+' : ''}${data.agg_itd.toFixed(2)}%`} color="var(--text-secondary)" />
          <BenchmarkRow label="Excess return vs bonds" value={`${altsVsBonds > 0 ? '+' : ''}${altsVsBonds.toFixed(2)}%`} color={altsGood ? 'var(--green)' : 'var(--red)'} />
          <BenchmarkRow label="Income generated by alts" value={fmt$(data.alts_income, 0)} color="var(--cyan)" />

          <NarrativeBlur>
            <div style={{ marginTop: 14, fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6, padding: '10px 12px', background: 'var(--bg-input)', borderRadius: 6 }}>
              <strong style={{ color: 'var(--text-secondary)' }}>The thesis:</strong> Your advisor replaced the bond allocation (~57% of portfolio) with alternatives. The scorecard above shows whether that bet is paying off relative to a simple AGG index investment. Excludes J-Curve vehicles (PE / VC) from the comparison — those are expected to show 0% return during the capital call phase.
            </div>
          </NarrativeBlur>
        </div>
      </div>

      {/* ── 1Y IRR context ─────────────────────────────────────────────────────── */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">1-Year View — IRR in Context</span>
          <InfoButton title={WIDGET_INFO.irr1yContext.title} content={WIDGET_INFO.irr1yContext.content} />
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
            Best comparison period for illiquid alts (avoids J-Curve distortion)
          </span>
        </div>
        <div className="grid-4-col" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
          {[
            { label: 'Your Portfolio (1Y IRR)', value: `+${irr1y.toFixed(2)}%`, color: 'var(--cyan)', note: 'Tamarac annualised IRR' },
            { label: 'AGG Bond Index (1Y)', value: `${data.agg_1y > 0 ? '+' : ''}${data.agg_1y.toFixed(2)}%`, color: 'var(--text-muted)', note: 'Bloomberg US Aggregate' },
            { label: 'S&P 500 (1Y)', value: `${data.spy_1y > 0 ? '+' : ''}${data.spy_1y.toFixed(2)}%`, color: 'var(--text-secondary)', note: 'SPY price return' },
            { label: 'IRR vs AGG (1Y)', value: `${irr1yVsAgg > 0 ? '+' : ''}${irr1yVsAgg.toFixed(2)}%`, color: irr1yGood ? 'var(--green)' : 'var(--red)', note: '1Y outperformance vs bonds' },
          ].map(({ label, value, color, note }) => (
            <div key={label}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: 8 }}>{label.toUpperCase()}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }}>{note}</div>
            </div>
          ))}
        </div>
        <NarrativeBlur>
          <div style={{ marginTop: 16, padding: '10px 14px', background: 'var(--bg-input)', borderRadius: 6, fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            <strong style={{ color: 'var(--text-secondary)' }}>Why 1-year?</strong> The since-inception return (20.74%) includes the full J-Curve effect — PE and VC funds show 0% while capital is being called, dragging the alts sleeve aggregate lower. The 1-year IRR from Tamarac is a cleaner signal of current portfolio momentum for funds that are already deployed.
          </div>
        </NarrativeBlur>
      </div>
    </div>
  )
}
