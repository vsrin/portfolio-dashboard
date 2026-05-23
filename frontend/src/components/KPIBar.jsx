import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts'
import { useApi } from '../hooks/useApi'
import { fmt$ } from '../utils/formatters'
import InfoButton from './InfoButton'
import { getWidgetInfo } from '../data/widgetInfo'
import { useIdentity } from '../context/IdentityContext'

function AumSparkline({ series }) {
  if (!series?.length) return null
  const points = series.slice(-12)
  const min = Math.min(...points.map(p => p.value))
  const max = Math.max(...points.map(p => p.value))
  const range = max - min || 1
  // Normalise to 0-100 for a stable y-axis that shows relative movement clearly
  const data = points.map(p => ({ ...p, v: Math.round(((p.value - min) / range) * 100) }))
  return (
    <div style={{ marginTop: 8, height: 40 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const pt = payload[0].payload
              return (
                <div style={{
                  background: 'var(--bg-surface)', border: '1px solid var(--border)',
                  borderRadius: 4, padding: '4px 8px', fontSize: 10,
                  color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)',
                }}>
                  <div style={{ color: 'var(--text-muted)', marginBottom: 1 }}>{pt.month}</div>
                  <div style={{ color: 'var(--cyan)', fontWeight: 700 }}>{fmt$(pt.value, 0)}</div>
                </div>
              )
            }}
          />
          <Line
            type="monotone" dataKey="v"
            stroke="var(--cyan)" strokeWidth={1.5}
            dot={false} activeDot={{ r: 3, fill: 'var(--cyan)', strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

const PERIODS = [
  { key: 'MTD', label: 'MTD' },
  { key: 'QTD', label: 'QTD' },
  { key: 'YTD', label: 'YTD' },
  { key: '1Y',  label: '1 Year' },
  { key: 'ITD', label: 'Inception' },
]

function KPI({ label, value, color, borderColor, infoKey, role, children }) {
  const info = infoKey ? getWidgetInfo(infoKey, role) : null
  return (
    <div className="kpi-tile" style={{
      flex: 1,
      padding: '12px 18px',
      borderRight: '1px solid var(--border)',
      borderTop: `2px solid ${borderColor || 'transparent'}`,
      minWidth: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
        <span className="label">{label}</span>
        {info && <InfoButton title={info.title} content={info.content} />}
      </div>
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 19,
        fontWeight: 700,
        color: color || 'var(--text-primary)',
        letterSpacing: '-0.01em',
        lineHeight: 1.1,
        marginBottom: 6,
      }}>
        {value}
      </div>
      {children}
    </div>
  )
}

function SubRow({ label, value, valueColor }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 3 }}>
      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 600, color: valueColor || 'var(--text-secondary)' }}>
        {value}
      </span>
    </div>
  )
}

function FeeBar({ advisorFees, subMgrFees }) {
  const total = advisorFees + subMgrFees
  const advisorPct = total > 0 ? (advisorFees / total) * 100 : 50
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ height: 4, borderRadius: 2, background: 'var(--border)', overflow: 'hidden', display: 'flex' }}>
        <div style={{ width: `${advisorPct}%`, background: 'var(--amber)', borderRadius: '2px 0 0 2px' }} />
        <div style={{ flex: 1, background: 'var(--red)', opacity: 0.7, borderRadius: '0 2px 2px 0' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
        <span style={{ fontSize: 9, color: 'var(--amber)' }}>■ Advisor</span>
        <span style={{ fontSize: 9, color: 'var(--red)', opacity: 0.85 }}>■ Sub-mgr drag</span>
      </div>
    </div>
  )
}

export default function KPIBar({ period = 'MTD', onPeriodChange }) {
  const { data: d, loading: L } = useApi('/summary')
  const { role } = useIdentity()

  const periodGain = {
    MTD: d?.gain_mtd,
    QTD: d?.gain_qtd,
    YTD: d?.gain_ytd,
    '1Y': d?.gain_1y,
    ITD: d?.total_gain,
  }

  const periodIrr = {
    MTD: d?.net_irr_mtd,
    QTD: d?.net_irr_qtd,
    YTD: d?.net_irr_ytd,
    '1Y': d?.net_irr_1y,
    ITD: d?.total_gain_pct,
  }

  const gain = periodGain[period]
  const irr  = periodIrr[period]
  const gainPositive = gain == null || gain >= 0

  const periodLabel = PERIODS.find(p => p.key === period)?.label

  // Sleeve period maps — only YTD and 1Y have per-sleeve data
  const eqGain = { ITD: d?.equity_gain, YTD: d?.equity_gain_ytd, '1Y': d?.equity_gain_1y }[period] ?? null
  const eqRet  = { ITD: d?.equity_return_pct, YTD: d?.equity_return_pct_ytd, '1Y': d?.equity_return_pct_1y }[period] ?? null
  const altGain = { ITD: d?.alternatives_gain, YTD: d?.alternatives_gain_ytd, '1Y': d?.alternatives_gain_1y }[period] ?? null
  const altRet  = { ITD: d?.alternatives_return_pct, YTD: d?.alternatives_return_pct_ytd, '1Y': d?.alternatives_return_pct_1y }[period] ?? null

  const fmtRet = (v) => v == null ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`
  const fmtGain = (v) => v == null ? '—' : `${v >= 0 ? '+' : ''}${fmt$(v, 0)}`

  return (
    <div style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}>

      {/* Period selector */}
      <div style={{
        display: 'flex',
        gap: 4,
        padding: '6px 18px',
        borderBottom: '1px solid var(--border)',
        alignItems: 'center',
      }}>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', marginRight: 6, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Period</span>
        {PERIODS.map(p => (
          <button
            key={p.key}
            onClick={() => onPeriodChange?.(p.key)}
            style={{
              padding: '2px 10px',
              fontSize: 10,
              fontWeight: 600,
              borderRadius: 3,
              border: period === p.key ? '1px solid var(--cyan)' : '1px solid var(--border)',
              background: period === p.key ? 'var(--cyan)' : 'transparent',
              color: period === p.key ? '#000' : 'var(--text-muted)',
              cursor: 'pointer',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* KPI tiles */}
      <div className="kpi-bar" style={{ display: 'flex', overflowX: 'auto' }}>

        {/* 1. Total AUM */}
        <KPI
          label="TOTAL AUM"
          value={L ? '…' : fmt$(d?.total_value, 0)}
          color="var(--text-primary)"
          borderColor="var(--cyan)"
          infoKey="totalAum" role={role}
        >
          <SubRow label="Cost basis" value={L ? '…' : fmt$(d?.cost_basis, 0)} />
          <SubRow label="As of" value={L ? '…' : (d?.as_of_date ? new Date(d.as_of_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—')} />
          {!L && <AumSparkline series={d?.value_series} />}
        </KPI>

        {/* 2. Investment Gain — period-sensitive */}
        <KPI
          label={`INVESTMENT GAIN · ${periodLabel.toUpperCase()}`}
          value={L ? '…' : (gain != null ? `${gainPositive ? '+' : ''}${fmt$(gain, 0)}` : '—')}
          color={gainPositive ? 'var(--green)' : 'var(--red)'}
          borderColor={gainPositive ? 'var(--green)' : 'var(--red)'}
          infoKey="netGain" role={role}
        >
          <SubRow
            label={`Net IRR ${periodLabel}`}
            value={L ? '…' : (irr != null ? `${irr >= 0 ? '+' : ''}${irr.toFixed(2)}%` : '—')}
            valueColor="var(--text-secondary)"
          />
          {period === 'ITD' && (
            <SubRow label="Cost basis" value={L ? '…' : fmt$(d?.cost_basis, 0)} valueColor="var(--text-secondary)" />
          )}
        </KPI>

        {/* 3. IRR — period-sensitive */}
        <KPI
          label={`NET IRR · ${periodLabel.toUpperCase()}`}
          value={L ? '…' : (irr != null ? `${irr >= 0 ? '+' : ''}${irr.toFixed(2)}%` : '—')}
          color={irr == null || irr >= 0 ? 'var(--green)' : 'var(--red)'}
          borderColor={irr == null || irr >= 0 ? 'var(--green)' : 'var(--red)'}
          infoKey="irr1y" role={role}
        >
          <SubRow
            label={`Gain ${periodLabel}`}
            value={L ? '…' : (gain != null ? `${gainPositive ? '+' : ''}${fmt$(gain, 0)}` : '—')}
            valueColor="var(--text-secondary)"
          />
          {period !== 'MTD' && <SubRow label="MTD" value={L ? '…' : `${d?.net_irr_mtd?.toFixed(2)}%`} valueColor="var(--text-secondary)" />}
          {period !== 'QTD' && period !== 'MTD' && <SubRow label="QTD" value={L ? '…' : `${d?.net_irr_qtd?.toFixed(2)}%`} valueColor="var(--text-secondary)" />}
        </KPI>

        {/* 4. Equity Sleeve — period-sensitive */}
        <KPI
          label={`EQUITY SLEEVE · ${periodLabel.toUpperCase()}`}
          value={L ? '…' : fmtRet(eqRet)}
          color={eqRet == null ? 'var(--text-muted)' : eqRet >= 0 ? 'var(--cyan)' : 'var(--red)'}
          borderColor="var(--cyan)"
          infoKey="equitySleeve" role={role}
        >
          <SubRow label="Market value" value={L ? '…' : fmt$(d?.equity_value, 0)} valueColor="var(--text-secondary)" />
          <SubRow
            label={`Gain ${periodLabel}`}
            value={L ? '…' : fmtGain(eqGain)}
            valueColor={eqGain == null ? 'var(--text-muted)' : eqGain >= 0 ? 'var(--green)' : 'var(--red)'}
          />
          {period !== 'ITD' && (
            <SubRow label="Return ITD" value={L ? '…' : `+${d?.equity_return_pct?.toFixed(1)}%`} valueColor="var(--text-muted)" />
          )}
          {(period === 'MTD' || period === 'QTD') && (
            <SubRow label="" value="Per-sleeve MTD/QTD not available" valueColor="var(--text-muted)" />
          )}
        </KPI>

        {/* 5. Alternatives Sleeve — period-sensitive */}
        <KPI
          label={`ALTERNATIVES · ${periodLabel.toUpperCase()}`}
          value={L ? '…' : fmtRet(altRet)}
          color={altRet == null ? 'var(--text-muted)' : altRet >= 0 ? 'var(--amber)' : 'var(--red)'}
          borderColor="var(--amber)"
          infoKey="altsSleeve" role={role}
        >
          <SubRow label="Market value" value={L ? '…' : fmt$(d?.alternatives_value, 0)} valueColor="var(--text-secondary)" />
          <SubRow
            label={`Gain ${periodLabel}`}
            value={L ? '…' : fmtGain(altGain)}
            valueColor={altGain == null ? 'var(--text-muted)' : altGain >= 0 ? 'var(--green)' : 'var(--red)'}
          />
          {period !== 'ITD' && (
            <SubRow label="Return ITD" value={L ? '…' : `+${d?.alternatives_return_pct?.toFixed(1)}%`} valueColor="var(--text-muted)" />
          )}
          {(period === 'MTD' || period === 'QTD') && (
            <SubRow label="" value="Per-sleeve MTD/QTD not available" valueColor="var(--text-muted)" />
          )}
        </KPI>

        {/* 6. Fees — advisor fees are period-sensitive; sub-mgr drag is ITD */}
        {(() => {
          const advisorFeeMap = {
            MTD: d?.advisor_fees_mtd, QTD: d?.advisor_fees_qtd,
            YTD: d?.advisor_fees_ytd, '1Y': d?.advisor_fees_1y, ITD: d?.advisor_fees_itd,
          }
          const advisorFee = advisorFeeMap[period] ?? 0
          const subMgr = d?.sub_manager_fees ?? 0
          const total = advisorFee + (period === 'ITD' ? subMgr : 0)
          return (
            <KPI
              label={`FEES & COST DRAG · ${periodLabel.toUpperCase()}`}
              value={L ? '…' : fmt$(advisorFee, 0)}
              color="var(--red)"
              borderColor="var(--red)"
              infoKey="feeDrag" role={role}
            >
              <SubRow
                label={`Advisor fees ${periodLabel}`}
                value={L ? '…' : fmt$(advisorFee, 0)}
                valueColor="var(--amber)"
              />
              <SubRow
                label="Sub-mgr drag (ITD)"
                value={L ? '…' : fmt$(subMgr, 0)}
                valueColor="var(--red)"
              />
              {period === 'ITD' && !L && <FeeBar advisorFees={d?.total_fees} subMgrFees={subMgr} />}
            </KPI>
          )
        })()}

      </div>
    </div>
  )
}
