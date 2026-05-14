/**
 * ManagerScorecard — active equity manager returns vs passive ETF benchmarks
 * Shows gross alpha, estimated fee drag, and net alpha per asset class.
 */
import { useState } from 'react'
import { useApi } from '../hooks/useApi'
import { fmt$ } from '../utils/formatters'
import InfoButton from './InfoButton'
import { WIDGET_INFO } from '../data/widgetInfo'
import NarrativeBlur from './NarrativeBlur'

// Mirrors EQUITY_ETF_MAP from backend
const ETF_MAP = {
  lc_core:           { ticker: 'IVV', name: 'S&P 500 Core' },
  lc_growth:         { ticker: 'IVW', name: 'S&P 500 Growth' },
  lc_value:          { ticker: 'IVE', name: 'S&P 500 Value' },
  mc_core:           { ticker: 'IJH', name: 'S&P MidCap 400' },
  mc_growth:         { ticker: 'IJK', name: 'S&P MidCap 400 Growth' },
  mc_value:          { ticker: 'IJJ', name: 'S&P MidCap 400 Value' },
  sc_core:           { ticker: 'IJR', name: 'S&P SmallCap 600' },
  sc_growth:         { ticker: 'IJT', name: 'S&P SmallCap 600 Growth' },
  sc_value:          { ticker: 'IJS', name: 'S&P SmallCap 600 Value' },
  foreign_lc_growth: { ticker: 'EFG', name: 'MSCI EAFE Growth' },
  foreign_sm_growth: { ticker: 'VSS', name: 'All-World ex-US Small-Cap' },
  intl_developed:    { ticker: 'EFA', name: 'MSCI EAFE' },
}

function verdict(netAlpha) {
  if (netAlpha > 2)  return { label: 'Earned it',      color: 'var(--green)',  bg: 'rgba(0,230,118,0.10)', border: 'rgba(0,230,118,0.25)' }
  if (netAlpha < -2) return { label: 'Lost to index',  color: 'var(--red)',    bg: 'rgba(255,82,82,0.10)',  border: 'rgba(255,82,82,0.25)' }
  return               { label: 'Marginal',           color: 'var(--amber)', bg: 'rgba(255,179,0,0.10)', border: 'rgba(255,179,0,0.25)' }
}

function round2(n) { return Math.round(n * 100) / 100 }

export default function ManagerScorecard() {
  const { data: acData,  loading: acLoading  } = useApi('/asset-classes')
  const { data: bdData,  loading: bdLoading  } = useApi('/benchmarks-detail')
  const { data: sumData, loading: sumLoading } = useApi('/summary')
  const [sortCol, setSortCol] = useState('value')
  const [sortDir, setSortDir] = useState('desc')

  if (acLoading || bdLoading || sumLoading) return (
    <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>Loading scorecard…</div>
  )
  if (!acData || !bdData || !sumData) return null

  const subMgrRate = sumData.sub_mgr_fee_rate_pct || 1.14  // annualised %
  const etfReturns = bdData.etf_returns || {}

  const equityRows = acData
    .filter(ac => ac.super_category === 'equity' && ETF_MAP[ac.id])
    .map(ac => {
      const etfInfo  = ETF_MAP[ac.id]
      const etfEntry = etfReturns[etfInfo.ticker]
      const etfRet   = etfEntry?.return_pct ?? null
      const grossAlpha = etfRet !== null ? round2(ac.return_pct - etfRet) : null
      const estFeePct  = subMgrRate * (22 / 12)   // annualised rate × months held ≈ ITD fee
      const estFeeDollar = round2(ac.value * estFeePct / 100)
      const netAlpha   = grossAlpha !== null ? round2(grossAlpha - estFeePct) : null
      const v          = netAlpha !== null ? verdict(netAlpha) : null
      return { ...ac, etfInfo, etfRet, grossAlpha, estFeePct, estFeeDollar, netAlpha, verdict: v }
    })

  // Sort
  const onSort = col => {
    if (sortCol === col) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortCol(col); setSortDir('desc') }
  }
  const sorted = [...equityRows].sort((a, b) => {
    const va = a[sortCol] ?? -Infinity, vb = b[sortCol] ?? -Infinity
    return sortDir === 'desc' ? vb - va : va - vb
  })

  // Weighted average net alpha
  const totalValue = equityRows.reduce((s, r) => s + r.value, 0)
  const wAvgNetAlpha = totalValue > 0
    ? round2(equityRows.reduce((s, r) => r.netAlpha !== null ? s + r.netAlpha * r.value / totalValue : s, 0))
    : null

  const SortIcon = ({ col }) => (
    <span style={{ marginLeft: 3, fontSize: 9, opacity: sortCol === col ? 1 : 0.3, color: sortCol === col ? 'var(--cyan)' : 'inherit' }}>
      {sortCol === col ? (sortDir === 'desc' ? '▼' : '▲') : '⇅'}
    </span>
  )

  const th = (label, col, align = 'right') => (
    <th onClick={() => onSort(col)} style={{ cursor: 'pointer', textAlign: align, whiteSpace: 'nowrap' }}>
      {label} <SortIcon col={col} />
    </th>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Weighted summary */}
      {wAvgNetAlpha !== null && (
        <div style={{
          padding: '14px 20px',
          background: wAvgNetAlpha > 0 ? 'rgba(0,230,118,0.07)' : 'rgba(255,82,82,0.07)',
          border: `1px solid ${wAvgNetAlpha > 0 ? 'rgba(0,230,118,0.2)' : 'rgba(255,82,82,0.2)'}`,
          borderRadius: 6,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20,
        }}>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
              WEIGHTED AVG NET ALPHA (EQUITY SLEEVE)
              <InfoButton title={WIDGET_INFO.managerScorecardHeadline.title} content={WIDGET_INFO.managerScorecardHeadline.content} />
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 800, color: wAvgNetAlpha > 0 ? 'var(--green)' : 'var(--red)' }}>
              {wAvgNetAlpha > 0 ? '+' : ''}{wAvgNetAlpha.toFixed(2)}%
            </div>
          </div>
          <NarrativeBlur>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 400, lineHeight: 1.5 }}>
              Weighted average of (manager return &minus; passive ETF &minus; est. sub-manager fee) across all equity positions. Positive = your managers collectively earned their fees.
            </div>
          </NarrativeBlur>
        </div>
      )}

      {/* Scorecard table */}
      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <div className="card-header" style={{ padding: '12px 16px' }}>
          <span className="card-title">Manager Scorecard</span>
          <InfoButton title={WIDGET_INFO.managerScorecard.title} content={WIDGET_INFO.managerScorecard.content} />
        </div>
        <table style={{ fontSize: 12, width: '100%' }}>
          <thead>
            <tr>
              {th('Asset Class', 'label', 'left')}
              {th('Value', 'value')}
              {th('Your Return', 'return_pct')}
              <th style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>Passive ETF</th>
              {th('Alpha (gross)', 'grossAlpha')}
              <th style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>Est. Fee</th>
              {th('Alpha (net)', 'netAlpha')}
              <th style={{ textAlign: 'center' }}>Verdict</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(row => (
              <tr key={row.id}>
                <td style={{ fontWeight: 600, color: 'var(--text-primary)', paddingLeft: 16, textAlign: 'left', whiteSpace: 'nowrap' }}>
                  {row.label}
                </td>
                <td style={{ fontFamily: 'var(--font-mono)', textAlign: 'right', color: 'var(--text-secondary)' }}>
                  {fmt$(row.value, 0)}
                </td>
                <td style={{ fontFamily: 'var(--font-mono)', textAlign: 'right', fontWeight: 700,
                  color: row.return_pct >= 0 ? 'var(--green)' : 'var(--red)' }}>
                  {row.return_pct > 0 ? '+' : ''}{row.return_pct.toFixed(2)}%
                </td>
                <td style={{ textAlign: 'right' }}>
                  {row.etfRet !== null ? (
                    <div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                        {row.etfRet > 0 ? '+' : ''}{row.etfRet.toFixed(2)}%
                      </div>
                      <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>{row.etfInfo.ticker}</div>
                    </div>
                  ) : <span style={{ color: 'var(--text-muted)' }}>–</span>}
                </td>
                <td style={{ fontFamily: 'var(--font-mono)', textAlign: 'right', fontWeight: 700,
                  color: row.grossAlpha === null ? 'var(--text-muted)' : row.grossAlpha >= 0 ? 'var(--green)' : 'var(--red)' }}>
                  {row.grossAlpha !== null ? `${row.grossAlpha > 0 ? '+' : ''}${row.grossAlpha.toFixed(2)}%` : '–'}
                </td>
                <td style={{ fontFamily: 'var(--font-mono)', textAlign: 'right', fontSize: 11, color: 'var(--text-muted)' }}>
                  ~{row.estFeePct.toFixed(2)}%
                  <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 1 }}>~{fmt$(row.estFeeDollar, 0)}</div>
                </td>
                <td style={{ fontFamily: 'var(--font-mono)', textAlign: 'right', fontWeight: 800,
                  color: row.netAlpha === null ? 'var(--text-muted)' : row.netAlpha > 2 ? 'var(--green)' : row.netAlpha < -2 ? 'var(--red)' : 'var(--amber)' }}>
                  {row.netAlpha !== null ? `${row.netAlpha > 0 ? '+' : ''}${row.netAlpha.toFixed(2)}%` : '–'}
                </td>
                <td style={{ textAlign: 'center' }}>
                  {row.verdict ? (
                    <span style={{
                      fontSize: 9, fontWeight: 700, letterSpacing: '0.04em',
                      padding: '3px 8px', borderRadius: 3,
                      background: row.verdict.bg, border: `1px solid ${row.verdict.border}`,
                      color: row.verdict.color, whiteSpace: 'nowrap',
                    }}>{row.verdict.label}</span>
                  ) : '–'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <NarrativeBlur>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6, padding: '10px 14px', background: 'var(--bg-card)', borderRadius: 6, border: '1px solid var(--border)' }}>
          <strong style={{ color: 'var(--text-secondary)' }}>How to read this:</strong> Alpha (net) = your manager&apos;s return &minus; passive ETF return &minus; estimated sub-manager fee. &quot;Earned it&quot; = net alpha &gt; +2%. Est. fee uses annualised sub-manager fee rate &times; 22-month hold. Passive ETF is the index fund that would have replaced your active manager at near-zero cost. Figures are inception-to-date (Jul 2024 &rarr; May 2026).
        </div>
      </NarrativeBlur>
    </div>
  )
}
