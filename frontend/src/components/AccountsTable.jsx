import { useState, useEffect } from 'react'
import { useApi } from '../hooks/useApi'
import { fmt$ } from '../utils/formatters'

const CATEGORY_COLOR = {
  equity:       'var(--cyan)',
  alternatives: 'var(--amber)',
  cash:         'var(--green)',
}

const CATEGORY_LABEL = {
  equity:       'Equity',
  alternatives: 'Alternatives',
  cash:         'Cash',
}

const FILTERS = [
  { id: 'all',          label: 'All' },
  { id: 'equity',       label: 'Equity' },
  { id: 'alternatives', label: 'Alternatives' },
  { id: 'cash',         label: 'Cash' },
]

const PERIODS = [
  { key: 'MTD',  label: 'MTD' },
  { key: 'QTD',  label: 'QTD' },
  { key: 'YTD',  label: 'YTD' },
  { key: '1Y',   label: '1 Year' },
  { key: 'ITD',  label: 'Inception' },
]

function PeriodBtn({ active, onClick, label }) {
  return (
    <button onClick={onClick} style={{
      padding: '2px 10px', fontSize: 10, fontWeight: 600, borderRadius: 3,
      border: active ? '1px solid var(--cyan)' : '1px solid var(--border)',
      background: active ? 'var(--cyan)' : 'transparent',
      color: active ? '#000' : 'var(--text-muted)',
      cursor: 'pointer', letterSpacing: '0.04em', textTransform: 'uppercase',
    }}>
      {label}
    </button>
  )
}

function HoldingsRow({ holdings, colSpan }) {
  if (!holdings || holdings.length === 0) return (
    <tr>
      <td colSpan={colSpan} style={{ paddingLeft: 32, paddingBottom: 12, color: 'var(--text-muted)', fontSize: 11 }}>
        Individual positions not available for this asset class
      </td>
    </tr>
  )

  const isContributorOnly = holdings.some(h => h.contributor_type)
  const winners = isContributorOnly ? holdings.filter(h => h.contributor_type === 'winner') : []
  const losers  = isContributorOnly ? holdings.filter(h => h.contributor_type === 'loser')  : []
  const fullPositions = isContributorOnly ? [] : holdings

  const thStyle = { padding: '6px 16px', fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textAlign: 'right', letterSpacing: '0.05em' }

  return (
    <tr>
      <td colSpan={colSpan} style={{ padding: '0 0 12px 0', background: 'var(--bg-base)' }}>
        {isContributorOnly && (
          <div style={{ padding: '4px 16px 4px 32px', fontSize: 10, color: 'var(--text-muted)', fontStyle: 'italic', borderBottom: '1px solid var(--border)' }}>
            Top ITD contributors — full position roster not stored
          </div>
        )}
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg-card)' }}>
              <th style={{ ...thStyle, textAlign: 'left', paddingLeft: 32 }}>SYMBOL</th>
              {!isContributorOnly && <th style={{ ...thStyle, textAlign: 'left' }}>NAME</th>}
              {!isContributorOnly && <th style={thStyle}>VALUE</th>}
              <th style={thStyle}>GAIN ITD</th>
              {!isContributorOnly && <th style={thStyle}>RETURN ITD</th>}
              {!isContributorOnly && <th style={thStyle}>GAIN YTD</th>}
              {!isContributorOnly && <th style={thStyle}>RETURN YTD</th>}
            </tr>
          </thead>
          <tbody>
            {isContributorOnly ? (
              <>
                {winners.length > 0 && (
                  <tr style={{ background: 'var(--bg-card)' }}>
                    <td colSpan={2} style={{ padding: '4px 16px 4px 32px', fontSize: 9, color: 'var(--green)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700 }}>
                      Winners
                    </td>
                  </tr>
                )}
                {winners.map((h, i) => (
                  <tr key={`w${i}`} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: '7px 16px 7px 32px', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: 'var(--cyan)' }}>{h.symbol}</td>
                    <td style={{ padding: '7px 16px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--green)' }}>+{fmt$(h.gain, 0)}</td>
                  </tr>
                ))}
                {losers.length > 0 && (
                  <tr style={{ background: 'var(--bg-card)', borderTop: '1px solid var(--border)' }}>
                    <td colSpan={2} style={{ padding: '4px 16px 4px 32px', fontSize: 9, color: 'var(--red)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700 }}>
                      Losers
                    </td>
                  </tr>
                )}
                {losers.map((h, i) => (
                  <tr key={`l${i}`} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: '7px 16px 7px 32px', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: 'var(--cyan)' }}>{h.symbol}</td>
                    <td style={{ padding: '7px 16px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--red)' }}>{fmt$(h.gain, 0)}</td>
                  </tr>
                ))}
              </>
            ) : (
              fullPositions.map((h, i) => {
                const itdColor = h.gain >= 0 ? 'var(--green)' : 'var(--red)'
                const ytdColor = h.ytd_gain == null ? 'var(--text-muted)' : (h.ytd_gain >= 0 ? 'var(--green)' : 'var(--red)')
                return (
                  <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: '8px 16px 8px 32px', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: 'var(--cyan)' }}>{h.symbol}</td>
                    <td style={{ padding: '8px 16px', fontSize: 11, color: 'var(--text-secondary)' }}>{h.name}</td>
                    <td style={{ padding: '8px 16px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-primary)' }}>
                      {h.value == null ? '—' : fmt$(h.value, 0)}
                    </td>
                    <td style={{ padding: '8px 16px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 11, color: itdColor }}>
                      {h.gain >= 0 ? '+' : ''}{fmt$(h.gain, 0)}
                    </td>
                    <td style={{ padding: '8px 16px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: itdColor }}>
                      {h.return_pct == null ? '—' : `${h.return_pct > 0 ? '+' : ''}${h.return_pct.toFixed(2)}%`}
                    </td>
                    <td style={{ padding: '8px 16px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 11, color: ytdColor }}>
                      {h.ytd_gain == null ? '—' : `${h.ytd_gain >= 0 ? '+' : ''}${fmt$(h.ytd_gain, 0)}`}
                    </td>
                    <td style={{ padding: '8px 16px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: ytdColor }}>
                      {h.ytd_return_pct == null ? '—' : `${h.ytd_return_pct > 0 ? '+' : ''}${h.ytd_return_pct.toFixed(2)}%`}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </td>
    </tr>
  )
}

export default function AccountsTable({ selectedAssetClass, onClearSelection, period = 'ITD', onPeriodChange }) {
  const { data: assetClasses, loading } = useApi('/asset-classes')
  const { data: summary } = useApi('/summary')
  const [filter, setFilter] = useState('all')
  const [expanded, setExpanded] = useState(new Set())

  // Auto-expand and scroll when navigated from a card
  useEffect(() => {
    if (selectedAssetClass && assetClasses) {
      setExpanded(prev => new Set([...prev, selectedAssetClass]))
      // Clear the selection so re-navigation to same class still works
      onClearSelection?.()
    }
  }, [selectedAssetClass, assetClasses])

  const all     = assetClasses || []
  const visible = filter === 'all' ? all : all.filter(ac => ac.super_category === filter)
  const sorted  = [...visible].sort((a, b) => b.value - a.value)
  const maxWeight = all.length ? Math.max(...all.map(ac => ac.weight_pct)) : 1
  const total   = summary?.total_value ?? 0

  const periodLabel = PERIODS.find(p => p.key === period)?.label || period
  const hasClassDetail = period === 'ITD' || period === 'YTD'

  const colSpan = period === 'ITD' ? 8 : 7

  function rowGain(ac) {
    if (period === 'ITD') return { gain: ac.net_gain, ret: ac.return_pct }
    if (period === 'YTD') return { gain: ac.ytd_gain ?? null, ret: ac.ytd_return_pct ?? null }
    return { gain: null, ret: null }
  }

  const portfolioGain = { ITD: summary?.total_gain, MTD: summary?.gain_mtd, QTD: summary?.gain_qtd, YTD: summary?.gain_ytd, '1Y': summary?.gain_1y }[period]
  const portfolioIrr  = { ITD: summary?.total_gain_pct, MTD: summary?.net_irr_mtd, QTD: summary?.net_irr_qtd, YTD: summary?.net_irr_ytd, '1Y': summary?.net_irr_1y }[period]

  const toggleExpand = (id) => {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const btnStyle = (active) => ({
    background: active ? 'var(--cyan)' : 'var(--bg-input)',
    border: '1px solid var(--border)', borderRadius: 4,
    color: active ? 'var(--bg-base)' : 'var(--text-secondary)',
    padding: '5px 14px', fontSize: 11,
    fontWeight: active ? 700 : 400, cursor: 'pointer',
    letterSpacing: '0.04em', fontFamily: 'var(--font-ui)',
  })

  return (
    <div className="card">
      <div className="card-header" style={{ flexWrap: 'wrap', gap: 10 }}>
        <span className="card-title">Asset Class Holdings</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', marginRight: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Period</span>
            {PERIODS.map(p => (
              <PeriodBtn key={p.key} active={period === p.key} onClick={() => onPeriodChange?.(p.key)} label={p.label} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {FILTERS.map(f => (
              <button key={f.id} style={btnStyle(filter === f.id)} onClick={() => setFilter(f.id)}>{f.label}</button>
            ))}
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--cyan)', fontWeight: 700 }}>{fmt$(total, 0)}</span>
        </div>
      </div>

      {!hasClassDetail && (
        <div style={{ padding: '6px 20px', fontSize: 11, color: 'var(--amber)', background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}>
          Per-class {period} detail requires downloading Position Performance {period} CSV from AllSource. Portfolio total shown in footer.
        </div>
      )}
      {period === 'YTD' && (
        <div style={{ padding: '6px 20px', fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}>
          YTD: Dec 31, 2025 → May 12, 2026 · Equity classes pending YTD CSV
        </div>
      )}

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th style={{ width: 24 }} />
                <th>Asset Class</th>
                <th>Category</th>
                <th style={{ textAlign: 'right' }}>Market Value</th>
                <th style={{ textAlign: 'right' }}>Weight</th>
                {period === 'ITD' && <th style={{ textAlign: 'right' }}>Cost Basis</th>}
                <th style={{ textAlign: 'right' }}>Net Gain ({periodLabel})</th>
                <th style={{ textAlign: 'right' }}>Return ({periodLabel})</th>
                {period === 'ITD' && <th style={{ textAlign: 'right' }}>Income (ITD)</th>}
              </tr>
            </thead>
            <tbody>
              {sorted.map(ac => {
                const color  = CATEGORY_COLOR[ac.super_category] || 'var(--text-primary)'
                const { gain, ret } = rowGain(ac)
                const isNeg    = gain != null && gain < 0
                const retColor = gain == null ? 'var(--text-muted)' : (isNeg ? 'var(--red)' : 'var(--green)')
                const isExpanded = expanded.has(ac.id)
                const hasHoldings = ac.holdings && ac.holdings.length > 0

                return [
                  <tr
                    key={ac.id}
                    onClick={() => toggleExpand(ac.id)}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}
                  >
                    <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 10, paddingRight: 0 }}>
                      {hasHoldings ? (isExpanded ? '▼' : '▶') : ''}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 12 }}>{ac.label}</div>
                    </td>
                    <td>
                      <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', background: `${color}18`, color }}>
                        {CATEGORY_LABEL[ac.super_category] || ac.super_category}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color, fontWeight: 600 }}>{fmt$(ac.value, 0)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                        <div style={{ width: 48, height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ width: `${(ac.weight_pct / maxWeight) * 100}%`, height: '100%', background: color, borderRadius: 2 }} />
                        </div>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)', minWidth: 36 }}>{ac.weight_pct.toFixed(1)}%</span>
                      </div>
                    </td>
                    {period === 'ITD' && (
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{fmt$(ac.cost_basis, 0)}</td>
                    )}
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: retColor }}>
                      {gain == null ? <span style={{ color: 'var(--text-muted)' }}>—</span> : `${gain >= 0 ? '+' : ''}${fmt$(gain, 0)}`}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: retColor }}>
                      {ret == null ? <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>—</span> : `${ret > 0 ? '+' : ''}${ret.toFixed(2)}%`}
                    </td>
                    {period === 'ITD' && (
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--cyan)' }}>
                        {ac.income > 0 ? fmt$(ac.income, 0) : '—'}
                      </td>
                    )}
                  </tr>,
                  isExpanded && (
                    <HoldingsRow key={`${ac.id}-holdings`} holdings={ac.holdings} colSpan={colSpan} />
                  ),
                ]
              })}
            </tbody>
            <tfoot>
              <tr>
                <td />
                <td colSpan={2} style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 12, paddingTop: 14 }}>
                  {filter === 'all' ? 'TOTAL' : `${CATEGORY_LABEL[filter]?.toUpperCase()} SUBTOTAL`}
                </td>
                <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--cyan)', paddingTop: 14 }}>
                  {fmt$(sorted.reduce((s, ac) => s + ac.value, 0), 0)}
                </td>
                <td style={{ paddingTop: 14 }} />
                {period === 'ITD' && <td style={{ paddingTop: 14 }} />}
                <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, paddingTop: 14,
                  color: portfolioGain == null ? 'var(--text-muted)' : (portfolioGain >= 0 ? 'var(--green)' : 'var(--red)') }}>
                  {filter === 'all' && portfolioGain != null ? `${portfolioGain >= 0 ? '+' : ''}${fmt$(portfolioGain, 0)}` : '—'}
                </td>
                <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, paddingTop: 14,
                  color: portfolioIrr == null ? 'var(--text-muted)' : (portfolioIrr >= 0 ? 'var(--green)' : 'var(--red)') }}>
                  {filter === 'all' && portfolioIrr != null ? `${portfolioIrr >= 0 ? '+' : ''}${portfolioIrr.toFixed(2)}%` : '—'}
                </td>
                {period === 'ITD' && <td style={{ paddingTop: 14 }} />}
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
