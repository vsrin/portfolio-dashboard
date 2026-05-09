import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts'
import { useApi } from '../hooks/useApi'
import { fmt$, fmtShortDate } from '../utils/formatters'
import InfoButton from './InfoButton'

// ── Educational content for the info drawer ───────────────────────────────────
const SHARPE_EDU = `**What Is the Sharpe Ratio?**

The Sharpe Ratio is the single most widely used measure of risk-adjusted performance in professional investing. It answers one essential question: how much net return did you earn for every unit of risk you accepted?

**The Formula**
Sharpe = (Portfolio Return − Risk-Free Rate) ÷ Annualised Volatility

The risk-free rate is the return you could have earned with zero risk — typically approximated by short-term US Treasuries or the Fed Funds rate (~5% during your 22-month holding period). Volatility is the annualised standard deviation of your monthly returns.

**How to Interpret the Number**
• Below 0.5 — Weak. You are not being adequately compensated for the volatility you are absorbing. Common causes: high fees, concentrated bets, or an unfavourable measurement period.
• 0.5 to 1.0 — Acceptable. A professionally managed, diversified portfolio typically lands here. Passive 60/40 portfolios score ~0.6–0.8 with minimal fees.
• 1.0 to 2.0 — Strong. You are generating well-rewarded risk. Institutional allocators target this range.
• Above 2.0 — Exceptional. Rare outside very short windows or highly concentrated strategies that happened to work.

**Why Fees Destroy the Sharpe Ratio**
Every percentage point of fees reduces your net return directly while volatility stays unchanged. A portfolio running 3% all-in fees could have a gross Sharpe of 0.8 and a net Sharpe of 0.44 — not because the managers are bad, but because the fee load is heavy. This is why professional managers are always evaluated on **gross alpha vs their benchmark**, not on net Sharpe vs a zero-cost index.

**What Is Volatility?**
Annualised volatility is calculated as the standard deviation of your monthly returns multiplied by the square root of 12. It measures how much your portfolio fluctuates around its average return. A pure S&P 500 portfolio typically runs 15–20% annualised volatility. A 60/40 blend runs 10–12%. An alternatives-heavy portfolio like yours — with PE, private credit, and hedge funds absorbing market shocks — should run lower than a pure equity book, all else equal.

**What Is Max Drawdown?**
Max drawdown is the worst peak-to-trough decline experienced during the measurement period, expressed as a percentage. A −14.4% max drawdown means that at its lowest point, your portfolio had lost 14.4% of its prior peak value. This is not the same as your total return — it measures the worst-case timing a specific investor would have experienced if they entered at the peak and measured at the trough.

**Max Drawdown in Context**
The April 2025 tariff shock caused a broad risk-asset sell-off. The S&P 500 fell approximately 18–20% from its February 2025 high. Your portfolio, with 38% in public equities, 57% in alternatives (many of which report quarterly and don't show intra-quarter declines), experienced a smoothed version of that shock. A −14.4% drawdown on a portfolio with significant illiquid alternatives is broadly expected — the dampening is evidence the alternatives sleeve is working.

**The Honest Caveat**
The volatility and max drawdown figures displayed here are derived from estimated monthly portfolio snapshots, not confirmed AllSource/Tamarac statements. The directional story is reliable — the precise numbers should be treated as directionally accurate approximations until actual monthly statements are loaded.`

// ── Shared tooltip ────────────────────────────────────────────────────────────
const ChartTip = ({ active, payload, label, fmtVal }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border-light)',
      borderRadius: 6, padding: '10px 14px', fontSize: 12,
    }}>
      <div style={{ color: 'var(--text-muted)', fontSize: 10, marginBottom: 6 }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, color: p.color }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>{p.name}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
            {fmtVal ? fmtVal(p.value) : p.value}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ title, subtitle, children, action }) {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-label)' }}>{title}</div>
          {subtitle && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{subtitle}</div>}
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

// ── Metric tile ───────────────────────────────────────────────────────────────
function MetricTile({ label, value, sub, color, borderColor, note }) {
  return (
    <div style={{
      padding: '14px 18px',
      background: 'var(--bg-input)',
      borderRadius: 8,
      borderTop: `2px solid ${borderColor || color || 'var(--border)'}`,
    }}>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 800, color: color || 'var(--text-primary)', lineHeight: 1 }}>{value}</div>
      {sub  && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }}>{sub}</div>}
      {note && <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 4, opacity: 0.7, fontStyle: 'italic' }}>{note}</div>}
    </div>
  )
}

// ── Gap 1: Risk Metrics ───────────────────────────────────────────────────────
function RiskMetrics({ rm }) {
  const sharpeColor = rm.sharpe_ratio >= 1.0 ? 'var(--green)' : rm.sharpe_ratio >= 0.5 ? 'var(--amber)' : 'var(--red)'
  const ddColor     = Math.abs(rm.max_drawdown_pct) <= 10 ? 'var(--green)' : Math.abs(rm.max_drawdown_pct) <= 20 ? 'var(--amber)' : 'var(--red)'

  return (
    <Section
      title="Gap 1 — Risk-Adjusted Returns"
      subtitle="How much risk was taken to generate the returns? Without this, alpha claims are incomplete."
    >
      <div className="grid-4-col" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <MetricTile
          label="Annualised Return"
          value={`+${rm.annualized_return_pct}%`}
          sub={`${rm.annualized_return_pct > rm.risk_free_rate_pct ? '▲' : '▼'} ${Math.abs(rm.annualized_return_pct - rm.risk_free_rate_pct).toFixed(2)}% above risk-free`}
          color="var(--cyan)"
        />
        <MetricTile
          label="Sharpe Ratio"
          value={rm.sharpe_ratio.toFixed(2)}
          sub={rm.sharpe_ratio >= 1.0 ? 'Excellent (>1.0)' : rm.sharpe_ratio >= 0.5 ? 'Acceptable (0.5–1.0)' : 'Weak (<0.5) — fee drag'}
          color={sharpeColor}
          note="(Return − Risk-Free) ÷ Volatility"
        />
        <MetricTile
          label="Annualised Volatility"
          value={`${rm.volatility_pct}%`}
          sub={`vs ~${(rm.volatility_pct * 2.5).toFixed(0)}% pure S&P 500`}
          color="var(--text-secondary)"
          note="Std dev of monthly returns × √12"
        />
        <MetricTile
          label="Max Drawdown"
          value={`${rm.max_drawdown_pct}%`}
          sub={`${rm.max_drawdown_start} peak → ${rm.max_drawdown_trough} trough`}
          color={ddColor}
          note="Worst peak-to-trough decline ITD"
        />
      </div>

      {/* ── Advisor Interpretation block ─────────────────────────────────── */}
      <div style={{
        borderRadius: 8,
        border: '1px solid var(--border-light)',
        borderLeft: `4px solid ${rm.sharpe_ratio >= 0.5 ? 'var(--cyan)' : 'var(--amber)'}`,
        background: 'var(--bg-surface)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 16px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-input)',
        }}>
          <span style={{
            fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase',
            color: rm.sharpe_ratio >= 0.5 ? 'var(--cyan)' : 'var(--amber)',
          }}>
            Advisor Interpretation
          </span>
          <InfoButton
            title="Understanding Your Risk Metrics"
            content={SHARPE_EDU}
          />
          <span style={{ marginLeft: 'auto', fontSize: 9, color: 'var(--text-muted)', fontStyle: 'italic' }}>
            Recalculates on every data refresh
          </span>
        </div>

        {/* Body */}
        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.7, fontWeight: 500 }}>
            A Sharpe of <strong style={{ fontFamily: 'var(--font-mono)', color: rm.sharpe_ratio >= 0.5 ? 'var(--cyan)' : 'var(--amber)' }}>{rm.sharpe_ratio.toFixed(2)}</strong> means
            you earned {rm.sharpe_ratio.toFixed(2)} units of return per unit of risk —
            {rm.sharpe_ratio >= 1.0
              ? <> <strong>strong</strong>, outperforming the typical 0.6–0.8 range for a passive 60/40. This portfolio is generating well-compensated risk.</>
              : rm.sharpe_ratio >= 0.5
              ? <> <strong>acceptable</strong> for an alternatives-heavy portfolio absorbing ~3% in all-in annual fees. A pure passive 60/40 typically scores 0.6–0.8 with near-zero costs — fee drag is the gap.</>
              : <> <strong>below the passive baseline</strong>. Fee drag (~3% all-in annually) is the primary culprit. Gross return before fees would score materially higher — evaluate managers on gross alpha, not net Sharpe alone.</>
            }
          </p>

          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.7, fontWeight: 500 }}>
            Volatility at <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{rm.volatility_pct}%</strong> annualised
            is <strong>{rm.volatility_pct < 12 ? 'well below' : 'broadly in line with'}</strong> a comparable passive blend —
            alternatives are doing their job as portfolio dampeners. The max drawdown of <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--red)' }}>{rm.max_drawdown_pct}%</strong> occurred
            during the April 2025 tariff shock and is consistent with a {Math.round(38)}% equity allocation absorbing a broad market correction.
          </p>
        </div>

        {/* Disclaimer footer */}
        <div style={{
          padding: '8px 16px',
          borderTop: '1px solid var(--border)',
          background: 'var(--bg-input)',
          fontSize: 10, color: 'var(--text-muted)', fontStyle: 'italic',
        }}>
          ⚠ {rm.data_note}
        </div>
      </div>
    </Section>
  )
}

// ── Gap 2: Equity Curve ───────────────────────────────────────────────────────
function EquityCurve({ curve, rm }) {
  const peak = Math.max(...curve.map(p => p.value))
  const ddStart = rm.max_drawdown_start
  const ddEnd   = rm.max_drawdown_trough

  // Mark the drawdown period in the data
  const data = curve.map(p => ({
    ...p,
    drawdown: (p.month >= ddStart && p.month <= ddEnd) ? p.value : null,
  }))

  return (
    <Section
      title="Gap 2 — Portfolio Value Over Time"
      subtitle="The equity curve — how the actual market value moved, not just cash flows in and out."
    >
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="curveGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="var(--cyan)" stopOpacity={0.15} />
              <stop offset="95%" stopColor="var(--cyan)" stopOpacity={0.01} />
            </linearGradient>
            <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="var(--red)" stopOpacity={0.25} />
              <stop offset="95%" stopColor="var(--red)" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="month" tickFormatter={v => fmtShortDate(v + '-01')} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={v => `$${(v / 1_000_000).toFixed(1)}M`} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} width={52} />
          <Tooltip content={<ChartTip fmtVal={v => fmt$(v, 0)} />} />
          <Area type="monotone" dataKey="value"    name="Portfolio Value" stroke="var(--cyan)" fill="url(#curveGrad)" strokeWidth={2} dot={false} />
          <Area type="monotone" dataKey="drawdown" name="Drawdown Period" stroke="var(--red)" fill="url(#ddGrad)" strokeWidth={1.5} dot={false} strokeDasharray="3 2" />
        </AreaChart>
      </ResponsiveContainer>

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'Peak Value',     val: fmt$(peak, 0),     color: 'var(--cyan)' },
          { label: 'Max Drawdown',   val: `${rm.max_drawdown_pct}%`, color: 'var(--red)' },
          { label: 'Current Value',  val: fmt$(curve[curve.length - 1].value, 0), color: 'var(--green)' },
          { label: 'Total Gain',     val: fmt$(curve[curve.length - 1].value - curve[0].value, 0), color: 'var(--green)' },
        ].map(({ label, val, color }) => (
          <div key={label} style={{ flex: 1, minWidth: 100 }}>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color }}>{val}</div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 10, color: 'var(--text-muted)', fontStyle: 'italic', opacity: 0.7 }}>
        Values are estimated monthly snapshots. Red segment = April 2025 tariff-shock drawdown period. Update PORTFOLIO_VALUE_SERIES in backend for exact curve.
      </div>
    </Section>
  )
}

// ── Gap 3: Liquidity Profile ──────────────────────────────────────────────────
function LiquidityProfile({ liq }) {
  const COLORS = { liquid: 'var(--green)', semi_liquid: 'var(--amber)', illiquid: 'var(--red)' }

  return (
    <Section
      title="Gap 3 — Liquidity Profile"
      subtitle={`Of $${(liq.liquid_30d / 1_000_000).toFixed(2)}M you could access in 30 days. $${(liq.locked / 1_000_000).toFixed(2)}M is locked in private markets.`}
    >
      {/* Stacked bar */}
      <div>
        <div style={{ display: 'flex', height: 28, borderRadius: 6, overflow: 'hidden', gap: 2 }}>
          {liq.tiers.map(t => (
            <div
              key={t.tier}
              style={{ width: `${t.pct}%`, background: COLORS[t.tier], opacity: 0.85, position: 'relative', minWidth: t.pct > 5 ? 'auto' : 0 }}
              title={`${t.label}: ${fmt$(t.value, 0)} (${t.pct}%)`}
            />
          ))}
        </div>
        <div style={{ display: 'flex', gap: 20, marginTop: 10, flexWrap: 'wrap' }}>
          {liq.tiers.map(t => (
            <div key={t.tier} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: COLORS[t.tier], opacity: 0.85 }} />
              <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{t.label}</span>
              <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{t.pct}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tier breakdown */}
      <div className="grid-3-col" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {liq.tiers.map(t => (
          <div key={t.tier} style={{
            padding: '12px 16px', borderRadius: 8,
            border: `1px solid ${COLORS[t.tier]}33`,
            background: `${COLORS[t.tier]}08`,
          }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: COLORS[t.tier], letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 8 }}>{t.label}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 800, color: COLORS[t.tier], marginBottom: 4 }}>{fmt$(t.value, 0)}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8 }}>{t.pct}% of AUM</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.5 }}>{t.description}</div>
            <div style={{ marginTop: 8, fontSize: 9, color: 'var(--text-muted)' }}>
              {t.assets.slice(0, 4).join(' · ')}{t.assets.length > 4 ? ` +${t.assets.length - 4} more` : ''}
            </div>
          </div>
        ))}
      </div>

      <div style={{
        padding: '10px 14px', borderRadius: 6,
        background: liq.locked_pct > 40 ? 'rgba(255,69,96,0.06)' : 'rgba(255,179,0,0.06)',
        border: `1px solid ${liq.locked_pct > 40 ? 'rgba(255,69,96,0.2)' : 'rgba(255,179,0,0.2)'}`,
        fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6,
      }}>
        <strong style={{ color: liq.locked_pct > 40 ? 'var(--red)' : 'var(--amber)' }}>At age 52 with 13 years to retirement: </strong>
        {fmt$(liq.locked, 0)} ({liq.locked_pct}% of net worth) is locked in PE, VC, and Private Credit with no redemption option.
        You can access {fmt$(liq.liquid_30d, 0)} within 30 days and {fmt$(liq.liquid_90d, 0)} within 90 days.
        Ensure adequate emergency reserves outside this portfolio — the illiquid sleeve cannot be tapped in a crisis.
      </div>
    </Section>
  )
}

// ── Gap 4: Retirement Projection ──────────────────────────────────────────────
function RetirementProjection({ ret }) {
  const COLORS = { conservative: 'var(--amber)', moderate: 'var(--cyan)', current: 'var(--green)' }

  return (
    <Section
      title="Gap 4 — Retirement Projection"
      subtitle={`Age ${ret.current_age} today · retiring at ${ret.retirement_age} · ${ret.years_to_retirement} years to go · $5M target (4% rule → ~$200K/yr)`}
      action={
        <div style={{
          padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)',
          background: ret.on_track ? 'rgba(0,230,118,0.12)' : 'rgba(255,82,82,0.12)',
          color: ret.on_track ? 'var(--green)' : 'var(--red)',
          border: `1px solid ${ret.on_track ? 'rgba(0,230,118,0.3)' : 'rgba(255,82,82,0.3)'}`,
          whiteSpace: 'nowrap',
        }}>
          {ret.on_track ? '✓ ON TRACK' : '✗ BELOW TARGET'}
        </div>
      }
    >
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={ret.projection_series} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="year" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={v => `$${(v / 1_000_000).toFixed(0)}M`} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} width={44} />
          <Tooltip content={<ChartTip fmtVal={v => fmt$(v, 0)} />} />
          <ReferenceLine y={ret.target_portfolio} stroke="var(--text-muted)" strokeDasharray="6 3" strokeWidth={1} label={{ value: '$5M target', position: 'insideTopRight', fontSize: 9, fill: 'var(--text-muted)' }} />
          {ret.scenarios.map(s => (
            <Line key={s.id} type="monotone" dataKey={s.id} name={s.label}
              stroke={COLORS[s.id] || 'var(--text-muted)'} strokeWidth={s.id === 'current' ? 2.5 : 1.5}
              dot={false} strokeDasharray={s.id === 'conservative' ? '4 2' : undefined} />
          ))}
          <Legend wrapperStyle={{ fontSize: 10, color: 'var(--text-secondary)', paddingTop: 8 }} />
        </LineChart>
      </ResponsiveContainer>

      <div className="grid-3-col" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {ret.scenarios.map(s => (
          <div key={s.id} style={{ padding: '10px 14px', background: 'var(--bg-input)', borderRadius: 8, borderLeft: `3px solid ${COLORS[s.id]}` }}>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: 6 }}>{s.label.toUpperCase()}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 17, fontWeight: 800, color: COLORS[s.id] }}>{fmt$(s.projected_value, 0)}</div>
            <div style={{ fontSize: 10, color: s.reaches_target ? 'var(--green)' : 'var(--red)', marginTop: 4, fontWeight: 600 }}>
              {s.reaches_target ? `✓ Exceeds $5M by ${fmt$(s.projected_value - ret.target_portfolio, 0)}` : `✗ Misses by ${fmt$(ret.target_portfolio - s.projected_value, 0)}`}
            </div>
          </div>
        ))}
      </div>

      <div style={{
        padding: '10px 14px', borderRadius: 6,
        background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.2)',
        fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6,
      }}>
        <strong style={{ color: 'var(--cyan)' }}>Required rate to reach $5M: {ret.required_return_pct}% annualised. </strong>
        Your current annualised pace is {ret.annualized_return_pct}% —
        {ret.on_track
          ? ` ${(ret.annualized_return_pct - ret.required_return_pct).toFixed(2)}% above the required hurdle. Even a conservative 6% scenario barely clears $5M.`
          : ` below the ${ret.required_return_pct}% hurdle. A sustained return improvement is needed.`}
        {' '}Note: this projection assumes no additional contributions. Ongoing savings would reduce the required return materially.
      </div>
    </Section>
  )
}

// ── Gap 5: Concentration Risk ─────────────────────────────────────────────────
function ConcentrationRisk({ con }) {
  const total = con.super_category_concentration.reduce((s, c) => s + c.value, 0)

  return (
    <Section
      title="Gap 5 — Concentration Risk"
      subtitle="Positions or sleeves that exceed prudent sizing thresholds."
    >
      {/* Warnings */}
      {con.warnings.length === 0 ? (
        <div style={{ padding: '12px 16px', background: 'rgba(0,230,118,0.07)', border: '1px solid rgba(0,230,118,0.2)', borderRadius: 6, fontSize: 11, color: 'var(--green)' }}>
          ✓ No single position exceeds 15% of portfolio
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {con.warnings.map(w => (
            <div key={w.id} style={{
              padding: '12px 16px', borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16,
              background: w.severity === 'high' ? 'rgba(255,69,96,0.07)' : 'rgba(255,179,0,0.07)',
              border: `1px solid ${w.severity === 'high' ? 'rgba(255,69,96,0.25)' : 'rgba(255,179,0,0.25)'}`,
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{w.label}</span>
                  <span style={{
                    fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 3,
                    background: w.severity === 'high' ? 'rgba(255,69,96,0.15)' : 'rgba(255,179,0,0.15)',
                    color: w.severity === 'high' ? 'var(--red)' : 'var(--amber)',
                    letterSpacing: '0.06em',
                  }}>
                    {w.severity.toUpperCase()} CONCENTRATION
                  </span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{w.note}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 800, color: w.severity === 'high' ? 'var(--red)' : 'var(--amber)' }}>{w.pct}%</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{fmt$(w.value, 0)}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sleeve concentration */}
      <div>
        <div style={{ fontSize: 10, color: 'var(--text-label)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 10 }}>Sleeve-Level Concentration</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {con.super_category_concentration.filter(c => c.value > 0).map(c => {
            const barW = Math.min(c.pct, 100)
            const overThreshold = c.is_over
            const barColor = overThreshold ? 'var(--red)' : c.pct > c.threshold_pct * 0.75 ? 'var(--amber)' : 'var(--green)'
            return (
              <div key={c.category}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{c.category}</span>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: overThreshold ? 'var(--red)' : 'var(--text-muted)' }}>{c.pct}%</span>
                    {overThreshold && <span style={{ fontSize: 9, color: 'var(--red)', fontWeight: 700 }}>⚠ OVER {c.threshold_pct}% THRESHOLD</span>}
                  </div>
                </div>
                <div style={{ height: 5, background: 'var(--border)', borderRadius: 3 }}>
                  <div style={{ width: `${barW}%`, height: '100%', background: barColor, borderRadius: 3, opacity: 0.8 }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* HHI + advisory */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ padding: '12px 16px', background: 'var(--bg-input)', borderRadius: 8, minWidth: 140 }}>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.07em', marginBottom: 6 }}>HERFINDAHL INDEX</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 800, color: con.hhi > 15 ? 'var(--amber)' : 'var(--green)' }}>{con.hhi}</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>{con.hhi > 15 ? 'Moderate concentration' : 'Well diversified'}</div>
        </div>
        <div style={{
          flex: 1, padding: '10px 14px', borderRadius: 6,
          background: 'rgba(255,179,0,0.06)', border: '1px solid rgba(255,179,0,0.2)',
          fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6,
        }}>
          <strong style={{ color: 'var(--amber)' }}>Action: </strong>
          Private Equity at 26.3% is the dominant single-position risk. This is illiquid — you cannot trim it. The concentration will resolve naturally as the fund matures and returns capital (typically years 5–8). In the interim, ask your advisor whether new capital deployments should intentionally diversify away from additional PE to rebalance the sleeve composition.
          <br /><div style={{ marginTop: 6, fontSize: 10 }}>{con.diversification_note}</div>
        </div>
      </div>
    </Section>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function RiskPanel() {
  const { data, loading } = useApi('/risk')

  if (loading) return (
    <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>Loading risk analysis…</div>
  )
  if (!data) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Header banner */}
      <div style={{
        padding: '14px 20px', borderRadius: 8,
        background: 'linear-gradient(135deg, rgba(0,212,255,0.06), rgba(124,58,237,0.06))',
        border: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Risk &amp; Planning Analysis</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
            Five dimensions your performance report doesn't show — required for complete portfolio assessment.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {[
            { label: 'Sharpe Ratio', val: data.risk_metrics.sharpe_ratio.toFixed(2), color: data.risk_metrics.sharpe_ratio >= 0.5 ? 'var(--amber)' : 'var(--red)' },
            { label: 'Max Drawdown', val: `${data.risk_metrics.max_drawdown_pct}%`, color: 'var(--red)' },
            { label: 'Illiquid AUM', val: `${data.liquidity.locked_pct}%`, color: 'var(--amber)' },
            { label: 'Retirement', val: data.retirement.on_track ? 'On Track' : 'At Risk', color: data.retirement.on_track ? 'var(--green)' : 'var(--red)' },
          ].map(({ label, val, color }) => (
            <div key={label} style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>{label}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color }}>{val}</div>
            </div>
          ))}
        </div>
      </div>

      <RiskMetrics    rm={data.risk_metrics} />
      <EquityCurve    curve={data.equity_curve} rm={data.risk_metrics} />
      <LiquidityProfile liq={data.liquidity} />
      <RetirementProjection ret={data.retirement} />
      <ConcentrationRisk    con={data.concentration} />

    </div>
  )
}
