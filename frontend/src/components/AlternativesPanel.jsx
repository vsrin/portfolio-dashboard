/**
 * AlternativesPanel — table/card toggle, expandable rows, three reporting groups
 */
import { useState } from 'react'
import { useApi } from '../hooks/useApi'
import { fmt$ } from '../utils/formatters'

const VEHICLE_COLORS = {
  private_equity:  '#9b59b6',
  hedge_fund:      '#3498db',
  private_credit:  '#2ecc71',
  managed_futures: '#f39c12',
  hedged_equity:   '#e74c3c',
  venture:         '#1abc9c',
  commodity:       'var(--amber)',
}

const GROUP_META = {
  live: {
    label:   'Live / Daily Pricing',
    icon:    '◉',
    color:   'var(--green)',
    description: 'These vehicles trade or report at current market prices. Returns reflect today\'s actual value.',
  },
  quarterly: {
    label:   'Quarterly Reporting',
    icon:    '◎',
    color:   'var(--cyan)',
    description: 'Figures are as of the most recent quarter-end. Current values may differ by up to 3 months.',
  },
  j_curve: {
    label:   'J-Curve Phase — Capital Call',
    icon:    '◷',
    color:   'var(--amber)',
    description: 'These funds are still calling capital or in early deployment. 0% return is expected and correct — the J-Curve. Returns accelerate significantly as capital is deployed and investments mature (typically years 3–7).',
  },
}

function ReturnBadge({ pct, jCurve }) {
  if (jCurve && pct === 0) {
    return (
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: 'var(--amber)' }}>
        0.00% <span style={{ fontSize: 9, letterSpacing: '0.06em', marginLeft: 4 }}>J-CURVE</span>
      </span>
    )
  }
  const isNeg = pct < 0
  return (
    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: isNeg ? 'var(--red)' : 'var(--green)' }}>
      {pct > 0 ? '+' : ''}{pct.toFixed(2)}%
    </span>
  )
}

function HoldingRow({ h, isJCurve }) {
  const isNeg = h.return_pct < 0
  const isJCurveZero = isJCurve && h.return_pct === 0
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 100px 90px 80px',
      gap: 8, padding: '7px 0',
      borderBottom: '1px solid var(--border)',
      alignItems: 'center',
    }}>
      <div>
        <div style={{ fontSize: 11, color: 'var(--text-primary)', fontWeight: 500 }}>{h.name}</div>
        <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>{h.symbol}</div>
      </div>
      <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-primary)' }}>
        {fmt$(h.value, 0)}
      </div>
      <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 11, color: isNeg ? 'var(--red)' : 'var(--green)' }}>
        {h.gain >= 0 ? '+' : ''}{fmt$(h.gain, 0)}
      </div>
      <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700,
        color: isJCurveZero ? 'var(--amber)' : isNeg ? 'var(--red)' : 'var(--green)' }}>
        {h.return_pct > 0 ? '+' : ''}{h.return_pct.toFixed(2)}%
        {isJCurveZero && <span style={{ display: 'block', fontSize: 8, letterSpacing: '0.06em', color: 'var(--amber)', fontWeight: 400 }}>J-CURVE</span>}
      </div>
    </div>
  )
}

function VehicleCard({ item }) {
  const color   = VEHICLE_COLORS[item.id] || 'var(--cyan)'
  const isNeg   = item.return_pct < 0
  const isJCurve = item.j_curve

  return (
    <div className="card" style={{ borderLeft: `3px solid ${color}` }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{item.label}</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3, display: 'flex', gap: 10 }}>
            <span>{item.alt_alloc_pct.toFixed(1)}% of alts · {item.weight_pct.toFixed(1)}% of portfolio</span>
            <span style={{
              background: 'var(--bg-input)',
              padding: '1px 6px',
              borderRadius: 3,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              fontSize: 9,
            }}>{item.reporting_freq}</span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <ReturnBadge pct={item.return_pct} jCurve={isJCurve} />
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>since inception</div>
        </div>
      </div>

      {/* J-Curve callout */}
      {isJCurve && item.j_curve_note && (
        <div style={{
          marginBottom: 12, padding: '8px 10px',
          background: 'rgba(255,179,0,0.07)',
          border: '1px solid rgba(255,179,0,0.2)',
          borderRadius: 5, fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5,
        }}>
          <span style={{ color: 'var(--amber)', fontWeight: 700, marginRight: 6 }}>J-Curve</span>
          {item.j_curve_note}
        </div>
      )}

      {/* Last reported note for quarterly */}
      {!isJCurve && item.last_reported && item.reporting_freq !== 'daily' && (
        <div style={{ marginBottom: 10, fontSize: 10, color: 'var(--text-muted)' }}>
          Last reported: <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{item.last_reported}</span>
        </div>
      )}

      {/* Value + Gain row */}
      <div style={{ display: 'grid', gridTemplateColumns: item.income > 0 ? '1fr 1fr 1fr' : '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 4, letterSpacing: '0.06em' }}>MARKET VALUE</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
            {fmt$(item.value, 0)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 4, letterSpacing: '0.06em' }}>NET GAIN</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 700, color: isJCurve && item.net_gain === 0 ? 'var(--amber)' : isNeg ? 'var(--red)' : 'var(--green)' }}>
            {item.net_gain >= 0 ? '+' : ''}{fmt$(item.net_gain, 0)}
          </div>
        </div>
        {item.income > 0 && (
          <div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 4, letterSpacing: '0.06em' }}>INCOME</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 700, color: 'var(--cyan)' }}>
              {fmt$(item.income, 0)}
            </div>
          </div>
        )}
      </div>

      {/* Alts allocation bar */}
      <div style={{ marginBottom: item.holdings?.length > 0 ? 12 : 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>ALTS ALLOCATION</span>
          <span style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{item.alt_alloc_pct.toFixed(1)}%</span>
        </div>
        <div style={{ height: 3, background: 'var(--border)', borderRadius: 2 }}>
          <div style={{ width: `${item.alt_alloc_pct}%`, height: '100%', background: color, borderRadius: 2, opacity: 0.8 }} />
        </div>
      </div>

      {/* Holdings */}
      {item.holdings?.length > 0 && (
        <div>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: 6 }}>HOLDINGS</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', display: 'grid', gridTemplateColumns: '1fr 100px 90px 80px', gap: 8, marginBottom: 4, paddingBottom: 4, borderBottom: '1px solid var(--border)' }}>
            <span>Name</span><span style={{ textAlign: 'right' }}>Value</span>
            <span style={{ textAlign: 'right' }}>Gain</span><span style={{ textAlign: 'right' }}>Return</span>
          </div>
          {item.holdings.map(h => <HoldingRow key={h.symbol} h={h} isJCurve={isJCurve} />)}
        </div>
      )}
    </div>
  )
}

function GroupSection({ groupId, items }) {
  if (!items.length) return null
  const meta = GROUP_META[groupId]

  return (
    <div>
      {/* Section header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        marginBottom: 16,
        padding: '10px 16px',
        background: 'var(--bg-card)',
        borderRadius: 6,
        border: `1px solid var(--border)`,
        borderLeft: `3px solid ${meta.color}`,
      }}>
        <span style={{ fontSize: 16, color: meta.color }}>{meta.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.04em' }}>
            {meta.label}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, lineHeight: 1.4 }}>
            {meta.description}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{items.length} vehicle{items.length > 1 ? 's' : ''}</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginTop: 2 }}>
            {fmt$(items.reduce((s, i) => s + i.value, 0), 0)}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: items.length === 1 ? '1fr' : '1fr 1fr', gap: 20 }}>
        {items.map(item => <VehicleCard key={item.id} item={item} />)}
      </div>
    </div>
  )
}

const GROUP_LABEL = { live: 'Live', quarterly: 'Quarterly', j_curve: 'J-Curve' }

function AltsTable({ items }) {
  const [expanded, setExpanded] = useState(new Set())
  const [sortBy,   setSortBy]   = useState('value')
  const [sortDir,  setSortDir]  = useState('desc')

  const toggle = (id) => setExpanded(prev => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next
  })
  const onSort = (col) => {
    if (sortBy === col) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortBy(col); setSortDir('desc') }
  }

  const SortIcon = ({ col }) => (
    <span style={{ marginLeft: 4, fontSize: 9, opacity: sortBy === col ? 1 : 0.3, color: sortBy === col ? 'var(--cyan)' : 'inherit' }}>
      {sortBy === col ? (sortDir === 'desc' ? '▼' : '▲') : '⇅'}
    </span>
  )

  const sorted = [...items].sort((a, b) => {
    const va = a[sortBy] ?? 0, vb = b[sortBy] ?? 0
    return sortDir === 'desc' ? vb - va : va - vb
  })

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ fontSize: 12 }}>
        <thead>
          <tr>
            <th style={{ width: 32 }} />
            <th onClick={() => onSort('label')} style={{ cursor: 'pointer', textAlign: 'left' }}>Vehicle <SortIcon col="label" /></th>
            <th onClick={() => onSort('value')}      style={{ cursor: 'pointer' }}>Value <SortIcon col="value" /></th>
            <th onClick={() => onSort('net_gain')}   style={{ cursor: 'pointer' }}>Gain ITD <SortIcon col="net_gain" /></th>
            <th onClick={() => onSort('return_pct')} style={{ cursor: 'pointer' }}>Return <SortIcon col="return_pct" /></th>
            <th onClick={() => onSort('weight_pct')} style={{ cursor: 'pointer' }}>Portfolio Wt <SortIcon col="weight_pct" /></th>
            <th>Group</th>
            <th>Reporting</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {sorted.map(item => {
            const color  = VEHICLE_COLORS[item.id] || 'var(--cyan)'
            const isOpen = expanded.has(item.id)
            const isNeg  = item.return_pct < 0
            const isJC   = item.j_curve && item.return_pct === 0

            return (
              <>
                <tr
                  key={item.id}
                  onClick={() => item.holdings?.length && toggle(item.id)}
                  style={{ cursor: item.holdings?.length ? 'pointer' : 'default' }}
                >
                  <td style={{ padding: '0 0 0 4px', width: 4 }}>
                    <div style={{ width: 3, height: 28, background: color, borderRadius: 2 }} />
                  </td>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)', paddingLeft: 10, whiteSpace: 'nowrap' }}>
                    {item.label}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', textAlign: 'right', color: 'var(--text-primary)' }}>
                    {fmt$(item.value, 0)}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', textAlign: 'right', fontWeight: 600,
                    color: item.net_gain >= 0 ? 'var(--green)' : 'var(--red)' }}>
                    {item.net_gain >= 0 ? '+' : ''}{fmt$(item.net_gain, 0)}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', textAlign: 'right', fontWeight: 700,
                    color: isJC ? 'var(--amber)' : isNeg ? 'var(--red)' : 'var(--green)' }}>
                    {item.return_pct > 0 ? '+' : ''}{item.return_pct.toFixed(2)}%
                    {isJC && <span style={{ display: 'block', fontSize: 8, color: 'var(--amber)', fontWeight: 400 }}>J-CURVE</span>}
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)' }}>
                    {item.weight_pct.toFixed(1)}%
                  </td>
                  <td>
                    <span style={{
                      fontSize: 9, padding: '2px 6px', borderRadius: 3, fontWeight: 700, letterSpacing: '0.06em',
                      background: item.group === 'j_curve' ? 'rgba(255,179,0,0.12)' : item.group === 'live' ? 'rgba(0,230,118,0.10)' : 'rgba(0,212,255,0.08)',
                      color: item.group === 'j_curve' ? 'var(--amber)' : item.group === 'live' ? 'var(--green)' : 'var(--cyan)',
                    }}>
                      {GROUP_LABEL[item.group] || item.group}
                    </span>
                  </td>
                  <td style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {item.reporting_freq}
                  </td>
                  <td style={{ width: 32, textAlign: 'center', fontSize: 11, color: 'var(--text-muted)' }}>
                    {item.holdings?.length ? (isOpen ? '▲' : '▼') : ''}
                  </td>
                </tr>

                {/* Expanded holdings */}
                {isOpen && item.holdings?.length > 0 && (
                  <tr key={item.id + '_exp'}>
                    <td colSpan={9} style={{ padding: '10px 16px 14px 36px', background: 'var(--bg-input)', borderBottom: '1px solid var(--border)' }}>
                      {item.j_curve_note && (
                        <div style={{ marginBottom: 10, padding: '7px 10px', background: 'rgba(255,179,0,0.07)', border: '1px solid rgba(255,179,0,0.2)', borderRadius: 5, fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                          <span style={{ color: 'var(--amber)', fontWeight: 700, marginRight: 6 }}>J-Curve</span>
                          {item.j_curve_note}
                        </div>
                      )}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
                        {item.holdings.map(h => {
                          const pos = h.return_pct >= 0
                          const isJC2 = item.j_curve && h.return_pct === 0
                          return (
                            <div key={h.symbol} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 10px', borderRadius: 5, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                              <div>
                                <div style={{ fontSize: 11, color: 'var(--text-primary)', fontWeight: 500 }}>{h.name}</div>
                                <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>{h.symbol}</div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: isJC2 ? 'var(--amber)' : pos ? 'var(--green)' : 'var(--red)' }}>
                                  {h.return_pct > 0 ? '+' : ''}{h.return_pct.toFixed(2)}%
                                  {isJC2 && <span style={{ fontSize: 8, marginLeft: 4, color: 'var(--amber)' }}>J-CURVE</span>}
                                </div>
                                <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{fmt$(h.value, 0)}</div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default function AlternativesPanel() {
  const { data, loading } = useApi('/alternatives')
  const [view, setView]   = useState('table')

  if (loading) return (
    <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>
  )
  if (!data) return null

  const byGroup = { live: [], quarterly: [], j_curve: [] }
  for (const item of data.items) {
    const g = item.group || 'quarterly'
    if (byGroup[g]) byGroup[g].push(item)
  }

  // Bond-proxy alts (exclude J-Curve, they skew the comparison)
  const bondProxies = data.items.filter(i => i.bond_proxy)
  const bpValue  = bondProxies.reduce((s, i) => s + i.value, 0)
  const bpGain   = bondProxies.reduce((s, i) => s + i.net_gain, 0)
  const bpReturn = bpValue > 0 ? (bpGain / (bpValue - bpGain) * 100) : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* ── Summary KPI bar ──────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {[
          { label: 'Alts Total Value',    value: fmt$(data.total_value, 0),   color: 'var(--amber)' },
          { label: 'Net Gain (Inception)', value: `+${fmt$(data.total_gain, 0)}`, color: 'var(--green)' },
          { label: 'Alts Return (ITD)',
            value: `${data.total_return_pct >= 0 ? '+' : ''}${data.total_return_pct.toFixed(2)}%`,
            sub: 'since Jul 2024',
            color: data.total_return_pct >= 0 ? 'var(--green)' : 'var(--red)' },
          { label: 'Portfolio Weight',    value: `${data.portfolio_pct.toFixed(1)}%`, sub: 'of total AUM', color: 'var(--amber)' },
        ].map(({ label, value, sub, color }) => (
          <div key={label} className="card">
            <div className="card-title" style={{ marginBottom: 10 }}>{label}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
            {sub && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }}>{sub}</div>}
          </div>
        ))}
      </div>

      {/* ── Bond-proxy active scorecard ───────────────────────────────────────── */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Bond Substitute Scorecard</span>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Excludes J-Curve vehicles (PE / VC) — they haven't deployed capital yet</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: 8 }}>BOND-PROXY ALTS VALUE</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, color: 'var(--amber)' }}>{fmt$(bpValue, 0)}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>{bondProxies.map(i => i.label).join(', ')}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: 8 }}>RETURN ON BOND-PROXY ALTS</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, color: bpReturn >= 0 ? 'var(--green)' : 'var(--red)' }}>
              {bpReturn >= 0 ? '+' : ''}{bpReturn.toFixed(2)}%
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>vs AGG bonds as alternative</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: 8 }}>INCOME FROM ALL ALTS</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, color: 'var(--cyan)' }}>
              {fmt$(data.items.reduce((s, i) => s + i.income, 0), 0)}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>dividends + distributions</div>
          </div>
        </div>
        <div style={{ marginTop: 16, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {bondProxies.map(item => {
            const isNeg = item.return_pct < 0
            return (
              <div key={item.id} style={{
                padding: '4px 10px',
                background: 'var(--bg-input)',
                borderRadius: 4,
                border: `1px solid ${VEHICLE_COLORS[item.id] || 'var(--border)'}33`,
                fontSize: 11,
                display: 'flex', gap: 8, alignItems: 'center',
              }}>
                <span style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: isNeg ? 'var(--red)' : 'var(--green)' }}>
                  {item.return_pct > 0 ? '+' : ''}{item.return_pct.toFixed(2)}%
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── View toggle ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>View:</span>
        <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 5, overflow: 'hidden' }}>
          {[['table', '≡ Table'], ['cards', '▦ Cards']].map(([v, lbl]) => (
            <button key={v} onClick={() => setView(v)} style={{
              background: view === v ? 'var(--cyan)' : 'var(--bg-input)',
              border: 'none',
              borderRight: v === 'table' ? '1px solid var(--border)' : 'none',
              color: view === v ? 'var(--bg-base)' : 'var(--text-secondary)',
              padding: '5px 14px', fontSize: 11,
              fontWeight: view === v ? 700 : 400,
              cursor: 'pointer', letterSpacing: '0.04em',
              fontFamily: 'var(--font-ui)',
            }}>{lbl}</button>
          ))}
        </div>
      </div>

      {/* ── Table view ──────────────────────────────────────────────────────── */}
      {view === 'table' && (
        <div className="card" style={{ padding: 0 }}>
          <AltsTable items={data.items} />
        </div>
      )}

      {/* ── Card view (grouped) ─────────────────────────────────────────────── */}
      {view === 'cards' && (
        <>
          <GroupSection groupId="live"      items={byGroup.live} />
          <GroupSection groupId="quarterly" items={byGroup.quarterly} />
          <GroupSection groupId="j_curve"   items={byGroup.j_curve} />
        </>
      )}
    </div>
  )
}
