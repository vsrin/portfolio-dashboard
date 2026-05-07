import { useState } from 'react'
import { useApi } from '../hooks/useApi'
import { fmt$ } from '../utils/formatters'

const PORTFOLIO_RETURN = 20.74

const CAT_COLOR = {
  equity:       'var(--cyan)',
  alternatives: 'var(--amber)',
  cash:         'var(--green)',
}

// ── sub-components ────────────────────────────────────────────────────────────

function SortIcon({ active, dir }) {
  return (
    <span style={{ marginLeft: 4, fontSize: 9, opacity: active ? 1 : 0.3, color: active ? 'var(--cyan)' : 'inherit' }}>
      {active ? (dir === 'desc' ? '▼' : '▲') : '⇅'}
    </span>
  )
}

function Th({ label, col, sortBy, sortDir, onSort, align = 'right' }) {
  return (
    <th
      onClick={() => onSort(col)}
      style={{ cursor: 'pointer', userSelect: 'none', textAlign: align, whiteSpace: 'nowrap' }}
    >
      {label}<SortIcon active={sortBy === col} dir={sortDir} />
    </th>
  )
}

function ReturnCell({ value }) {
  const pos = value >= 0
  return (
    <td style={{
      fontFamily: 'var(--font-mono)', fontWeight: 700, textAlign: 'right',
      color: pos ? 'var(--green)' : 'var(--red)',
    }}>
      {value > 0 ? '+' : ''}{value.toFixed(2)}%
    </td>
  )
}

function ExpandedEquity({ winners, losers }) {
  return (
    <tr>
      <td colSpan={8} style={{ padding: '10px 16px 14px 36px', background: 'var(--bg-input)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          {winners.length > 0 && (
            <div>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 6 }}>TOP CONTRIBUTORS</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {winners.map(([sym, ret]) => (
                  <span key={sym} style={{
                    padding: '3px 8px', borderRadius: 4, fontSize: 11, fontFamily: 'var(--font-mono)',
                    background: 'rgba(0,230,118,0.10)', border: '1px solid rgba(0,230,118,0.2)',
                    color: 'var(--green)', fontWeight: 600,
                  }}>
                    {sym} <span style={{ opacity: 0.8 }}>{ret > 0 ? '+' : ''}{ret.toFixed(1)}%</span>
                  </span>
                ))}
              </div>
            </div>
          )}
          {losers.length > 0 && (
            <div>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 6 }}>LAGGARDS</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {losers.map(([sym, ret]) => (
                  <span key={sym} style={{
                    padding: '3px 8px', borderRadius: 4, fontSize: 11, fontFamily: 'var(--font-mono)',
                    background: 'rgba(255,69,96,0.10)', border: '1px solid rgba(255,69,96,0.2)',
                    color: 'var(--red)', fontWeight: 600,
                  }}>
                    {sym} <span style={{ opacity: 0.8 }}>{ret.toFixed(1)}%</span>
                  </span>
                ))}
              </div>
            </div>
          )}
          {winners.length === 0 && losers.length === 0 && (
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>No holding detail available</span>
          )}
        </div>
      </td>
    </tr>
  )
}

function ExpandedHoldings({ holdings }) {
  if (!holdings?.length) return (
    <tr>
      <td colSpan={8} style={{ padding: '10px 36px', background: 'var(--bg-input)', borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>No sub-fund detail available</span>
      </td>
    </tr>
  )
  return (
    <tr>
      <td colSpan={8} style={{ padding: '10px 16px 14px 36px', background: 'var(--bg-input)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
          {holdings.map(h => {
            const pos = h.return_pct >= 0
            return (
              <div key={h.symbol} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '6px 10px', borderRadius: 5,
                background: 'var(--bg-card)', border: '1px solid var(--border)',
              }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-primary)', fontWeight: 500 }}>{h.name}</div>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>{h.symbol}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: pos ? 'var(--green)' : 'var(--red)' }}>
                    {h.return_pct > 0 ? '+' : ''}{h.return_pct.toFixed(2)}%
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                    {fmt$(h.value, 0)}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </td>
    </tr>
  )
}

// ── Bar chart view (original) ────────────────────────────────────────────────

function BarChart({ rows }) {
  const maxAbs = Math.max(...rows.map(r => Math.abs(r.return_pct)), PORTFOLIO_RETURN, 1)
  const benchmarkX = PORTFOLIO_RETURN / maxAbs

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {rows.map((row) => {
        const isAlt    = row.super_category === 'alternatives'
        const outperf  = row.return_pct >= PORTFOLIO_RETURN
        const isNeg    = row.return_pct < 0
        const barColor = isNeg ? 'var(--red)' : outperf
          ? (isAlt ? 'var(--amber)' : 'var(--cyan)')
          : 'var(--text-muted)'
        const barW     = Math.abs(row.return_pct) / maxAbs

        return (
          <div key={row.id} style={{ display: 'grid', gridTemplateColumns: '170px 1fr 90px 90px', gap: 12, alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 11, color: CAT_COLOR[row.super_category], fontWeight: 600 }}>{row.label}</div>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>{row.weight_pct.toFixed(1)}% of portfolio</div>
            </div>
            <div style={{ position: 'relative', height: 24 }}>
              <div style={{ position: 'absolute', inset: '6px 0', background: 'var(--bg-input)', borderRadius: 3 }} />
              <div style={{
                position: 'absolute', top: 6, bottom: 6, left: 0,
                width: `${barW * 100}%`, background: barColor,
                borderRadius: 3, opacity: 0.85, transition: 'width 0.4s ease',
              }} />
              <div style={{
                position: 'absolute', top: 2, bottom: 2,
                left: `${benchmarkX * 100}%`, width: 1.5,
                background: 'var(--green)', opacity: 0.7, borderRadius: 1,
              }} />
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, textAlign: 'right',
              color: isNeg ? 'var(--red)' : outperf ? 'var(--green)' : 'var(--text-muted)' }}>
              {row.return_pct > 0 ? '+' : ''}{row.return_pct.toFixed(2)}%
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, textAlign: 'right',
              color: row.net_gain >= 0 ? 'var(--text-secondary)' : 'var(--red)' }}>
              {row.net_gain >= 0 ? '+' : ''}{fmt$(row.net_gain, 0)}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PerformanceMatrix() {
  const { data, loading } = useApi('/asset-classes')
  const [view,     setView]     = useState('table')
  const [filter,   setFilter]   = useState('all')
  const [expanded, setExpanded] = useState(new Set())
  const [sortBy,   setSortBy]   = useState('return_pct')
  const [sortDir,  setSortDir]  = useState('desc')

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>
  if (!data) return null

  const rows = [...data]
    .filter(r => filter === 'all' ? r.super_category !== 'cash' : r.super_category === filter)
    .sort((a, b) => {
      const va = sortBy === 'vs_portfolio' ? a.return_pct - PORTFOLIO_RETURN : (a[sortBy] ?? 0)
      const vb = sortBy === 'vs_portfolio' ? b.return_pct - PORTFOLIO_RETURN : (b[sortBy] ?? 0)
      return sortDir === 'desc' ? vb - va : va - vb
    })

  const toggleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortBy(col); setSortDir('desc') }
  }

  const toggleExpand = (id) => setExpanded(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const btnStyle = (active) => ({
    background: active ? 'var(--cyan)' : 'var(--bg-input)',
    border: '1px solid var(--border)',
    borderRadius: 4,
    color: active ? 'var(--bg-base)' : 'var(--text-secondary)',
    padding: '5px 14px', fontSize: 11,
    fontWeight: active ? 700 : 400,
    cursor: 'pointer', letterSpacing: '0.04em',
    fontFamily: 'var(--font-ui)',
  })

  return (
    <div className="card">
      {/* ── Toolbar ── */}
      <div className="card-header" style={{ flexWrap: 'wrap', gap: 10 }}>
        <span className="card-title">Asset Class Performance</span>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>

          {/* View toggle */}
          <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 5, overflow: 'hidden' }}>
            {[['table', '≡ Table'], ['chart', '▬ Chart']].map(([v, lbl]) => (
              <button key={v} onClick={() => setView(v)} style={{
                ...btnStyle(view === v),
                border: 'none', borderRadius: 0,
                borderRight: v === 'table' ? '1px solid var(--border)' : 'none',
              }}>{lbl}</button>
            ))}
          </div>

          {/* Category filter */}
          <div style={{ display: 'flex', gap: 4 }}>
            {[['all', 'ALL'], ['equity', 'EQUITY'], ['alternatives', 'ALTS']].map(([f, lbl]) => (
              <button key={f} style={btnStyle(filter === f)} onClick={() => setFilter(f)}>{lbl}</button>
            ))}
          </div>

          <div>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Portfolio benchmark:{' '}
              <span style={{ color: 'var(--green)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                +{PORTFOLIO_RETURN.toFixed(2)}%
              </span>
            </span>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 2 }}>
              Based on Modified Dietz / TWR, weighted by capital deployed
            </div>
          </div>
        </div>
      </div>

      {/* ── Table view ── */}
      {view === 'table' && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ fontSize: 12 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', width: 32 }} />
                <Th label="Asset Class"   col="label"      sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} align="left" />
                <Th label="Value"         col="value"      sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
                <Th label="Gain ITD"      col="net_gain"   sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
                <Th label="Return ITD"    col="return_pct" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
                <Th label="Outperformance" col="vs_portfolio" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
                <Th label="Weight"        col="weight_pct" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const isOpen    = expanded.has(row.id)
                const vsPort    = row.return_pct - PORTFOLIO_RETURN
                const catColor  = CAT_COLOR[row.super_category]
                const hasDetail = row.top_winners?.length || row.top_losers?.length || row.holdings?.length

                return (
                  <>
                    <tr
                      key={row.id}
                      onClick={() => hasDetail && toggleExpand(row.id)}
                      style={{ cursor: hasDetail ? 'pointer' : 'default', transition: 'background 0.1s' }}
                    >
                      {/* Color stripe */}
                      <td style={{ padding: '0 0 0 4px', width: 4 }}>
                        <div style={{ width: 3, height: 28, background: catColor, borderRadius: 2 }} />
                      </td>

                      {/* Name */}
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', paddingLeft: 10 }}>
                        {row.label}
                        <span style={{
                          marginLeft: 8, fontSize: 9, padding: '1px 5px',
                          background: 'var(--bg-input)', borderRadius: 3,
                          color: catColor, letterSpacing: '0.06em', fontWeight: 700,
                        }}>
                          {row.super_category.toUpperCase().slice(0, 3)}
                        </span>
                      </td>

                      {/* Value */}
                      <td style={{ fontFamily: 'var(--font-mono)', textAlign: 'right', color: 'var(--text-primary)' }}>
                        {fmt$(row.value, 0)}
                      </td>

                      {/* Gain ITD */}
                      <td style={{
                        fontFamily: 'var(--font-mono)', textAlign: 'right', fontWeight: 600,
                        color: row.net_gain >= 0 ? 'var(--green)' : 'var(--red)',
                      }}>
                        {row.net_gain >= 0 ? '+' : ''}{fmt$(row.net_gain, 0)}
                      </td>

                      {/* Return ITD */}
                      <ReturnCell value={row.return_pct} />

                      {/* vs Portfolio */}
                      <td style={{
                        fontFamily: 'var(--font-mono)', textAlign: 'right', fontWeight: 700,
                        color: vsPort >= 0 ? 'var(--green)' : 'var(--red)',
                      }}>
                        {vsPort > 0 ? '+' : ''}{vsPort.toFixed(2)}%
                      </td>

                      {/* Weight */}
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                          <div style={{ width: 40, height: 4, background: 'var(--border)', borderRadius: 2 }}>
                            <div style={{ width: `${Math.min(row.weight_pct / 30 * 100, 100)}%`, height: '100%', background: catColor, borderRadius: 2, opacity: 0.7 }} />
                          </div>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)' }}>
                            {row.weight_pct.toFixed(1)}%
                          </span>
                        </div>
                      </td>

                      {/* Expand toggle */}
                      <td style={{ width: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 11 }}>
                        {hasDetail ? (isOpen ? '▲' : '▼') : ''}
                      </td>
                    </tr>

                    {/* Expanded detail */}
                    {isOpen && row.super_category === 'equity' && (
                      <ExpandedEquity winners={row.top_winners || []} losers={row.top_losers || []} />
                    )}
                    {isOpen && row.super_category !== 'equity' && (
                      <ExpandedHoldings holdings={row.holdings} />
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Chart view ── */}
      {view === 'chart' && (
        <>
          <div style={{ display: 'flex', gap: 20, marginBottom: 16, fontSize: 10, color: 'var(--text-muted)' }}>
            <span><span style={{ color: 'var(--cyan)' }}>■</span> Equity</span>
            <span><span style={{ color: 'var(--amber)' }}>■</span> Alternatives</span>
            <span style={{ color: 'var(--green)' }}>▎ Portfolio (+{PORTFOLIO_RETURN.toFixed(2)}%)</span>
          </div>
          <BarChart rows={rows} />
        </>
      )}
    </div>
  )
}
