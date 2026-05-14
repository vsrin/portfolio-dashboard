export const WIDGET_INFO = {

  totalAum: {
    title: 'Total AUM',
    content: `The current market value of everything AllSource manages for you. The cost basis sub-row shows how much you actually deposited — the difference between the two is your total investment gain.\n\nThe "as of" date is a snapshot, not a live feed. It updates each time you run the data refresh script. When it goes stale beyond 45 days, alternatives values become unreliable because PE and VC funds only report quarterly.\n\n**What to watch:** This number should generally only go up over time unless you are making large withdrawals. Compare it to cost basis to get an instant sense of total portfolio profitability.`,
  },

  netGain: {
    title: 'Investment Gain',
    content: `The dollar profit your portfolio has generated over the selected period — calculated as ending market value minus starting value, adjusted for any deposits or withdrawals that occurred during the window.\n\nThis is a dollar amount, not a percentage. The sub-row shows the corresponding IRR (percentage return) for the same period.\n\n**Period selector changes both numbers:** MTD shows only this month's gain; YTD shows January 1 through today; 1Y shows the prior calendar year; Inception shows the full period since July 10, 2024.\n\n**What to watch:** Compare the dollar gain across periods to see whether returns are accelerating or decelerating. A large ITD gain with a flat YTD means most of the portfolio's profit was earned in earlier periods.`,
  },

  irr1y: {
    title: 'Net IRR',
    content: `IRR (Internal Rate of Return) is a cash-flow-adjusted percentage return — more accurate than simple return for a portfolio where money moves in and out at different times. It answers: "What annualised rate of return explains all my cash flows and ending value?"\n\n**Why IRR over simple return:** Simple return divides gain by cost, which overstates returns when large deposits arrive late. IRR correctly weights each dollar by how long it was invested.\n\n**Period selector changes this number:** MTD and QTD show short-window IRR; YTD shows calendar-year return; 1Y shows the prior full year; Inception covers July 10, 2024 forward.\n\n**Best number for advisor meetings:** The 1-Year IRR is the cleanest benchmark comparison — it avoids J-curve drag from PE/VC funds still deploying capital, and is directly comparable to what SPY or AGG returned in the same window.`,
  },

  equitySleeve: {
    title: 'Equity Sleeve',
    content: `Your 37.7% allocation in public equities has been the standout performer at +35.2%. The equity managers — particularly large-cap growth — drove this. This return is meaningfully above SPY (+31.65% since July 2024).\n\n**What to watch:** The Manager Scorecard (My Insights → Equity) breaks this down by position — some managers are exceptional, others have significantly lagged their passive equivalents. The weighted average hides wide variation.`,
  },

  altsSleeve: {
    title: 'Alternatives Sleeve',
    content: `Your largest allocation — 57.1% of everything you own — returned only +11.4%. This is the central tension in your portfolio. A large majority of your wealth is here, growing at roughly one-third the rate of your equity sleeve.\n\nThe advisor's argument is that alternatives replace bonds — and against the Bloomberg Aggregate bond index (+8.63%), the alts did win by +2.74%. That is a thin margin for the complexity and illiquidity you are carrying.\n\n**What to watch:** The Alternatives Accountability table (My Insights → Alternatives) breaks this down fund by fund, showing which positions beat their benchmark and which did not.`,
  },

  feeDrag: {
    title: 'Fees & Total Cost Drag',
    content: `The total cost of your portfolio has two parts:\n\n**$45,840 advisor fees** — paid directly to AllSource/Tamarac as management fees. Visible in your transaction history. Roughly 1.04% annualised.\n\n**$27,446 sub-manager drag** — this is the invisible fee. It is embedded inside your fund NAVs and deducted before your portfolio is even reported to you. You never see a bill for this — it quietly reduces your position values.\n\nTotal: roughly 3 cents of every dollar of gain paid in fees.\n\n**What to watch:** Always ask your advisor to gross up returns before fees when they quote you performance numbers. The sub-mgr drag is the number they will not volunteer.`,
  },

  benchmarkBar: {
    title: 'Benchmarks Bar',
    content: `Three numbers side by side every time you open the dashboard — your real-time context strip.\n\n**S&P 500 (SPY)** — what the US stock market did since your portfolio started and in the current year. **Bloomberg Agg (AGG)** — what a broad bond index returned. **Your Portfolio** — where you sit relative to both.\n\nYour 20.74% inception-to-date sits between stocks and bonds — exactly where a blended portfolio should be.\n\n**Note:** The inception-to-date figures are baked when the dashboard is refreshed locally. The "Today" column shows the live day change from Yahoo Finance. The cumulative numbers reflect the last refresh date.`,
  },

  cashFlowChart: {
    title: 'Monthly Cash Flows & Cumulative Capital',
    content: `The bars show monthly activity: **green = deposits**, **red = withdrawals**, **amber = management fees**, **teal = income**. The dashed blue line (right axis) tracks cumulative net capital deployed over time.\n\n**What the shape tells you:** You funded the portfolio fast — the blue line shot up in the first two months. The big green spike in mid-2025 was a large additional deposit. The blue line has been slowly declining since — that is not losses, it is withdrawals and fees slightly exceeding income.\n\n**What to watch:** If the blue line trends sharply downward for multiple consecutive months, it means you are drawing down the portfolio faster than it is compounding — a cash flow sustainability issue worth monitoring.`,
  },

  allocationDonut: {
    title: 'Portfolio Allocation',
    content: `Your asset mix at a glance. **Alternatives 57% (green) · Public Equities 38% (blue) · Cash 5% (amber).**\n\nThe dominant alternatives slice is unconventional — most 52-year-olds would be closer to 60% equities, 35% bonds, 5% cash. Your advisor has replaced the bond allocation entirely with alternatives.\n\nThe $123,077 cash is earning ~4.75% annually in FDRXX (Fidelity money market). The +11.3% cash return shown looks high because it is annualised over 22 months of consistent money market income.`,
  },

  assetClassGrid: {
    title: 'Asset Class Cards',
    content: `All 19 positions with value, return, and portfolio weight. Blue border = equity, amber = alternatives, red return = negative.\n\n**Three things to notice immediately:**\n\n**Private Equity ($629K)** is your biggest single position at 26% of the whole portfolio — nearly a quarter of everything in one illiquid fund cluster. It returned +15.38%, which sounds good until you see SPY did +31.65% in the same period.\n\n**Small-Cap Growth (-90.62%) and Small-Cap Value (-45.45%)** look alarming but together are only 1.36% of the portfolio — small positions that will not move the needle significantly. Worth asking the advisor why they are held.\n\n**Gold +62.51%** is a genuine standout — a small position ($45K) that has been an excellent inflation hedge.`,
  },

  alphaBenchmark: {
    title: 'Alpha vs Passive Benchmark',
    content: `This computes a blended passive benchmark weighted to match your exact allocation — 37.7% SPY + 57.1% AGG + 5.1% cash yield. If you had put the same money in those three index funds in the same proportions, you would have earned about 17.30%. You earned 20.74%. The difference is **+3.44% alpha** — the value your advisor and managers created above what a passive approach would have given you.\n\n**In dollar terms: roughly +$59,644 of extra value.** That is a positive result. The question is whether it was worth the $73K in fees and the illiquidity of alternatives.\n\nThe benchmark formula is shown below the chart so you can verify the calculation yourself.`,
  },

  irr1yVsBonds: {
    title: '1-Year IRR vs Bond Index',
    content: `This is the most honest single-year comparison for your portfolio because the 1-year window avoids J-curve distortion from PE/VC funds. Your 13.11% 1-year IRR vs the Bloomberg Agg bond index at 5.07% — you beat bonds by over 8 percentage points in the last year.\n\nThis is the advisor's strongest talking point and it is legitimate. The alternatives strategy is supposed to beat bonds, and over the last year it clearly has.\n\n**Why 1-year and not inception?** The since-inception 20.74% includes the full J-curve effect — PE and VC funds showed 0% while capital was being deployed, dragging the average down. The 1-year IRR only measures periods where capital is actively working.`,
  },

  feeEfficiency: {
    title: 'Fee Efficiency',
    content: `Out of every dollar of gross gain your portfolio produced, you kept **92.9 cents** and 7.1 cents went to fees. The $27,446 sub-manager drag is the hidden portion embedded in fund NAVs — you never saw a bill for it.\n\n92.9% is reasonable for an actively managed alternatives-heavy portfolio. For context, a pure index portfolio (Vanguard, Fidelity) would be 99.9%+ efficiency — fees of 0.03-0.05% vs your roughly 1.04% advisor + ~1% sub-manager combined.\n\n**The tradeoff:** You are paying for active management, alternative access, and quarterly reporting that retail investors cannot get. Whether the performance premium justifies the fee premium is what this dashboard is designed to help you evaluate.`,
  },

  benchmarkBreakdown: {
    title: 'Portfolio vs Blended Benchmark',
    content: `The bar chart compares your actual portfolio return against what a passive three-fund mix in your exact proportions would have returned.\n\nSub-components: **SPY +31.65%** (what equities did) · **AGG +8.63%** (what bonds did) · **Cash +8.70%** (money market over 22 months). Blended to match your 38/57/5 split, the passive equivalent would be about +17.3%. You earned +20.74% — generating roughly **$59,644 of extra value**.\n\n**The key insight:** Your equity managers outperformed SPY. Your alternatives underperformed their weight-equivalent bond replacement on a return basis. The overall positive alpha comes primarily from equity outperformance, not from the alternatives sleeve.`,
  },

  altsBondSubstitute: {
    title: 'Alternatives as Bond Substitute',
    content: `This panel answers the core alternatives question: did your advisor's bond-replacement bet pay off?\n\n**Alts +11.37% vs AGG +8.63% = +2.74% excess return.** On $1.37M of alternatives, that is roughly **+$33,625 more** than bonds would have paid. That is a positive result — but a thin margin for accepting illiquidity, complexity, and quarterly valuation uncertainty.\n\nJ-Curve vehicles (PE and VC) are excluded from this comparison because they are expected to show 0% while capital is being deployed. Including them would unfairly penalise a strategy that has not yet had time to work.\n\n**The thesis your advisor is making:** Alternatives will generate bond-like income with better long-term return potential and lower correlation to equity markets. The 2.74% excess return so far is evidence the thesis is working, but it is early.`,
  },

  irr1yContext: {
    title: '1-Year View — IRR in Context',
    content: `A four-stat strip giving you the single cleanest performance comparison available.\n\n**Why 1-year?** The since-inception 20.74% includes the full J-curve effect — PE and VC funds show 0% while capital is being called, dragging the alternatives sleeve aggregate lower. The 1-year IRR from Tamarac is a cleaner signal of current portfolio momentum because it only captures returns from capital that is already deployed and working.\n\n**Portfolio 13.11% vs AGG 5.07% vs SPY 29.91%.** You are between bonds and equities — consistent with a portfolio that is 57% alternatives (bond-like) and 38% equities. The +8.04% vs bonds is the number to bring to your next advisor meeting.`,
  },

  targetDate: {
    title: 'Target-Date Fund Comparison',
    content: `This answers a simple but important question: what would you have today if you had done nothing and put the same money into a Vanguard Target 2035 fund on the same day?\n\n**VTTHX (Target 2035)** returned roughly 27% in the same period. On your capital, that would be about $2.58M today vs your actual $2.39M — a gap of roughly **-$190K**.\n\nThe caveat box is honest about the limitations: this uses a simplified lump-sum model (not cash-flow-weighted), and your portfolio carries illiquidity risk and J-curve drag that VTTHX does not. PE and VC funds are understating their true momentum.\n\n**How to use this number:** This is your advisor accountability question. It does not mean fire your advisor — it means ask: "What is your plan to close this gap as the PE/VC funds mature and deploy capital?" A good advisor will have a specific answer.`,
  },

  managerScorecardHeadline: {
    title: 'Weighted Avg Net Alpha — Equity Sleeve',
    content: `This is the summary verdict on your equity managers as a group. Net alpha = your manager's return minus the passive ETF they are replacing, minus the estimated sub-manager fee.\n\nA positive number means your active managers collectively earned more than you would have made in cheap index funds after accounting for their fees. A negative number means the index would have beaten them net of cost.\n\n**The weighting matters:** Larger positions count more. So if your best-performing manager runs a small position and your worst-performing manager runs a large one, the headline can look bad even if most managers are beating their benchmarks.`,
  },

  managerScorecard: {
    title: 'Manager Scorecard',
    content: `For each equity position, this table shows:\n\n**Your Return** — what your active manager actually delivered.\n\n**Passive ETF** — the cheap index fund (IVV, IVW, IJH, etc.) that would have replaced your manager at near-zero cost.\n\n**Alpha (gross)** — the raw difference before fees. Positive = your manager beat the index. Negative = the index beat your manager.\n\n**Est. Fee** — estimated sub-manager fee using the annualised fee rate across the 22-month hold period.\n\n**Alpha (net)** — the bottom line. What you earned above the index after fees. This is what you are actually paying for.\n\n**Verdict:** "Earned it" (net alpha > +2%), "Marginal" (+-2%), "Lost to index" (< -2%).\n\nThe large-cap managers have generally been excellent. Mid and small-cap have been a significant drag. Because large-cap positions are bigger, the weighted average stays positive — but every "Lost to index" position represents real money that would have grown faster in a $3/year Vanguard ETF.`,
  },

  oppCostTable: {
    title: 'Alternatives Accountability — Opportunity Cost',
    content: `Two accountability lenses for every alternatives position:\n\n**vs SPY** — the opportunity cost of not being in stocks. Every dollar in alternatives is a dollar not in the S&P 500. This column shows the dollar difference. Only Gold beat SPY.\n\n**vs Bonds** — the more appropriate benchmark. Your advisor replaced your bond allocation with alternatives, so the question is whether alts beat bonds. Most did. Invenomic (Hedged Equity) is the notable exception — it lost to both SPY and AGG.\n\nThe **aggregate banner** at the top shows your full alternatives sleeve vs what AGG would have returned on the same capital. This is your headline advisor accountability number.\n\n**The honest framing:** Alternatives are not a pure SPY replacement — they are supposed to provide diversification and downside protection. Opportunity cost vs SPY is one lens. Whether they beat bonds — their actual benchmark — is the more appropriate test.`,
  },

  committedCapital: {
    title: 'Committed Capital — Illiquid Funds',
    content: `For PE and VC funds, the portfolio shows the **market value of called capital only**. But you committed to invest more — and those uncalled commitments are real future cash obligations.\n\n**Private Equity:** You committed $750,000 total. $629,688 has been called (drawn down into investments). $120,312 is still to be drawn — meaning future capital calls will require cash from somewhere.\n\n**Venture Capital:** Fully called — your $75,000 is already deployed.\n\n**Why this matters:** If a large capital call arrives while your liquid assets are low, you may need to sell other positions to fund it. Always make sure you have enough liquid assets to cover uncalled PE commitments before spending or withdrawing.\n\n**Note:** These figures come from fund subscription documents, not Tamarac. They are manually maintained and should be verified against your fund statements each quarter.`,
  },

  bondSubstituteScorecard: {
    title: 'Bond Substitute Scorecard',
    content: `This shows the return on your "bond-proxy" alternatives — the positions your advisor treats as replacements for traditional bonds in your portfolio. J-Curve vehicles (Private Equity, Venture Capital) are excluded because they are still in the capital deployment phase and would unfairly skew the comparison.\n\nThe key question: did these alternatives earn more than you would have gotten in a simple bond index fund (AGG)?\n\n**Included positions:** Hedged Equity (Invenomic), Managed Futures, Hedge Funds, Private Credit.\n\nThe income row shows dividends and distributions these vehicles generated — real cash returned to the portfolio while capital stays invested. This income component is part of what makes alternatives competitive with bonds even when price returns are modest.`,
  },

  // ─── Advisor-safe variants ───────────────────────────────────────────────────
  // Used when role === 'advisor'. Same structural explanation, neutral framing.

  feeDragAdvisor: {
    title: 'Fees & Total Cost Drag',
    content: `The total cost of the portfolio has two parts:\n\n**Advisor fees** — management fees paid to AllSource/Tamarac, visible in the transaction history. Running approximately 1.04% annualised.\n\n**Sub-manager drag** — embedded inside fund NAVs and deducted before portfolio values are reported. Represents the collective cost of active management across all fund positions.\n\nTogether these represent the total fee load on the portfolio. The tile shows advisor fees for the selected period; the sub-manager drag is the inception-to-date aggregate.`,
  },

  assetClassGridAdvisor: {
    title: 'Asset Class Cards',
    content: `All 19 positions with current market value, return since inception, and portfolio weight. Blue border = equity sleeve, amber = alternatives sleeve.\n\n**Three positions to note:**\n\n**Private Equity ($629K)** is the largest single allocation at 26% of the portfolio, returning +15.38% since funding.\n\n**Small-Cap Growth and Small-Cap Value** are small positions (combined 1.36% of portfolio) with negative returns since inception — areas being monitored.\n\n**Gold +62.51%** has been the strongest performer, serving as an effective inflation hedge within the alternatives sleeve.`,
  },

}

export function getWidgetInfo(key, role = 'owner') {
  const advisorKey = key + 'Advisor'
  if (role === 'advisor' && WIDGET_INFO[advisorKey]) return WIDGET_INFO[advisorKey]
  return WIDGET_INFO[key] || null
}
