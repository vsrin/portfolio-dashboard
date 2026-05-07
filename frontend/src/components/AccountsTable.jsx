import { useState } from 'react'
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

export default function AccountsTable() {
  const { data: assetClasses, loading } = useApi('/asset-classes')
  const { data: summary } = useApi('/summary')
  const [filter, setFilter] = useState('all')

  const all     = assetClasses || []
  const visible = filter === 'all' ? all : all.filter(ac => ac.super_category === filter)
  const sorted  = [...visible].sort((a, b) => b.value - a.value)
  const maxWeight = all.length ? Math.max(...all.map(ac => ac.weight_pct)) : 1
  const total   = summary?.total_value ?? 0

  const btnStyle = (active) => ({
    background: active ? 'var(--cyan)' : 'var(--bg-input)',
    border: '1px solid var(--border)',
    borderRadius: 4,
    color: active ? 'var(--bg-base)' : 'var(--text-secondary)',
    padding: '5px 14px',
    fontSize: 11,
    fontWeight: active ? 700 : 400,
    cursor: 'pointer',
    letterSpacing: '0.04em',
    fontFamily: 'var(--font-ui)',
  })

  return (
    <div className="card">
      <div className="card-header" style={{ flexWrap: 'wrap', gap: 10 }}>
        <span className="card-title">Asset Class Holdings</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Category filter */}
          <div style={{ display: 'flex', gap: 4 }}>
            {FILTERS.map(f => (
              <button key={f.id} style={btnStyle(filter === f.id)} onClick={() => setFilter(f.id)}>
                {f.label}
              </button>
            ))}
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--cyan)', fontWeight: 700 }}>
            {fmt$(total, 0)}
          </span>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Asset Class</th>
                <th>Category</th>
                <th style={{ textAlign: 'right' }}>Market Value</th>
                <th style={{ textAlign: 'right' }}>Weight</th>
                <th style={{ textAlign: 'right' }}>Cost Basis</th>
                <th style={{ textAlign: 'right' }}>Net Gain</th>
                <th style={{ textAlign: 'right' }}>Return</th>
                <th style={{ textAlign: 'right' }}>Income</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(ac => {
                const color    = CATEGORY_COLOR[ac.super_category] || 'var(--text-primary)'
                const isNeg    = ac.net_gain < 0
                const retColor = isNeg ? 'var(--red)' : 'var(--green)'
                return (
                  <tr key={ac.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 12 }}>
                        {ac.label}
                      </div>
                    </td>
                    <td>
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontSize: 10,
                        fontWeight: 600,
                        letterSpacing: '0.06em',
                        background: `${color}18`,
                        color,
                      }}>
                        {CATEGORY_LABEL[ac.super_category] || ac.super_category}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color, fontWeight: 600 }}>
                      {fmt$(ac.value, 0)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                        <div style={{ width: 48, height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{
                            width: `${(ac.weight_pct / maxWeight) * 100}%`,
                            height: '100%',
                            background: color,
                            borderRadius: 2,
                          }} />
                        </div>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)', minWidth: 36 }}>
                          {ac.weight_pct.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                      {fmt$(ac.cost_basis, 0)}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: retColor }}>
                      {ac.net_gain >= 0 ? '+' : ''}{fmt$(ac.net_gain, 0)}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: retColor }}>
                      {ac.return_pct > 0 ? '+' : ''}{ac.return_pct.toFixed(2)}%
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--cyan)' }}>
                      {ac.income > 0 ? fmt$(ac.income, 0) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2} style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 12, paddingTop: 14 }}>
                  {filter === 'all' ? 'TOTAL' : `${CATEGORY_LABEL[filter]?.toUpperCase()} SUBTOTAL`}
                </td>
                <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--cyan)', paddingTop: 14 }}>
                  {fmt$(sorted.reduce((s, ac) => s + ac.value, 0), 0)}
                </td>
                <td colSpan={5} style={{ paddingTop: 14 }} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
