import { useState, useEffect } from 'react'
import { fmt$, fmtDate } from '../utils/formatters'

const TYPE_COLOR = {
  deposit:       'var(--green)',
  withdrawal:    'var(--red)',
  fee:           'var(--amber)',
  income:        'var(--cyan)',
  buy:           '#9b59b6',
  sell:          '#e74c3c',
  transfer:      'var(--text-muted)',
  security_in:   'var(--text-secondary)',
  security_out:  'var(--text-secondary)',
  other:         'var(--text-muted)',
}

const TYPE_LABEL = {
  deposit:      'DEPOSIT',
  withdrawal:   'WITHDRAW',
  fee:          'FEE',
  income:       'INCOME',
  buy:          'BUY',
  sell:         'SELL',
  transfer:     'TRANSFER',
  security_in:  'SEC IN',
  security_out: 'SEC OUT',
  other:        'OTHER',
}

const ACCOUNTS = [
  { value: '', label: 'All Accounts' },
  { value: '637263814',    label: 'Vinod IRA' },
  { value: '637311192',    label: 'Individual TOD' },
  { value: '637263812',    label: 'Joint TOD' },
  { value: '637268133',    label: 'Sree IRA' },
  { value: '637762659-117',label: 'Weather Mark' },
  { value: '637762659-185',label: 'Putnam' },
  { value: '637762659-2',  label: 'LEIA' },
  { value: '637762659-53', label: 'Invenomic' },
  { value: '637762659-21', label: 'Gold SPDR' },
  { value: '637762659-0',  label: 'Untracked' },
  { value: '652645659',    label: '401K (Closed)' },
]

const ACTIVITIES = [
  { value: '',              label: 'All Activities' },
  { value: 'Deposit',       label: 'Deposits' },
  { value: 'Withdrawal',    label: 'Withdrawals' },
  { value: 'Management Fee',label: 'Fees' },
  { value: 'Dividend',      label: 'Dividends' },
  { value: 'Buy',           label: 'Buys' },
  { value: 'Sell',          label: 'Sells' },
  { value: 'Money Transfer', label: 'Transfers' },
]

const selectStyle = {
  background: 'var(--bg-input)',
  border: '1px solid var(--border)',
  borderRadius: 4,
  color: 'var(--text-secondary)',
  padding: '6px 10px',
  fontSize: 12,
  cursor: 'pointer',
  outline: 'none',
}

const inputStyle = {
  ...selectStyle,
  width: 200,
  fontFamily: 'var(--font-ui)',
}

export default function TransactionTable() {
  const [filters, setFilters] = useState({
    account: '',
    activity: '',
    date_from: '',
    date_to: '',
    search: '',
    page: 1,
    per_page: 50,
  })
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)

  const fetchData = () => {
    setLoading(true)
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v) })
    fetch(`/api/transactions?${params}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(fetchData, [filters.page, filters.per_page])

  const set = (k, v) => setFilters(f => ({ ...f, [k]: v, page: 1 }))
  const applyFilters = () => setFilters(f => ({ ...f, page: 1 }))

  return (
    <div className="card">
      <div className="card-header" style={{ flexWrap: 'wrap', gap: 10 }}>
        <span className="card-title">Transaction Ledger</span>
        {data && (
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {data.total.toLocaleString()} transactions · page {data.page} of {data.pages}
          </span>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
        <input
          style={inputStyle}
          placeholder="Search symbol, description…"
          value={filters.search}
          onChange={e => set('search', e.target.value)}
          onKeyDown={e => e.key === 'Enter' && fetchData()}
        />
        <select style={selectStyle} value={filters.account} onChange={e => set('account', e.target.value)}>
          {ACCOUNTS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
        </select>
        <select style={selectStyle} value={filters.activity} onChange={e => set('activity', e.target.value)}>
          {ACTIVITIES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
        </select>
        <input
          type="date"
          style={selectStyle}
          value={filters.date_from}
          onChange={e => set('date_from', e.target.value)}
        />
        <input
          type="date"
          style={selectStyle}
          value={filters.date_to}
          onChange={e => set('date_to', e.target.value)}
        />
        <button
          onClick={fetchData}
          style={{
            background: 'var(--cyan)',
            border: 'none',
            borderRadius: 4,
            color: 'var(--bg-base)',
            padding: '6px 16px',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            letterSpacing: '0.04em',
          }}
        >
          APPLY
        </button>
        <button
          onClick={() => {
            setFilters({ account: '', activity: '', date_from: '', date_to: '', search: '', page: 1, per_page: 50 })
            setTimeout(fetchData, 0)
          }}
          style={{ ...selectStyle, padding: '6px 12px' }}
        >
          Reset
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Date ▼</th>
                <th>Type</th>
                <th>Account</th>
                <th>Description</th>
                <th>Symbol</th>
                <th style={{ textAlign: 'right' }}>Qty</th>
                <th style={{ textAlign: 'right' }}>Price</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
                <th style={{ textAlign: 'right' }}>Cash Impact</th>
              </tr>
            </thead>
            <tbody>
              {(data?.items || []).map((t, i) => {
                const color = TYPE_COLOR[t.type] || 'var(--text-primary)'
                return (
                  <tr key={i}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
                      {fmtDate(t.date)}
                    </td>
                    <td>
                      <span style={{
                        display: 'inline-block',
                        padding: '1px 6px',
                        borderRadius: 3,
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: '0.06em',
                        background: `${color}18`,
                        color,
                      }}>
                        {TYPE_LABEL[t.type] || t.type}
                      </span>
                    </td>
                    <td style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{t.account_name}</td>
                    <td style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', fontSize: 11, color: 'var(--text-secondary)' }}>
                      {t.description}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-primary)' }}>
                      {t.symbol || '—'}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
                      {t.quantity ? t.quantity.toLocaleString(undefined, { maximumFractionDigits: 4 }) : '—'}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
                      {t.price ? fmt$(t.price, 2) : '—'}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, color: t.amount < 0 ? 'var(--red)' : t.amount > 0 ? 'var(--green)' : 'var(--text-muted)', fontWeight: 600 }}>
                      {t.amount !== 0 ? fmt$(t.amount, 2) : '—'}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)' }}>
                      {t.cash_impact !== 0 ? fmt$(t.cash_impact, 2) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {data && data.pages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16 }}>
          <button
            onClick={() => set('page', Math.max(1, filters.page - 1))}
            disabled={filters.page === 1}
            style={{ ...selectStyle, opacity: filters.page === 1 ? 0.4 : 1, cursor: filters.page === 1 ? 'not-allowed' : 'pointer' }}
          >
            ← Prev
          </button>
          {Array.from({ length: Math.min(7, data.pages) }, (_, i) => {
            const p = filters.page <= 4 ? i + 1 : filters.page - 3 + i
            if (p < 1 || p > data.pages) return null
            return (
              <button
                key={p}
                onClick={() => set('page', p)}
                style={{
                  ...selectStyle,
                  background: p === filters.page ? 'var(--cyan)' : 'var(--bg-input)',
                  color: p === filters.page ? 'var(--bg-base)' : 'var(--text-secondary)',
                  fontWeight: p === filters.page ? 700 : 400,
                  width: 32,
                  textAlign: 'center',
                }}
              >
                {p}
              </button>
            )
          })}
          <button
            onClick={() => set('page', Math.min(data.pages, filters.page + 1))}
            disabled={filters.page === data.pages}
            style={{ ...selectStyle, opacity: filters.page === data.pages ? 0.4 : 1, cursor: filters.page === data.pages ? 'not-allowed' : 'pointer' }}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
