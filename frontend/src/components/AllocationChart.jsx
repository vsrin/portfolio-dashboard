import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { useApi } from '../hooks/useApi'
import { fmt$ } from '../utils/formatters'
import InfoButton from './InfoButton'
import { WIDGET_INFO } from '../data/widgetInfo'

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border-light)',
      borderRadius: 6,
      padding: '10px 14px',
      fontSize: 12,
    }}>
      <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{p.label}</div>
      <div style={{ fontFamily: 'var(--font-mono)', color: p.color }}>{fmt$(p.value, 0)}</div>
      <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>{p.pct.toFixed(1)}% of AUM</div>
      {p.return_pct != null && (
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: p.return_pct >= 0 ? 'var(--green)' : 'var(--red)',
          marginTop: 2,
        }}>
          {p.return_pct >= 0 ? '+' : ''}{p.return_pct.toFixed(2)}% return
        </div>
      )}
    </div>
  )
}

export default function AllocationChart() {
  const { data, loading } = useApi('/allocation')
  const { data: summary } = useApi('/summary')

  const chartData = (data || []).filter(d => d.value > 0).map(d => ({
    ...d,
    fill: d.color,
  }))

  const total = summary?.total_value ?? 0

  return (
    <div className="card" style={{ height: 340 }}>
      <div className="card-header">
        <span className="card-title">Portfolio Allocation</span>
        <InfoButton title={WIDGET_INFO.allocationDonut.title} content={WIDGET_INFO.allocationDonut.content} />
      </div>

      {loading ? (
        <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
          Loading…
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', height: 280 }}>
          {/* Donut with center label */}
          <div style={{ position: 'relative', height: 180 }}>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                >
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} stroke="var(--bg-card)" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>

            {/* Center label */}
            {total > 0 && (
              <div style={{
                position: 'absolute',
                top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                pointerEvents: 'none',
              }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                  {fmt$(total, 0)}
                </div>
                <div style={{ fontSize: 8, color: 'var(--text-muted)', letterSpacing: '0.08em', marginTop: 1 }}>
                  TOTAL AUM
                </div>
              </div>
            )}
          </div>

          {/* Legend rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0 8px' }}>
            {chartData.map(d => (
              <div key={d.category} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: d.fill, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{d.label}</span>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-primary)' }}>
                    {fmt$(d.value, 0)}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', minWidth: 36, textAlign: 'right' }}>
                    {d.pct.toFixed(1)}%
                  </span>
                  {d.return_pct != null && (
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 10,
                      color: d.return_pct >= 0 ? 'var(--green)' : 'var(--red)',
                      minWidth: 48,
                      textAlign: 'right',
                    }}>
                      {d.return_pct >= 0 ? '+' : ''}{d.return_pct.toFixed(1)}%
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
