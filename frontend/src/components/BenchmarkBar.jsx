import { useApi } from '../hooks/useApi'
import { fmtPct } from '../utils/formatters'
import InfoButton from './InfoButton'
import { WIDGET_INFO } from '../data/widgetInfo'

function PctStat({ label, value, highlight }) {
  if (value == null) return null
  const pos = value >= 0
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <span style={{
        fontSize: 9,
        color: highlight ? '#7dd3fc' : 'rgba(255,255,255,0.45)',
        letterSpacing: '0.07em',
        textTransform: 'uppercase',
        fontWeight: highlight ? 700 : 400,
      }}>
        {label}
      </span>
      <span style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 12,
        fontWeight: 700,
        color: pos ? '#4ade80' : '#f87171',
      }}>
        {pos ? '▲' : '▼'} {Math.abs(value).toFixed(2)}%
      </span>
    </div>
  )
}

function BenchTile({ label, data, itd }) {
  if (!data) return null
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 20,
      padding: '7px 24px',
      borderRight: '1px solid rgba(255,255,255,0.10)',
    }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: '#ffffff', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
        {label}
      </span>
      {data.error ? (
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>offline</span>
      ) : (
        <>
          <PctStat label="Today"  value={data['1d']} />
          <PctStat label="YTD"    value={data.ytd} />
          <PctStat label="1 Year" value={data['1y']} />
          <PctStat label="Since Jul '24" value={itd} highlight />
        </>
      )}
    </div>
  )
}

export default function BenchmarkBar() {
  const { data: bm, loading: bmLoading } = useApi('/benchmarks')
  const { data: ins }                     = useApi('/insights')

  return (
    <div className="benchmark-bar" style={{
      background: '#0f2044',
      borderBottom: '1px solid #1a3060',
      display: 'flex',
      alignItems: 'center',
      padding: 0,
      fontSize: 12,
    }}>
      <div style={{
        padding: '7px 20px',
        borderRight: '1px solid rgba(255,255,255,0.10)',
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.12em',
        color: '#7dd3fc',
        whiteSpace: 'nowrap',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}>
        BENCHMARKS
        <InfoButton title={WIDGET_INFO.benchmarkBar.title} content={WIDGET_INFO.benchmarkBar.content} />
      </div>

      {bmLoading ? (
        <div style={{ padding: '8px 20px', color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>Loading…</div>
      ) : (
        <>
          <BenchTile label="S&P 500"       data={bm?.sp500}         itd={ins?.spy_itd} />
          <BenchTile label="Bloomberg Agg" data={bm?.bloomberg_agg} itd={ins?.agg_itd} />
        </>
      )}

      {/* Portfolio ITD for direct comparison */}
      {ins && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 20,
          padding: '7px 24px',
          borderRight: '1px solid rgba(255,255,255,0.10)',
        }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#ffffff', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
            Your Portfolio
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <span style={{ fontSize: 9, color: '#7dd3fc', letterSpacing: '0.07em', textTransform: 'uppercase', fontWeight: 700 }}>
              Since Jul '24
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: '#4ade80' }}>
              ▲ {ins.portfolio_return.toFixed(2)}%
            </span>
          </div>
        </div>
      )}

      <div style={{ marginLeft: 'auto', padding: '7px 20px', fontSize: 10, color: 'rgba(255,255,255,0.28)', whiteSpace: 'nowrap' }}>
        SPY · AGG proxies via Yahoo Finance
      </div>
    </div>
  )
}
