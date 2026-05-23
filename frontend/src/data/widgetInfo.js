// Internal formatters — self-contained so widgetInfo needs no imports
function _$(v, d = 0) {
  if (v == null) return '—'
  const abs = Math.abs(v)
  const formatted = abs.toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: d })
  return (v < 0 ? '-' : '') + '$' + formatted
}
function _p(v, d = 2) {
  if (v == null) return '—'
  return (v >= 0 ? '+' : '') + v.toFixed(d) + '%'
}

// ── Static entries — conceptual/educational, no portfolio-specific numbers ─────
// These do not change with portfolio data — safe to keep as plain objects.
export const WIDGET_INFO = {

  totalAum: {
    title: 'Total AUM',
    content: `The current market value of everything AllSource manages for you. The cost basis sub-row shows how much you actually deposited — the difference between the two is your total investment gain.\n\nThe "as of" date is a snapshot, not a live feed. It updates each time you run the data refresh script. When it goes stale beyond 45 days, alternatives values become unreliable because PE and VC funds only report quarterly.\n\n**What to watch:** This number should generally only go up over time unless you are making large withdrawals. Compare it to cost basis to get an instant sense of total portfolio profitability.`,
  },

  netGain: {
    title: 'Investment Gain',
    content: `The dollar profit your portfolio has generated over the selected period — calculated as ending market value minus starting value, adjusted for any deposits or withdrawals that occurred during the window.\n\nThis is a dollar amount, not a percentage. The sub-row shows the corresponding IRR (percentage return) for the same period.\n\n**Period selector changes both numbers:** MTD shows only this month's gain; YTD shows January 1 through today; 1Y shows the prior calendar year; Inception shows the full period since your portfolio's inception date.\n\n**What to watch:** Compare the dollar gain across periods to see whether returns are accelerating or decelerating. A large ITD gain with a flat YTD means most of the portfolio's profit was earned in earlier periods.`,
  },

  irr1y: {
    title: 'Net IRR',
    content: `IRR (Internal Rate of Return) is a cash-flow-adjusted percentage return — more accurate than simple return for a portfolio where money moves in and out at different times. It answers: "What annualised rate of return explains all my cash flows and ending value?"\n\n**Why IRR over simple return:** Simple return divides gain by cost, which overstates returns when large deposits arrive late. IRR correctly weights each dollar by how long it was invested.\n\n**Period selector changes this number:** MTD and QTD show short-window IRR; YTD shows calendar-year return; 1Y shows the prior full year; Inception covers the full period since your first deposit forward.\n\n**Best number for advisor meetings:** The 1-Year IRR is the cleanest benchmark comparison — it avoids J-curve drag from PE/VC funds still deploying capital, and is directly comparable to what SPY or AGG returned in the same window.`,
  },

  cashFlowChart: {
    title: 'Monthly Cash Flows & Cumulative Capital',
    content: `The bars show monthly activity: **green = deposits**, **red = withdrawals**, **amber = management fees**, **teal = income**. The dashed blue line (right axis) tracks cumulative net capital deployed over time.\n\n**What the shape tells you:** You funded the portfolio fast — the blue line shot up in the first few months. A large green spike represents additional deposits when they occur. If the blue line trends slowly downward, that is withdrawals and fees slightly exceeding income — not losses.\n\n**What to watch:** If the blue line trends sharply downward for multiple consecutive months, it means you are drawing down the portfolio faster than it is compounding — a cash flow sustainability issue worth monitoring.`,
  },

  managerScorecardHeadline: {
    title: 'Weighted Avg Net Alpha — Equity Sleeve',
    content: `This is the summary verdict on your equity managers as a group. Net alpha = your manager's return minus the passive ETF they are replacing, minus the estimated sub-manager fee.\n\nA positive number means your active managers collectively earned more than you would have made in cheap index funds after accounting for their fees. A negative number means the index would have beaten them net of cost.\n\n**The weighting matters:** Larger positions count more. So if your best-performing manager runs a small position and your worst-performing manager runs a large one, the headline can look bad even if most managers are beating their benchmarks.`,
  },

  managerScorecard: {
    title: 'Manager Scorecard',
    content: `For each equity position, this table shows:\n\n**Your Return** — what your active manager actually delivered.\n\n**Passive ETF** — the cheap index fund (IVV, IVW, IJH, etc.) that would have replaced your manager at near-zero cost.\n\n**Alpha (gross)** — the raw difference before fees. Positive = your manager beat the index. Negative = the index beat your manager.\n\n**Est. Fee** — estimated sub-manager fee using the annualised fee rate across the full holding period.\n\n**Alpha (net)** — the bottom line. What you earned above the index after fees. This is what you are actually paying for.\n\n**Verdict:** "Earned it" (net alpha > +2%), "Marginal" (±2%), "Lost to index" (< -2%).\n\nThe large-cap managers have generally been excellent. Mid and small-cap have been a significant drag. Because large-cap positions are bigger, the weighted average stays positive — but every "Lost to index" position represents real money that would have grown faster in a low-cost Vanguard ETF.`,
  },

  oppCostTable: {
    title: 'Alternatives Accountability — Opportunity Cost',
    content: `Two accountability lenses for every alternatives position:\n\n**vs SPY** — the opportunity cost of not being in stocks. Every dollar in alternatives is a dollar not in the S&P 500. This column shows the dollar difference.\n\n**vs Bonds** — the more appropriate benchmark. Your advisor replaced your bond allocation with alternatives, so the question is whether alts beat bonds. Most did.\n\nThe **aggregate banner** at the top shows your full alternatives sleeve vs what AGG would have returned on the same capital. This is your headline advisor accountability number.\n\n**The honest framing:** Alternatives are not a pure SPY replacement — they are supposed to provide diversification and downside protection. Opportunity cost vs SPY is one lens. Whether they beat bonds — their actual benchmark — is the more appropriate test.`,
  },

  bondSubstituteScorecard: {
    title: 'Bond Substitute Scorecard',
    content: `This shows the return on your "bond-proxy" alternatives — the positions your advisor treats as replacements for traditional bonds in your portfolio. J-Curve vehicles (Private Equity, Venture Capital) are excluded because they are still in the capital deployment phase and would unfairly skew the comparison.\n\nThe key question: did these alternatives earn more than you would have gotten in a simple bond index fund (AGG)?\n\n**Included positions:** Hedged Equity, Managed Futures, Hedge Funds, Private Credit.\n\nThe income row shows dividends and distributions these vehicles generated — real cash returned to the portfolio while capital stays invested. This income component is part of what makes alternatives competitive with bonds even when price returns are modest.`,
  },

}

// ── Dynamic builders — accept live data, return {title, content} ───────────────
// Each function takes the component's own API data as input.
const DYNAMIC = {

  equitySleeve: (d) => {
    const pct = d.equity_pct != null ? d.equity_pct.toFixed(1) : '?'
    const ret = _p(d.equity_return_pct)
    const eqVal = _$(d.equity_value)
    return {
      title: 'Equity Sleeve',
      content: `Your **${pct}%** allocation (${eqVal}) in public equities returned **${ret}** ITD — the standout performer in the portfolio. Large-cap growth managers drove the bulk of this return.\n\nThis is the sleeve where active management has most clearly added value. For a position-by-position breakdown and direct SPY comparison, see the Manager Scorecard in the Insights tab.\n\n**What to watch:** The weighted average return hides wide variation — some managers are exceptional, others have lagged their passive equivalents. The Insights tab breaks this down by position.`,
    }
  },

  altsSleeve: (d) => {
    const pct = d.alternatives_pct != null ? d.alternatives_pct.toFixed(1) : '?'
    const ret = _p(d.alternatives_return_pct)
    const altVal = _$(d.alternatives_value)
    const eqRet = _p(d.equity_return_pct)
    return {
      title: 'Alternatives Sleeve',
      content: `Your **largest allocation** — **${pct}%** of the portfolio (${altVal}) — returned **${ret}** ITD. The equity sleeve returned **${eqRet}** over the same period — a meaningful gap.\n\nThe advisor's argument is that alternatives replace bonds, not equities. The relevant comparison is the Bloomberg Aggregate bond index — see the full breakdown in the Insights tab.\n\n**What to watch:** The Alternatives Accountability panel (My Insights → Alternatives) breaks this down fund by fund, showing which positions beat their benchmark and which did not. J-curve vehicles (PE, VC) are expected to show low returns while capital is being deployed — check their vintage year and deployment status.`,
    }
  },

  feeDrag: (d) => {
    const advisorFee = _$(d.advisor_fees_itd)
    const subMgr = _$(d.sub_manager_fees)
    const rate = d.advisor_fee_rate_pct != null ? `~${d.advisor_fee_rate_pct.toFixed(2)}%` : '~1%'
    const feeShare = (d.advisor_fees_itd != null && d.sub_manager_fees != null && d.total_gain != null && d.total_gain > 0)
      ? ((d.advisor_fees_itd + d.sub_manager_fees) / d.total_gain * 100).toFixed(1)
      : null
    return {
      title: 'Fees & Total Cost Drag',
      content: `The total cost of your portfolio has two parts:\n\n**${advisorFee} advisor fees** — paid directly to AllSource/Tamarac as management fees. Visible in your transaction history. Approximately ${rate} annualised.\n\n**${subMgr} sub-manager drag** — this is the invisible fee. It is embedded inside your fund NAVs and deducted before your portfolio is even reported to you. You never see a bill for this — it quietly reduces your position values.\n\n${feeShare != null ? `Total: roughly **${feeShare} cents of every dollar of gain** paid in fees.\n\n` : ''}**What to watch:** Always ask your advisor to gross up returns before fees when they quote you performance numbers. The sub-mgr drag is the number they will not volunteer.`,
    }
  },

  feeDragAdvisor: (d) => ({
    title: 'Fees & Total Cost Drag',
    content: `The total cost of the portfolio has two parts:\n\n**Advisor fees** — management fees paid to AllSource/Tamarac, visible in the transaction history. Running approximately ${d.advisor_fee_rate_pct != null ? d.advisor_fee_rate_pct.toFixed(2) : '~1'}% annualised.\n\n**Sub-manager drag** — embedded inside fund NAVs and deducted before portfolio values are reported. Represents the collective cost of active management across all fund positions.\n\nTogether these represent the total fee load on the portfolio. The tile shows advisor fees for the selected period; the sub-manager drag is the inception-to-date aggregate.`,
  }),

  benchmarkBar: (d) => {
    const portRet = _p(d.portfolio_return ?? d.portfolio_return_pct)
    return {
      title: 'Benchmarks Bar',
      content: `Three numbers side by side every time you open the dashboard — your real-time context strip.\n\n**S&P 500 (SPY)** — what the US stock market did since your portfolio started and in the current year. **Bloomberg Agg (AGG)** — what a broad bond index returned. **Your Portfolio** — where you sit relative to both.\n\nYour **${portRet}** inception-to-date sits between stocks and bonds — exactly where a blended portfolio should be.\n\n**Note:** The inception-to-date figures are baked when the dashboard is refreshed locally. The "Today" column shows the live day change from Yahoo Finance. The cumulative numbers reflect the last refresh date.`,
    }
  },

  allocationDonut: (d) => {
    // d = { slices: [{label, pct, value, super_category}], cash_value, cash_pct }
    const slices = d.slices || []
    const alts  = slices.find(s => s.super_category === 'alternatives') || {}
    const eq    = slices.find(s => s.super_category === 'equity') || {}
    const cash  = slices.find(s => s.super_category === 'cash') || {}
    const altsPct = alts.pct != null ? Math.round(alts.pct) : '?'
    const eqPct   = eq.pct != null   ? Math.round(eq.pct)   : '?'
    const cashPct = cash.pct != null  ? Math.round(cash.pct) : '?'
    const cashVal = _$(cash.value ?? d.cash_value)
    return {
      title: 'Portfolio Allocation',
      content: `Your asset mix at a glance. **Alternatives ${altsPct}% (amber) · Public Equities ${eqPct}% (blue) · Cash ${cashPct}% (green).**\n\nThe dominant alternatives slice is unconventional — most advisors for investors in their 50s would be closer to 60% equities, 35% bonds, 5% cash. Your advisor has replaced the bond allocation entirely with alternatives.\n\n${cashVal} is held in FDRXX (Fidelity money market), earning approximately 4.7% annually. The cash return shown is annualised over the full holding period since inception.`,
    }
  },

  alphaBenchmark: (d) => {
    const portRet  = _p(d.portfolio_return)
    const bmkRet   = _p(d.benchmark_itd)
    const alpha    = d.alpha_itd != null ? `${d.alpha_itd >= 0 ? '+' : ''}${d.alpha_itd.toFixed(2)}%` : '—'
    const alphaDollars = (d.alpha_itd != null && d.net_gain != null && d.portfolio_return != null && d.portfolio_return > 0)
      ? _$(d.alpha_itd / d.portfolio_return * d.net_gain)
      : null
    const formula = `${d.spy_weight ?? '?'}% SPY + ${d.agg_weight ?? '?'}% AGG + ${d.cash_weight ?? '?'}% cash yield`
    return {
      title: 'Alpha vs Passive Benchmark',
      content: `This computes a blended passive benchmark weighted to match your exact allocation — **${formula}**. If you had put the same money in those three index funds in the same proportions, you would have earned about **${bmkRet}**. You earned **${portRet}**. The difference is **${alpha} alpha** — the value your advisor and managers created above what a passive approach would have given you.\n\n${alphaDollars != null ? `**In dollar terms: roughly ${alphaDollars} of extra value.** ` : ''}That is a positive result. The question is whether it was worth the fee load and the illiquidity of alternatives.\n\nThe benchmark formula is shown below the chart so you can verify the calculation yourself.`,
    }
  },

  irr1yVsBonds: (d) => {
    const irr1y = _p(d.irr_1y)
    const agg1y = _p(d.agg_1y)
    const spread = (d.irr_1y != null && d.agg_1y != null)
      ? `+${(d.irr_1y - d.agg_1y).toFixed(2)}%` : '—'
    const portRet = _p(d.portfolio_return)
    return {
      title: '1-Year IRR vs Bond Index',
      content: `This is the most honest single-year comparison for your portfolio because the 1-year window avoids J-curve distortion from PE/VC funds. Your **${irr1y}** 1-year IRR vs the Bloomberg Agg bond index at **${agg1y}** — you beat bonds by **${spread}** in the last year.\n\nThis is the advisor's strongest talking point and it is legitimate. The alternatives strategy is supposed to beat bonds, and over the last year it clearly has.\n\n**Why 1-year and not inception?** The since-inception **${portRet}** includes the full J-curve effect — PE and VC funds showed 0% while capital was being deployed, dragging the average down. The 1-year IRR only measures periods where capital is actively working.`,
    }
  },

  feeEfficiency: (d) => {
    const effPct    = d.fee_efficiency_pct != null ? d.fee_efficiency_pct.toFixed(1) : '?'
    const feeShare  = d.fee_efficiency_pct != null ? (100 - d.fee_efficiency_pct).toFixed(1) : '?'
    const subMgrAmt = _$(d.fee_gap)
    return {
      title: 'Fee Efficiency',
      content: `Out of every dollar of gross gain your portfolio produced, you kept **${effPct} cents** and **${feeShare} cents** went to fees. The **${subMgrAmt}** sub-manager drag is the hidden portion embedded in fund NAVs — you never saw a bill for it.\n\n${effPct}% is reasonable for an actively managed alternatives-heavy portfolio. For context, a pure index portfolio (Vanguard, Fidelity) would be 99.9%+ efficiency — fees of 0.03–0.05% vs your roughly 1% advisor + ~1% sub-manager combined.\n\n**The tradeoff:** You are paying for active management, alternative access, and quarterly reporting that retail investors cannot get. Whether the performance premium justifies the fee premium is what this dashboard is designed to help you evaluate.`,
    }
  },

  benchmarkBreakdown: (d) => {
    const spyRet  = _p(d.spy_itd)
    const aggRet  = _p(d.agg_itd)
    const cashRet = _p(d.cash_itd)
    const bmkRet  = _p(d.benchmark_itd)
    const portRet = _p(d.portfolio_return)
    const alphaDollars = (d.alpha_itd != null && d.net_gain != null && d.portfolio_return != null && d.portfolio_return > 0)
      ? _$(d.alpha_itd / d.portfolio_return * d.net_gain)
      : null
    return {
      title: 'Portfolio vs Blended Benchmark',
      content: `The bar chart compares your actual portfolio return against what a passive three-fund mix in your exact proportions would have returned.\n\nSub-components: **SPY ${spyRet}** (what equities did) · **AGG ${aggRet}** (what bonds did) · **Cash ${cashRet}** (money market over the holding period). Blended to match your **${d.spy_weight ?? '?'}/${d.agg_weight ?? '?'}/${d.cash_weight ?? '?'}** split, the passive equivalent would be about **${bmkRet}**. You earned **${portRet}**${alphaDollars != null ? ` — generating roughly **${alphaDollars} of extra value**` : ''}.\n\n**The key insight:** Your equity managers outperformed SPY. Your alternatives underperformed their weight-equivalent bond replacement on a return basis. The overall positive alpha comes primarily from equity outperformance, not from the alternatives sleeve.`,
    }
  },

  altsBondSubstitute: (d) => {
    const altsRet = _p(d.alts_itd)
    const aggRet  = _p(d.agg_itd)
    const spread  = d.alts_vs_bonds != null ? `${d.alts_vs_bonds >= 0 ? '+' : ''}${d.alts_vs_bonds.toFixed(2)}%` : '—'
    return {
      title: 'Alternatives as Bond Substitute',
      content: `This panel answers the core alternatives question: did your advisor's bond-replacement bet pay off?\n\n**Alts ${altsRet} vs AGG ${aggRet} = ${spread} excess return.** That is a positive result — but a thin margin for accepting illiquidity, complexity, and quarterly valuation uncertainty.\n\nJ-Curve vehicles (PE and VC) are excluded from this comparison because they are expected to show 0% while capital is being deployed. Including them would unfairly penalise a strategy that has not yet had time to work.\n\n**The thesis your advisor is making:** Alternatives will generate bond-like income with better long-term return potential and lower correlation to equity markets. The ${spread} excess return so far is evidence the thesis is working, but it is early.`,
    }
  },

  irr1yContext: (d) => {
    const irr1y  = _p(d.irr_1y)
    const agg1y  = _p(d.agg_1y)
    const spy1y  = _p(d.spy_1y)
    const portRet = _p(d.portfolio_return)
    const spread  = (d.irr_1y != null && d.agg_1y != null)
      ? `+${(d.irr_1y - d.agg_1y).toFixed(2)}%` : '—'
    return {
      title: '1-Year View — IRR in Context',
      content: `A four-stat strip giving you the single cleanest performance comparison available.\n\n**Why 1-year?** The since-inception **${portRet}** includes the full J-curve effect — PE and VC funds show 0% while capital is being called, dragging the alternatives sleeve aggregate lower. The 1-year IRR from Tamarac is a cleaner signal of current portfolio momentum because it only captures returns from capital that is already deployed and working.\n\n**Portfolio ${irr1y} vs AGG ${agg1y} vs SPY ${spy1y}.** You are between bonds and equities — consistent with a portfolio that is ${d.agg_weight ?? '?'}% alternatives (bond-like) and ${d.spy_weight ?? '?'}% equities. The **${spread} vs bonds** is the number to bring to your next advisor meeting.`,
    }
  },

  targetDate: (d) => {
    const primary  = d.target_date?.primary ?? {}
    const portVal  = _$(d.portfolio_value)
    const primVal  = _$(primary.projected_value)
    const primRet  = primary.return_pct != null ? `${primary.return_pct >= 0 ? '+' : ''}${primary.return_pct.toFixed(0)}%` : '?'
    const gap      = (primary.projected_value != null && d.portfolio_value != null)
      ? primary.projected_value - d.portfolio_value : null
    const gapStr   = gap != null ? `${gap >= 0 ? '+' : ''}${_$(Math.abs(gap))}` : '—'
    const gapSign  = gap != null && gap < 0 ? 'a gap of roughly ' : 'exceeding the target by roughly '
    return {
      title: 'Target-Date Fund Comparison',
      content: `This answers a simple but important question: what would you have today if you had done nothing and put the same money into a **${primary.label ?? 'Vanguard Target 2035'}** fund on the same day?\n\n**${primary.label ?? 'VTTHX'}** returned roughly **${primRet}** in the same period. On your capital, that would be about **${primVal}** today vs your actual **${portVal}** — ${gapSign}**${gapStr}**.\n\nThe caveat box is honest about the limitations: this uses a simplified lump-sum model (not cash-flow-weighted), and your portfolio carries illiquidity risk and J-curve drag that a target-date fund does not. PE and VC funds are understating their true momentum.\n\n**How to use this number:** This is your advisor accountability question. Ask: "What is your plan to close this gap as the PE/VC funds mature and deploy capital?" A good advisor will have a specific answer.`,
    }
  },

  committedCapital: (d) => {
    // d = cmtData from /alt-commitments = { commitments: [{id, label, committed, called, uncalled, called_pct}] }
    const cmts = d.commitments ?? []
    const pe   = cmts.find(c => c.label?.toLowerCase().includes('private equity') || c.id === 'private_equity')
    const vc   = cmts.find(c => c.label?.toLowerCase().includes('venture') || c.id === 'venture_capital')

    const peLine = pe
      ? `**${pe.label}:** You committed ${_$(pe.committed)} total. **${_$(pe.called)}** has been called (drawn down into investments) — ${pe.called_pct}% deployed. **${_$(pe.uncalled)}** is still to be drawn.`
      : '**Private Equity:** Commitment data not available.'

    const vcLine = vc
      ? `**${vc.label}:** ${vc.uncalled === 0 ? `Fully called — your ${_$(vc.committed)} is already deployed.` : `${_$(vc.called)} called of ${_$(vc.committed)} committed. ${_$(vc.uncalled)} still to be drawn.`}`
      : '**Venture Capital:** Commitment data not available.'

    return {
      title: 'Committed Capital — Illiquid Funds',
      content: `For PE and VC funds, the portfolio shows the **market value of called capital only**. But you committed to invest more — and those uncalled commitments are real future cash obligations.\n\n${peLine}\n\n${vcLine}\n\n**Why this matters:** If a large capital call arrives while your liquid assets are low, you may need to sell other positions to fund it. Always make sure you have enough liquid assets to cover uncalled PE commitments before spending or withdrawing.\n\n**Note:** These figures come from fund subscription documents, not Tamarac. They are manually maintained and should be verified against your fund statements each quarter.`,
    }
  },

}

// ── Main export ────────────────────────────────────────────────────────────────
// Pass live data as third argument for any key that has dynamic content.
// For static keys (totalAum, netGain, irr1y, etc.) data is ignored.
export function getWidgetInfo(key, role = 'owner', data = {}) {
  const advisorKey = key + 'Advisor'
  const resolvedKey = (role === 'advisor' && (DYNAMIC[advisorKey] || WIDGET_INFO[advisorKey])) ? advisorKey : key

  const dynamicFn = DYNAMIC[resolvedKey]
  if (dynamicFn) return dynamicFn(data || {})

  return WIDGET_INFO[resolvedKey] || null
}
