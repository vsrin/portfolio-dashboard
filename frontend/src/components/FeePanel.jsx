import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts'
import { useApi } from '../hooks/useApi'
import { fmt$, fmtShortDate } from '../utils/formatters'



const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border-light)',
      borderRadius: 6,
      padding: '10px 14px',
    }}>
      <div style={{ color: 'var(--text-muted)', fontSize: 10, marginBottom: 6 }}>{fmtShortDate(label)}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--amber)' }}>
        {fmt$(payload[0].value)}
      </div>
    </div>
  )
}

export default function FeePanel() {
  const { data, loading } = useApi('/fees')
  const { data: summary } = useApi('/summary')

  const aumTotal   = summary?.total_value ?? 0
  const avgMonthly = data ? (data.total_fees / (data.monthly_series?.length || 1)) : 0

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {[
          {
            label: 'Total Fees Paid',
            value: fmt$(data?.total_fees),
            sub: `${data?.fee_count} fee transactions`,
            color: 'var(--amber)',
          },
          {
            label: 'Avg Monthly Fee',
            value: fmt$(avgMonthly),
            sub: 'over 22 months of data',
            color: 'var(--amber)',
          },
          {
            label: 'Annualized Fee Rate',
            value: data ? `${data.annualized_fee_rate_pct.toFixed(3)}%` : '—',
            sub: 'Tamarac ~0.34–0.38% + sub-mgr',
            color: 'var(--text-primary)',
          },
          {
            label: 'Fee Drag vs AUM',
            value: data && aumTotal ? `${((data.total_fees / aumTotal) * 100).toFixed(2)}%` : '—',
            sub: 'cumulative since Jul 2024',
            color: 'var(--red)',
          },
        ].map(({ label, value, sub, color }) => (
          <div key={label} className="card">
            <div className="card-title" style={{ marginBottom: 10 }}>{label}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, color, lineHeight: 1 }}>
              {loading ? '…' : value}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Monthly fees chart */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Monthly Fee Payments</span>
          <span style={{ fontSize: 11, color: 'var(--amber)' }}>Avg {fmt$(avgMonthly)}/mo</span>
        </div>
        {loading ? (
          <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            Loading…
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data?.monthly_series || []} margin={{ top: 0, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="month"
                tickFormatter={fmtShortDate}
                tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v) => `$${v >= 1000 ? (v/1000).toFixed(1)+'k' : v}`}
                tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={48}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine
                y={avgMonthly}
                stroke="var(--amber)"
                strokeDasharray="4 2"
                strokeWidth={1}
                opacity={0.5}
              />
              <Bar dataKey="fees" name="Fees" fill="var(--amber)" radius={[3,3,0,0]} opacity={0.8} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* By account */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="card">
          <div className="card-header">
            <span className="card-title">Fees by Account</span>
          </div>
          {loading ? null : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(data?.by_account || []).filter(a => a.total_fees > 0).map((a) => {
                const maxFee = Math.max(...(data?.by_account || []).map(x => x.total_fees))
                const barW = ((a.total_fees / maxFee) * 100).toFixed(1)
                return (
                  <div key={a.account}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{a.name}</span>
                      <div style={{ display: 'flex', gap: 12 }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--amber)' }}>
                          {fmt$(a.total_fees)}
                        </span>
                      </div>
                    </div>
                    <div style={{ height: 4, background: 'var(--border)', borderRadius: 2 }}>
                      <div style={{ width: `${barW}%`, height: '100%', background: 'var(--amber)', borderRadius: 2, opacity: 0.7 }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Recent Fee Transactions</span>
          </div>
          <div style={{ overflowY: 'auto', maxHeight: 260 }}>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Account</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {(data?.recent_fees || []).map((f, i) => (
                  <tr key={i}>
                    <td style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                      {f.date}
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{f.account_name}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--amber)', fontSize: 12 }}>
                      {fmt$(f.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
