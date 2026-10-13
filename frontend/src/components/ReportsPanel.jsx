/**
 * ReportsPanel — central hub for downloading PDF exhibits.
 * Fetches all needed data upfront; each report card triggers its export function.
 */
import { useState, useEffect } from 'react'
import { useApi } from '../hooks/useApi'
import { exportReconciliationPDF }   from '../utils/exportReconciliationPDF'
import { exportAlternativesPDF }     from '../utils/exportAlternativesPDF'
import { exportExecutiveSummaryPDF } from '../utils/exportExecutiveSummaryPDF'
import { exportRetirementPDF }       from '../utils/exportRetirementPDF'

function useStaticJson(path) {
  const [data, setData] = useState(null)
  useEffect(() => {
    fetch(path).then(r => r.ok ? r.json() : null).then(setData).catch(() => setData(null))
  }, [path])
  return data
}

const REPORTS = [
  {
    id:       'reconciliation',
    title:    'Reconciliation to AllSource',
    subtitle: 'Custodian verification',
    desc:     'Full portfolio waterfall reconciled to AllSource custodian line by line — ending value, investment gain, Net IRR, and fee tracking across MTD / QTD / YTD / ITD. Flags any gap above $1.',
    icon:     '⊜',
    color:    '#0891b2',
  },
  {
    id:       'alternatives',
    title:    'Alternatives Deep Dive',
    subtitle: 'Ex-commodity analysis + fund-level detail',
    desc:     'Strips the commodity bucket to reveal the true core alternatives return. All 6 categories with proper benchmarks, 7 PE fund positions, the VistaOne flag, and advisor questions that require specific answers.',
    icon:     '◈',
    color:    '#7c3aed',
  },
  {
    id:       'executive',
    title:    'Portfolio Executive Summary',
    subtitle: 'One-page snapshot',
    desc:     'AUM, sleeve breakdown, benchmark comparison (S&P 500 + blended), top performers, manager failure flags, risk metrics, and fee summary. Designed to hand to any advisor or expert in 10 seconds.',
    icon:     '◉',
    color:    '#059669',
  },
  {
    id:       'retirement',
    title:    'Retirement Planning Exhibit',
    subtitle: 'Projection with full arithmetic',
    desc:     'Required return derivation step by step, three scenarios (conservative / moderate / current pace), year-by-year projection table, risk context, and all assumptions spelled out for external review.',
    icon:     '◷',
    color:    '#d97706',
  },
]

function ReportCard({ report, onDownload, loading, asOf }) {
  const [hover, setHover] = useState(false)

  return (
    <div
      style={{
        background:   'var(--bg-card)',
        border:       `1px solid ${hover ? report.color + '60' : 'var(--border)'}`,
        borderTop:    `3px solid ${report.color}`,
        borderRadius: 8,
        padding:      '20px 22px',
        display:      'flex',
        flexDirection:'column',
        gap:          12,
        transition:   'border-color 0.15s, box-shadow 0.15s',
        boxShadow:    hover ? `0 4px 20px ${report.color}18` : 'none',
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8, flexShrink: 0,
          background: report.color + '18',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, color: report.color,
        }}>
          {report.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>
            {report.title}
          </div>
          <div style={{ fontSize: 10, color: report.color, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
            {report.subtitle}
          </div>
        </div>
      </div>

      {/* Description */}
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.65, flex: 1 }}>
        {report.desc}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          Data as of {asOf || '—'}
        </div>
        <button
          onClick={() => onDownload(report.id)}
          disabled={loading === report.id}
          style={{
            padding:       '6px 16px',
            fontSize:      10,
            fontWeight:    700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            background:    loading === report.id ? 'var(--bg-input)' : report.color,
            border:        'none',
            borderRadius:  4,
            color:         loading === report.id ? 'var(--text-muted)' : '#fff',
            cursor:        loading === report.id ? 'not-allowed' : 'pointer',
            fontFamily:    'var(--font-mono)',
            transition:    'opacity 0.15s',
            opacity:       loading === report.id ? 0.6 : 1,
          }}
        >
          {loading === report.id ? 'Preparing…' : '↓ Download PDF'}
        </button>
      </div>
    </div>
  )
}

export default function ReportsPanel() {
  const { data: summary }     = useApi('/summary')
  const { data: alts }        = useApi('/alternatives')
  const { data: insights }    = useApi('/insights')
  const { data: assetClasses }= useApi('/asset-classes')
  const { data: risk }        = useApi('/risk')
  const { data: official }    = useApi('/risk-metrics')
  const { data: fees }        = useApi('/fees')
  const recon = useStaticJson(
    import.meta.env.PROD ? '/data/reconciliation.json' : '/data/reconciliation.json'
  )

  const [loading, setLoading] = useState(null)
  const asOf = summary?.as_of_date || '—'

  const handleDownload = (id) => {
    setLoading(id)
    setTimeout(() => {
      try {
        if (id === 'reconciliation') {
          exportReconciliationPDF({ recon, summary, assetClasses, fees })
        } else if (id === 'alternatives') {
          exportAlternativesPDF({ alts, summary, insights, official })
        } else if (id === 'executive') {
          exportExecutiveSummaryPDF({ summary, insights, assetClasses, official })
        } else if (id === 'retirement') {
          const ret = risk?.retirement
          const rm  = risk?.risk_metrics
          if (ret) {
            exportRetirementPDF({
              ret,
              rm,
              official,
              asOf:      risk?.as_of || asOf,
              inception: risk?.inception || summary?.inception_date,
              summary,
            })
          }
        }
      } catch (e) {
        console.error('PDF export error:', e)
      }
      setLoading(null)
    }, 50)
  }

  const dataReady = !!(summary && assetClasses)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Header */}
      <div style={{
        padding:    '16px 20px',
        borderRadius: 8,
        background: 'linear-gradient(135deg, rgba(8,145,178,0.06), rgba(124,58,237,0.06))',
        border:     '1px solid var(--border)',
        display:    'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
            Portfolio Reports
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
            Exhibit-quality PDF exports — for advisor meetings, external experts, and personal records.
            All figures reconciled to AllSource custodian.
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: dataReady ? 'var(--green)' : 'var(--amber)',
          }} />
          <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            {dataReady ? `Data loaded · as of ${asOf}` : 'Loading data…'}
          </span>
        </div>
      </div>

      {/* Report cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
        {REPORTS.map(r => (
          <ReportCard
            key={r.id}
            report={r}
            onDownload={handleDownload}
            loading={loading}
            asOf={asOf}
          />
        ))}
      </div>

      {/* Footer note */}
      <div style={{
        padding:    '10px 14px',
        borderRadius: 5,
        background: 'var(--bg-card)',
        border:     '1px solid var(--border)',
        fontSize:   10,
        color:      'var(--text-muted)',
        lineHeight: 1.6,
      }}>
        Reports open in a new browser tab. Use your browser's <strong>Print → Save as PDF</strong> to save.
        All exhibits are generated from live dashboard data — re-download after each data refresh to get current figures.
        Risk metrics (Sharpe, Sortino, capture ratios) are sourced from Tamarac official as of May 2026;
        newer figures will be reflected once the next Tamarac export is loaded.
      </div>
    </div>
  )
}
