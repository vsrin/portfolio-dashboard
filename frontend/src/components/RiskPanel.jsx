import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts'
import { useApi } from '../hooks/useApi'
import { fmt$, fmtShortDate } from '../utils/formatters'
import InfoButton from './InfoButton'
import NarrativeBlur from './NarrativeBlur'

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
function MetricTile({ label, value, sub, color, borderColor, note, info }) {
  return (
    <div style={{
      padding: '14px 18px',
      background: 'var(--bg-input)',
      borderRadius: 8,
      borderTop: `2px solid ${borderColor || color || 'var(--border)'}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 8 }}>
        {label}
        {info && <InfoButton title={info.title} content={info.content} />}
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 800, color: color || 'var(--text-primary)', lineHeight: 1 }}>{value}</div>
      {sub  && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }}>{sub}</div>}
      {note && <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 4, opacity: 0.7, fontStyle: 'italic' }}>{note}</div>}
    </div>
  )
}

// ── Gap 1: Risk Metrics ───────────────────────────────────────────────────────
function RiskMetrics({ rm, official }) {
  // Use official Tamarac figures when available, fall back to computed estimates
  const itd      = official?.itd || {}
  const bm       = official?.benchmark_itd || {}
  const sharpe   = itd.sharpe    ?? rm.sharpe_ratio
  const sortino  = itd.sortino   ?? null
  const volPct   = itd.std_dev   != null ? (itd.std_dev * 100).toFixed(2) : rm.volatility_pct
  const jAlpha   = itd.jensens_alpha != null ? (itd.jensens_alpha * 100).toFixed(2) : null
  const upCap    = itd.upside_capture   != null ? Math.round(itd.upside_capture * 100)   : null
  const dnCap    = itd.downside_capture != null ? Math.round(itd.downside_capture * 100) : null
  const sp500Vol = bm.sp500_std_dev     != null ? (bm.sp500_std_dev * 100).toFixed(1)   : '16.9'
  const isOfficial = !!official?.itd
  const asOf     = official?.as_of || ''

  const sharpeColor = sharpe >= 1.0 ? 'var(--green)' : sharpe >= 0.5 ? 'var(--amber)' : 'var(--red)'
  const sharpeLabel = sharpe >= 1.0 ? 'Strong (>1.0)' : sharpe >= 0.8 ? 'Good (>0.8)' : sharpe >= 0.5 ? 'Acceptable (0.5–1.0)' : 'Weak (<0.5)'
  const ddColor     = Math.abs(rm.max_drawdown_pct) <= 10 ? 'var(--green)' : Math.abs(rm.max_drawdown_pct) <= 20 ? 'var(--amber)' : 'var(--red)'

  const annReturn = itd.net_return_ann != null ? (itd.net_return_ann * 100).toFixed(2) : rm.annualized_return_pct
  const rfRate = 5.0
  const excessReturn = (parseFloat(annReturn) - rfRate).toFixed(2)

  const infoAnnReturn = {
    title: 'Annualised Return — How It\'s Calculated',
    content: `**Formula:** (End Value ÷ Begin Value)^(12 ÷ Months) − 1

**Your numbers (inception to date):**
- Portfolio start: Jul 10, 2024 (~22 months)
- Annualised return: **+${annReturn}%**

This is a **compound annual growth rate (CAGR)** — it answers: if the portfolio grew at a constant rate every year, what would that rate be?

**vs S&P 500:** The S&P 500 returned ~+16% annualised over the same ITD window (a strong bull market period). Your portfolio ran at ${annReturn}% with 57% in alternatives that dampen both upside and downside — a different risk profile, not a direct comparison.

Source: ${isOfficial ? 'AllSource / Tamarac Account Analytics' : 'Estimated from monthly portfolio value series'}`
  }

  const infoSharpe = {
    title: 'Sharpe Ratio — The Math Behind It',
    content: `**Formula:** (Portfolio Return − Risk-Free Rate) ÷ Annualised Volatility

**Your numbers plugged in (ITD):**
- Portfolio annualised return: **+${annReturn}%**
- Risk-free rate (US T-bills, ~22-month avg): **~${rfRate}%**
- Excess return: ${annReturn}% − ${rfRate}% = **+${excessReturn}%**
- Annualised volatility: **${volPct}%**

**The arithmetic:** ${excessReturn} ÷ ${volPct} = **${sharpe.toFixed(2)}**

For every 1% of annualised volatility you absorbed, you earned ${sharpe.toFixed(2)} units of return above the risk-free rate.

**Interpreting ${sharpe.toFixed(2)}:** ${sharpeLabel}. A pure passive 60/40 portfolio typically scores 0.6–0.8 with near-zero fees. The ~3% all-in annual fee load on this portfolio directly compresses the numerator — if fees were 1%, the Sharpe would be approximately ${((parseFloat(excessReturn) + 2) / parseFloat(volPct)).toFixed(2)}.

Source: ${isOfficial ? 'AllSource / Tamarac Account Analytics' : 'Estimated — update PORTFOLIO_VALUE_SERIES for official figures'}`
  }

  const infoSortino = {
    title: 'Sortino Ratio — Downside-Only Risk',
    content: `**Formula:** (Portfolio Return − Risk-Free Rate) ÷ Downside Deviation

**Difference from Sharpe:** Sortino only counts months when the portfolio *fell* in the denominator. Upward volatility is not treated as "bad" risk.

**Your numbers (ITD):**
- Same numerator as Sharpe: excess return of **+${excessReturn}%**
- Downside deviation is smaller than full volatility (${volPct}%) because positive months are excluded from the std dev calculation
- Result: **${sortino != null ? sortino.toFixed(2) : 'n/a'}**

**A Sortino higher than Sharpe means** your gains were asymmetric — more consistent upward moves with fewer large losing months. If Sortino < Sharpe, the opposite is true (gains are lumpy, losses are frequent).

Source: ${isOfficial ? 'AllSource / Tamarac' : 'Not yet available — requires full monthly return series from AllSource'}`
  }

  const infoDD = {
    title: 'Max Drawdown — Worst Peak-to-Trough Decline',
    content: `**Formula:** (Trough Value − Peak Value) ÷ Peak Value

**Your drawdown (ITD):**
- Drawdown period: **${rm.max_drawdown_start} → ${rm.max_drawdown_trough}**
- Peak-to-trough decline: **${rm.max_drawdown_pct}%**

This is the single worst timing an investor would have experienced if they measured from the portfolio's high-water mark to its lowest point during that decline.

**April 2025 tariff shock context:** The S&P 500 fell approximately 18–20% from its February 2025 high during the same event. Your portfolio's ${rm.max_drawdown_pct}% drawdown on a 38% public equity / 57% alternatives mix reflects the dampening effect of illiquid assets — PE, VC, and private credit funds do not reprice intra-quarter, so they don't "show" the full mark-to-market loss in real time.

**Max drawdown ≠ total loss.** It measures the worst-case entry/exit timing, not your actual experience. Your portfolio recovered after April 2025.

Source: ${isOfficial ? 'AllSource / Tamarac' : 'Estimated from monthly portfolio value snapshots'}`
  }

  const infoVol = {
    title: 'Annualised Volatility — How It\'s Computed',
    content: `**Formula:** Standard Deviation of monthly returns × √12

Monthly returns are computed from the portfolio value series (Jul 2024 → present, ~22 data points). The standard deviation of those monthly return percentages, multiplied by √12 (≈3.46), converts monthly dispersion to an annual figure.

**Your result: ${volPct}%** vs S&P 500 ~${sp500Vol}%

**Why so much lower than the S&P 500?**
- 57% of the portfolio is in alternatives (PE, VC, private credit, hedge funds)
- These vehicles report NAV quarterly — they do not mark to market daily or monthly
- Smoothed reporting suppresses apparent volatility by 2–4 points vs true economic volatility
- The remaining 38% in public equities does track daily market movements

**Important caveat:** Reported volatility of ${volPct}% likely understates true economic risk. If alternatives marked daily, you would see a higher number. The S&P 500's ~${sp500Vol}% is a fair comparison only for the public equity sleeve.

Source: ${isOfficial ? 'AllSource / Tamarac Account Analytics' : 'Estimated from monthly portfolio snapshots'}`
  }

  const infoUpCap = {
    title: 'Upside Capture Ratio — How It\'s Computed',
    content: `**Formula:** Portfolio cumulative return in S&P 500 up-months ÷ S&P 500 cumulative return in those same months × 100

**Your result: ${upCap != null ? upCap + '%' : 'not yet available'}**

This means: for every 10% the S&P 500 gained in its positive months, your portfolio captured ~${upCap != null ? (upCap / 10).toFixed(1) : '?'} percentage points of that gain.

**Why so low?** The 57% alternatives sleeve does not follow equity market movements month-to-month. When the S&P 500 has a strong month, PE and private credit funds do not reprice to reflect that — they report quarterly. So in any given "up month" for equities, only the 38% public equity portion participates.

**This is intentional, not a failure** — but it creates a structural asymmetry: the alternatives dampen both upswings and downswings. The goal over time is for the alternatives sleeve to generate its own returns (PE exits, private credit distributions) that are uncorrelated with public equity market timing.

Source: ${isOfficial ? 'AllSource / Tamarac' : 'Estimated — requires full monthly return series'}`
  }

  const infoDnCap = {
    title: 'Downside Capture Ratio — How It\'s Computed',
    content: `**Formula:** Portfolio cumulative return in S&P 500 down-months ÷ S&P 500 cumulative return in those same months × 100

**Your result: ${dnCap != null ? dnCap + '%' : 'not yet available'}**

This means: for every 10% the S&P 500 lost in its negative months, your portfolio lost ~${dnCap != null ? (dnCap / 10).toFixed(1) : '?'} percentage points.

**The goal:** Downside capture should be *lower* than upside capture. At ${upCap ?? '?'}% up / ${dnCap ?? '?'}% down, your downside capture currently exceeds upside capture — meaning the portfolio is absorbing a larger share of market losses than it is capturing of market gains.

**Why?** The same alternatives smoothing that suppresses upside participation also affects downside — but during the April 2025 tariff shock, public equity positions marked down immediately while the alternatives NAVs won't reflect the full impact until Q2 2025 quarterly reports. This creates a timing asymmetry that may improve in subsequent quarters.

**Context:** A pure equity portfolio scores ~100% on both measures. A good alternatives-heavy allocation targets something like 40% up / 30% down — consistently capturing more than protecting.

Source: ${isOfficial ? 'AllSource / Tamarac' : 'Estimated — requires full monthly return series'}`
  }

  const infoAlpha = {
    title: 'Jensen\'s Alpha — Risk-Adjusted Excess Return',
    content: `**Formula:** Portfolio Return − [Risk-Free Rate + Beta × (Market Return − Risk-Free Rate)]

Jensen's Alpha measures how much you earned *above* what your market exposure (beta) alone would predict. It isolates manager skill or asset selection from simply riding the market.

**Your result: ${jAlpha != null ? jAlpha + '%' : 'not yet available'}**

${jAlpha != null ? (parseFloat(jAlpha) > 0
  ? `**Positive alpha of +${jAlpha}% means** your portfolio generated returns that cannot be explained by beta exposure alone. Asset selection, alternatives allocation, or fee-adjusted timing added value beyond passive market participation.`
  : `**Negative alpha of ${jAlpha}% means** a passive index fund with the same beta exposure would have outperformed after adjusting for risk. Fee drag (~3% all-in annually) is the most common cause of negative alpha in fee-heavy portfolios.`)
  : 'Alpha requires knowing your portfolio beta (sensitivity to S&P 500 movements), which is estimated from the monthly return correlation between your portfolio and the index.'}

**Important caveat:** With 57% in alternatives (low or zero correlation to S&P 500), your beta is naturally low — this mechanically inflates alpha relative to a pure equity portfolio. For the cleanest reading, Jensen's Alpha should be benchmarked against a **blended index** (e.g., 40% S&P 500 + 60% alternatives composite), not the S&P 500 alone.

Source: ${isOfficial ? 'AllSource / Tamarac Account Analytics' : 'Not yet available — requires portfolio beta estimate'}`
  }

  return (
    <Section
      title="Risk-Adjusted Returns"
      subtitle="How much risk was taken to generate the returns? Without this, alpha claims are incomplete."
    >
      {/* Row 1 — core 4 metrics */}
      <div className="grid-4-col" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <MetricTile
          label="Annualised Return (ITD)"
          value={`+${annReturn}%`}
          sub={`vs S&P 500 +${bm.sp500_net_return_ann ? (bm.sp500_net_return_ann * 100).toFixed(1) : '16.1'}% ITD`}
          color="var(--cyan)"
          info={infoAnnReturn}
        />
        <MetricTile
          label="Sharpe Ratio (ITD)"
          value={sharpe.toFixed(2)}
          sub={sharpeLabel}
          color={sharpeColor}
          note="(Return − Risk-Free) ÷ Volatility"
          info={infoSharpe}
        />
        <MetricTile
          label="Sortino Ratio (ITD)"
          value={sortino != null ? sortino.toFixed(2) : '—'}
          sub={sortino != null ? (sortino >= 1.0 ? 'Strong (>1.0)' : 'Acceptable') : 'n/a'}
          color={sortino != null && sortino >= 1.0 ? 'var(--green)' : 'var(--amber)'}
          note="Return ÷ Downside deviation only"
          info={infoSortino}
        />
        <MetricTile
          label="Max Drawdown"
          value={`${rm.max_drawdown_pct}%`}
          sub={`${rm.max_drawdown_start} → ${rm.max_drawdown_trough}`}
          color={ddColor}
          note="Worst peak-to-trough decline ITD"
          info={infoDD}
        />
      </div>

      {/* Row 2 — volatility + capture ratios + Jensen's alpha */}
      <div className="grid-4-col" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <MetricTile
          label="Annualised Volatility"
          value={`${volPct}%`}
          sub={`vs S&P 500 ~${sp500Vol}% — portfolio runs far lower`}
          color="var(--text-secondary)"
          note="Std dev of monthly returns (ITD)"
          info={infoVol}
        />
        <MetricTile
          label="Upside Capture"
          value={upCap != null ? `${upCap}%` : '—'}
          sub={`Captured ${upCap ?? 26}% of S&P 500 gains`}
          color="var(--text-secondary)"
          note="Low — alternatives dampen upswings"
          info={infoUpCap}
        />
        <MetricTile
          label="Downside Capture"
          value={dnCap != null ? `${dnCap}%` : '—'}
          sub={`Absorbed ${dnCap ?? 65}% of S&P 500 losses`}
          color={dnCap != null && dnCap < 70 ? 'var(--amber)' : 'var(--red)'}
          note="Goal: upside capture > downside capture"
          info={infoDnCap}
        />
        <MetricTile
          label="Jensen's Alpha"
          value={jAlpha != null ? `${parseFloat(jAlpha) > 0 ? '+' : ''}${jAlpha}%` : '—'}
          sub={jAlpha != null && parseFloat(jAlpha) > 0 ? 'Positive excess return vs benchmark' : 'Below benchmark after risk adjustment'}
          color={jAlpha != null && parseFloat(jAlpha) > 0 ? 'var(--green)' : 'var(--red)'}
          note="Risk-adjusted excess return (CAPM)"
          info={infoAlpha}
        />
      </div>

      {/* ── Advisor Interpretation block ─────────────────────────────────── */}
      <div style={{
        borderRadius: 8,
        border: '1px solid var(--border-light)',
        borderLeft: `4px solid ${sharpe >= 0.5 ? 'var(--cyan)' : 'var(--amber)'}`,
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
            color: sharpe >= 0.5 ? 'var(--cyan)' : 'var(--amber)',
          }}>
            Advisor Interpretation
          </span>
          <InfoButton title="Understanding Your Risk Metrics" content={SHARPE_EDU} />
          <span style={{ marginLeft: 'auto', fontSize: 9, color: 'var(--text-muted)', fontStyle: 'italic' }}>
            {isOfficial ? `Source: AllSource / Tamarac · as of ${asOf}` : 'Estimated — update PORTFOLIO_VALUE_SERIES for official figures'}
          </span>
        </div>

        {/* Body */}
        <NarrativeBlur>
          <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.7, fontWeight: 500 }}>
              A Sharpe of <strong style={{ fontFamily: 'var(--font-mono)', color: sharpeColor }}>{sharpe.toFixed(2)}</strong> means
              you earned {sharpe.toFixed(2)} units of return per unit of risk —
              {sharpe >= 0.8
                ? <> <strong>good</strong>, above the typical 0.6–0.8 range for a passive 60/40. The S&P 500 itself scores {bm.sp500_sharpe?.toFixed(2) ?? '0.70'} ITD on the same period. This portfolio is generating well-compensated risk despite carrying ~3% in all-in annual fees.</>
                : sharpe >= 0.5
                ? <> <strong>acceptable</strong> for an alternatives-heavy portfolio absorbing ~3% in all-in annual fees. A pure passive 60/40 typically scores 0.6–0.8 with near-zero costs — fee drag is the gap.</>
                : <> <strong>below the passive baseline</strong>. Fee drag (~3% all-in annually) is the primary culprit.</>
              }
            </p>

            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.7, fontWeight: 500 }}>
              Volatility at <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{volPct}%</strong> annualised
              is well below the S&P 500's <strong style={{ fontFamily: 'var(--font-mono)' }}>{sp500Vol}%</strong> — alternatives are doing their job as volatility dampeners.
              The capture ratio asymmetry (upside {upCap ?? 26}% / downside {dnCap ?? 65}%) reflects the illiquid alternatives sleeve smoothing marks on the downside — the goal is to close that gap on the upside as PE and private credit mature.
            </p>
          </div>
        </NarrativeBlur>

        {/* Source footer */}
        <div style={{
          padding: '8px 16px',
          borderTop: '1px solid var(--border)',
          background: 'var(--bg-input)',
          fontSize: 10, color: 'var(--text-muted)', fontStyle: 'italic',
        }}>
          {isOfficial
            ? `✓ Official figures from AllSource / Tamarac Account Analytics · as of ${asOf}`
            : `⚠ ${rm.data_note}`}
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

      <NarrativeBlur>
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
      </NarrativeBlur>
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

      {/* ── Retirement Advisory Panel ─────────────────────────────────────── */}
      <div style={{
        borderRadius: 8,
        border: '1px solid var(--border-light)',
        borderLeft: `4px solid ${ret.on_track ? 'var(--cyan)' : 'var(--amber)'}`,
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
            color: ret.on_track ? 'var(--cyan)' : 'var(--amber)',
          }}>
            Retirement Projection — Advisor Briefing
          </span>
          <span style={{ marginLeft: 'auto', fontSize: 9, color: 'var(--text-muted)', fontStyle: 'italic' }}>
            No additional contributions assumed · update if savings rate changes
          </span>
        </div>

        {/* Body */}
        <NarrativeBlur>
          <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {ret.on_track ? (
              <>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.7, fontWeight: 500 }}>
                  <strong style={{ color: 'var(--green)' }}>Bottom line: you are well ahead of where you need to be.</strong> To reach <strong style={{ fontFamily: 'var(--font-mono)' }}>$5M</strong> by age {ret.retirement_age}, this portfolio only needs to compound at <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--cyan)' }}>{ret.required_return_pct}%</strong> per year. You have been compounding at <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--green)' }}>{ret.annualized_return_pct}%</strong> — nearly double the minimum required rate. That {(ret.annualized_return_pct - ret.required_return_pct).toFixed(2)}% buffer means returns could slow down significantly from here and you would still reach your target.
                </p>

                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.7, fontWeight: 500 }}>
                  <strong>All three scenarios reach $5M.</strong> Even the conservative model (6% annually — roughly half your current pace) clears the target. The moderate (8%) and current-pace (10.83%) scenarios project into the $8–10M range, well above what you need. The $5M figure itself is grounded in the <strong>4% withdrawal rule</strong>: a $5M portfolio supports ~$200,000/year of inflation-adjusted income, a practical financial independence threshold.
                </p>

                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.7, fontWeight: 500 }}>
                  <strong>One important caveat: this model assumes zero additional contributions.</strong> If you continue saving — even at a modest pace — the required return hurdle drops further and all scenarios improve. Any ongoing savings are pure upside on top of an already solid projection. The planning conversation to have with your advisor is not whether you will reach $5M, but how to preserve it: as age 58–60 approaches, consider whether the 57% alternatives sleeve should begin rotating toward more liquid, lower-volatility assets to protect what you have built.
                </p>
              </>
            ) : (
              <>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.7, fontWeight: 500 }}>
                  <strong style={{ color: 'var(--amber)' }}>The current pace falls short of what is needed.</strong> To reach <strong style={{ fontFamily: 'var(--font-mono)' }}>$5M</strong> by age {ret.retirement_age}, the portfolio needs to compound at <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--amber)' }}>{ret.required_return_pct}%</strong> per year. Your current annualised return of <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--amber)' }}>{ret.annualized_return_pct}%</strong> is below that threshold — meaning the conservative scenario misses $5M at retirement.
                </p>

                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.7, fontWeight: 500 }}>
                  The gap can be closed in two ways: <strong>higher returns</strong> (discuss with your advisor whether the current allocation is positioned for a 13-year accumulation phase) or <strong>ongoing contributions</strong> (adding savings reduces how much investment return you need to rely on — this is the most controllable lever). Either path narrows the shortfall substantially.
                </p>
              </>
            )}
          </div>
        </NarrativeBlur>

        {/* Disclaimer footer */}
        <div style={{
          padding: '8px 16px',
          borderTop: '1px solid var(--border)',
          background: 'var(--bg-input)',
          fontSize: 10, color: 'var(--text-muted)', fontStyle: 'italic',
        }}>
          ⚠ Projections are illustrative compounding models — not guaranteed outcomes. Actual results depend on return sequence, inflation, fees, and contribution patterns.
        </div>
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

      {/* ── HHI + Concentration Advisory Panel ─────────────────────────────── */}
      <div style={{
        borderRadius: 8,
        border: '1px solid var(--border-light)',
        borderLeft: '4px solid var(--amber)',
        background: 'var(--bg-surface)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 16,
          padding: '10px 16px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-input)',
        }}>
          <span style={{
            fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase',
            color: 'var(--amber)',
          }}>
            Concentration Risk — Advisor Briefing
          </span>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>Herfindahl Index</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 800, color: con.hhi > 15 ? 'var(--amber)' : 'var(--green)' }}>{con.hhi}</span>
            <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{con.hhi > 15 ? '— Moderate concentration' : '— Well diversified'}</span>
          </div>
        </div>

        {/* Body */}
        <NarrativeBlur>
          <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.7, fontWeight: 500 }}>
              <strong>Private Equity at 26.3%</strong> is the dominant concentration risk — more than twice the 10–15% ceiling most institutional allocators apply to any single private-markets vehicle. The HHI of <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--amber)' }}>{con.hhi}</strong> signals meaningful asymmetry: a perfectly balanced six-sleeve portfolio scores ~8, the broad US market scores ~6. A score of {con.hhi} reflects the PE sleeve pulling far above its proportional weight.
            </p>

            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.7, fontWeight: 500 }}>
              <strong>This is structurally illiquid — it cannot be trimmed.</strong> Unlike public equities, a PE fund commitment cannot be sold or redeemed before the fund's natural wind-down. The only path forward is time: as the fund matures through its harvest years (typically years 5–8), it will distribute capital and the concentration resolves organically. Forcing a secondary-market sale would incur a 15–30% discount to NAV and is rarely advisable unless there is an acute liquidity crisis.
            </p>

            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.7, fontWeight: 500 }}>
              <strong>Three advisor questions worth raising explicitly:</strong> (1) Is the next capital deployment intended to counterweight the PE sleeve rather than extend it? (2) As PE distributions arrive, what is the reinvestment policy — back into privates, or rotating toward liquid, lower-correlation assets? (3) Is there a formal alternatives ceiling — say ≤40% of AUM — being actively monitored as a guardrail?
            </p>

            <p style={{ margin: 0, fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {con.diversification_note}
            </p>
          </div>
        </NarrativeBlur>

        {/* Footer */}
        <div style={{
          padding: '8px 16px',
          borderTop: '1px solid var(--border)',
          background: 'var(--bg-input)',
          fontSize: 10, color: 'var(--text-muted)', fontStyle: 'italic',
        }}>
          ⚠ HHI and concentration percentages reflect current portfolio weights — they shift as PE distributes capital and new allocations are made.
        </div>
      </div>
    </Section>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function RiskPanel() {
  const { data, loading }           = useApi('/risk')
  const { data: official, loading: loadingOfficial } = useApi('/risk-metrics')

  if (loading || loadingOfficial) return (
    <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>Loading risk analysis…</div>
  )
  if (!data) return null

  const officialSharpe = official?.itd?.sharpe ?? data.risk_metrics.sharpe_ratio

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
            { label: 'Sharpe Ratio', val: officialSharpe.toFixed(2), color: officialSharpe >= 0.8 ? 'var(--green)' : officialSharpe >= 0.5 ? 'var(--amber)' : 'var(--red)' },
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

      <RiskMetrics    rm={data.risk_metrics} official={official} />
      <EquityCurve    curve={data.equity_curve} rm={data.risk_metrics} />
      <LiquidityProfile liq={data.liquidity} />
      <RetirementProjection ret={data.retirement} />
      <ConcentrationRisk    con={data.concentration} />

    </div>
  )
}
