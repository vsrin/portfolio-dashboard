import { useState } from 'react'
import { useApi } from '../hooks/useApi'
import { fmt$ } from '../utils/formatters'
import InfoButton from './InfoButton'
import { WIDGET_INFO } from '../data/widgetInfo'

const PERIODS = [
  { key: 'MTD', label: 'MTD' },
  { key: 'QTD', label: 'QTD' },
  { key: 'YTD', label: 'YTD' },
  { key: '1Y',  label: '1 Year' },
  { key: 'ITD', label: 'Inception' },
]

function KPI({ label, value, color, borderColor, infoKey, children }) {
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
        {infoKey && WIDGET_INFO[infoKey] && (
          <InfoButton title={WIDGET_INFO[infoKey].title} content={WIDGET_INFO[infoKey].content} />
        )}
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

export default function KPIBar() {
  const { data: d, loading: L } = useApi('/summary')
  const [period, setPeriod] = useState('MTD')

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
            onClick={() => setPeriod(p.key)}
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
          infoKey="totalAum"
        >
          <SubRow label="Cost basis" value={L ? '…' : fmt$(d?.cost_basis, 0)} />
          <SubRow label="As of" value={L ? '…' : (d?.as_of_date ? new Date(d.as_of_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—')} />
        </KPI>

        {/* 2. Investment Gain — period-sensitive */}
        <KPI
          label={`INVESTMENT GAIN · ${periodLabel.toUpperCase()}`}
          value={L ? '…' : (gain != null ? `${gainPositive ? '+' : ''}${fmt$(gain, 0)}` : '—')}
          color={gainPositive ? 'var(--green)' : 'var(--red)'}
          borderColor={gainPositive ? 'var(--green)' : 'var(--red)'}
          infoKey="netGain"
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
          infoKey="irr1y"
        >
          <SubRow
            label={`Gain ${periodLabel}`}
            value={L ? '…' : (gain != null ? `${gainPositive ? '+' : ''}${fmt$(gain, 0)}` : '—')}
            valueColor="var(--text-secondary)"
          />
          {period !== 'MTD' && <SubRow label="MTD" value={L ? '…' : `${d?.net_irr_mtd?.toFixed(2)}%`} valueColor="var(--text-secondary)" />}
          {period !== 'QTD' && period !== 'MTD' && <SubRow label="QTD" value={L ? '…' : `${d?.net_irr_qtd?.toFixed(2)}%`} valueColor="var(--text-secondary)" />}
        </KPI>

        {/* 4. Equity Sleeve */}
        <KPI
          label="EQUITY SLEEVE"
          value={L ? '…' : `+${d?.equity_return_pct?.toFixed(1)}%`}
          color="var(--cyan)"
          borderColor="var(--cyan)"
          infoKey="equitySleeve"
        >
          <SubRow label="Market value" value={L ? '…' : fmt$(d?.equity_value, 0)} valueColor="var(--text-secondary)" />
          <SubRow label="Gain ITD" value={L ? '…' : `+${fmt$(d?.equity_gain, 0)}`} valueColor="var(--green)" />
        </KPI>

        {/* 5. Alternatives Sleeve */}
        <KPI
          label="ALTERNATIVES SLEEVE"
          value={L ? '…' : `+${d?.alternatives_return_pct?.toFixed(1)}%`}
          color="var(--amber)"
          borderColor="var(--amber)"
          infoKey="altsSleeve"
        >
          <SubRow label="Market value" value={L ? '…' : fmt$(d?.alternatives_value, 0)} valueColor="var(--text-secondary)" />
          <SubRow label="Gain ITD" value={L ? '…' : `+${fmt$(d?.alternatives_gain, 0)}`} valueColor="var(--green)" />
        </KPI>

        {/* 6. Fees */}
        <KPI
          label="FEES & COST DRAG"
          value={L ? '…' : fmt$(d?.total_fee_impact, 0)}
          color="var(--red)"
          borderColor="var(--red)"
          infoKey="feeDrag"
        >
          <SubRow
            label={`Advisor ~${d?.advisor_fee_rate_pct?.toFixed(2)}% ann.`}
            value={L ? '…' : fmt$(d?.total_fees, 0)}
            valueColor="var(--amber)"
          />
          <SubRow
            label={`Sub-mgr ~${d?.sub_mgr_fee_rate_pct?.toFixed(2)}% ann.`}
            value={L ? '…' : fmt$(d?.sub_manager_fees, 0)}
            valueColor="var(--red)"
          />
          {!L && <FeeBar advisorFees={d?.total_fees} subMgrFees={d?.sub_manager_fees} />}
        </KPI>

      </div>
    </div>
  )
}
