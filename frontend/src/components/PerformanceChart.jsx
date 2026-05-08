import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Area,
} from 'recharts'
import { useApi } from '../hooks/useApi'
import { fmt$, fmtShortDate } from '../utils/formatters'
import InfoButton from './InfoButton'
import { WIDGET_INFO } from '../data/widgetInfo'
import WandPanel from './WandPanel'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border-light)',
      borderRadius: 6,
      padding: '10px 14px',
      fontSize: 12,
    }}>
      <div style={{ color: 'var(--text-muted)', fontSize: 10, marginBottom: 8, letterSpacing: '0.06em' }}>
        {fmtShortDate(label)}
      </div>
      {payload.map((p) => (
        <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 20, color: p.color }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>{p.name}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
            {typeof p.value === 'number' && Math.abs(p.value) > 1000
              ? fmt$(p.value)
              : p.value}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function PerformanceChart() {
  const { data: monthly, loading } = useApi('/monthly')

  const chartData = (monthly || []).map((m) => ({
    month: m.month,
    deposits: m.deposits,
    withdrawals: -m.withdrawals,
    fees: -m.fees,
    income: m.income,
    'Net Invested': m.cumulative_invested,
  }))

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Monthly Cash Flows &amp; Cumulative Capital</span>
        <InfoButton title={WIDGET_INFO.cashFlowChart.title} content={WIDGET_INFO.cashFlowChart.content} />
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Jul 2024 → May 2026</span>
      </div>

      {loading ? (
        <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
          Loading…
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={270}>
          <ComposedChart data={chartData} margin={{ top: 0, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="month"
              tickFormatter={fmtShortDate}
              tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              interval={1}
            />
            <YAxis
              yAxisId="bar"
              tickFormatter={(v) => `${v >= 0 ? '' : '-'}$${Math.abs(v / 1000).toFixed(0)}k`}
              tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={52}
            />
            <YAxis
              yAxisId="line"
              orientation="right"
              tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
              tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={52}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 10, color: 'var(--text-secondary)', paddingTop: 8 }}
            />
            <Bar yAxisId="bar" dataKey="deposits"    name="Deposits"    fill="rgba(0,230,118,0.35)" radius={[2,2,0,0]} />
            <Bar yAxisId="bar" dataKey="withdrawals" name="Withdrawals"  fill="rgba(255,69,96,0.35)"  radius={[2,2,0,0]} />
            <Bar yAxisId="bar" dataKey="fees"        name="Fees"         fill="rgba(255,179,0,0.4)"   radius={[2,2,0,0]} />
            <Bar yAxisId="bar" dataKey="income"      name="Income"       fill="rgba(0,212,255,0.3)"   radius={[2,2,0,0]} />
            <Line
              yAxisId="line"
              type="monotone"
              dataKey="Net Invested"
              stroke="var(--cyan)"
              strokeWidth={2}
              dot={false}
              strokeDasharray="4 2"
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
      <WandPanel buildPrompt={() => {
        if (!monthly?.length) return null
        const totalDeposits = monthly.reduce((s, m) => s + (m.deposits || 0), 0)
        const totalFees = monthly.reduce((s, m) => s + (m.fees || 0), 0)
        const lastCumulative = monthly[monthly.length - 1]?.cumulative_invested
        return `In 2-3 plain-English sentences, explain what this cash flow chart shows about this investor's behavior since July 2024. Total deposited: $${totalDeposits?.toLocaleString()}, total fees paid: $${totalFees?.toLocaleString()}, cumulative net invested: $${lastCumulative?.toLocaleString()}. What pattern is notable? What should the investor expect? 2-3 sentences, no jargon.`
      }} />
    </div>
  )
}
