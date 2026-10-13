/**
 * exportAlternativesPDF.js
 * Generates a professional exhibit-quality PDF for the Alternatives sleeve analysis.
 * Opens a new window with styled HTML and triggers browser print → Save as PDF.
 *
 * @param {object} alts     - Alternatives data (total_value, total_gain, total_return_pct, portfolio_pct, items[])
 * @param {object} summary  - Portfolio summary (total_value, alternatives_value, alternatives_gain, alternatives_return_pct)
 * @param {object} insights - Benchmark context (spy_itd, benchmark_itd, agg_itd, alpha_itd)
 * @param {object} official - Risk metrics from risk-metrics.json (may be null)
 */
export function exportAlternativesPDF({ alts, summary, insights, official }) {
  // ── Formatters ────────────────────────────────────────────────────────────
  const fmt$ = (n) =>
    n != null ? '$' + Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 }) : '—'

  const fmtPct = (n, decimals = 2) =>
    n != null ? `${Number(n) > 0 ? '+' : ''}${Number(n).toFixed(decimals)}%` : '—'

  const fmtPctAbs = (n, decimals = 2) =>
    n != null ? `${Number(n).toFixed(decimals)}%` : '—'

  const colorClass = (n) =>
    n == null ? 'neutral' : Number(n) > 0 ? 'positive' : Number(n) < 0 ? 'negative' : 'neutral'

  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  // ── Derived values ────────────────────────────────────────────────────────
  const totalValue      = alts?.total_value        ?? 0
  const totalGain       = alts?.total_gain         ?? 0
  const totalReturnPct  = alts?.total_return_pct   ?? 0
  const portfolioPct    = alts?.portfolio_pct      ?? 0
  const items           = alts?.items              ?? []

  const spyItd          = insights?.spy_itd        ?? 42.25
  const benchmarkItd    = insights?.benchmark_itd  ?? 20.37
  const aggItd          = insights?.agg_itd        ?? 5.91
  const alphaItd        = insights?.alpha_itd      ?? null

  const portfolioTotal  = summary?.total_value     ?? 2807577

  // ── Ex-commodity calculation (computed from items array) ──────────────────
  const commodityItem = items.find(i =>
    i.label?.toLowerCase().includes('commodity') || i.id === 'commodity'
  )
  const commodityValue   = commodityItem?.value    ?? 0
  const commodityGain    = commodityItem?.net_gain ?? 0

  const exCommodityValue  = totalValue - commodityValue
  const exCommodityGain   = totalGain  - commodityGain
  const exCommodityCost   = exCommodityValue - exCommodityGain
  const exCommodityReturn = exCommodityCost > 0
    ? (exCommodityGain / exCommodityCost) * 100
    : 0

  // Opportunity cost calculation: if alternatives had matched S&P
  const impliedEquityGain  = totalValue * (spyItd / 100)
  const opportunityCostGap = impliedEquityGain - totalGain

  // ── Architecture analysis — structural counterfactual comparisons ─────────
  const portfolioReturnPct = summary?.total_gain_pct ?? 20.74
  const altsFrac  = portfolioPct / 100           // e.g. 0.55
  const cashFrac  = 0.045                        // ~4.5% cash estimate
  const equityFrac = Math.max(0, 1 - altsFrac - cashFrac)

  // Counterfactual blended returns (ITD, same period)
  const conv7030Return        = spyItd * 0.70 + aggItd * 0.30
  const conv6015alts25bonds   = spyItd * 0.60 + totalReturnPct * 0.15 + aggItd * 0.25

  // What alts needed to return so this portfolio matched the 70/30
  // equityFrac*spy + altsFrac*x + cashFrac*0 = conv7030
  const requiredAltsForParity = altsFrac > 0
    ? (conv7030Return - equityFrac * spyItd) / altsFrac
    : 0
  const altsUnderdelivery = requiredAltsForParity - totalReturnPct

  // Risk metric proxies (for the valuation-smoothing caveat)
  const sharpe = official?.itd?.sharpe ?? null
  const stdDev = official?.itd?.std_dev != null
    ? (official.itd.std_dev * 100).toFixed(1)
    : null

  // ── Section 2: Category table rows ────────────────────────────────────────
  const BENCHMARK_MAP = {
    'private equity':        'PME vs S&P 500',
    'hedge funds':           'HFRI Equity Hedge',
    'commodity':             'GLD / Bloomberg Cmdty',
    'private credit':        'Cliffwater DLI',
    'managed futures':       'SG CTA Index',
    'hedged equity':         'S&P 500',
  }

  const categoryRows = items.map(item => {
    const key = (item.label ?? '').toLowerCase()
    const benchmark = Object.entries(BENCHMARK_MAP).find(([k]) => key.includes(k))?.[1] ?? 'Custom'
    const isJCurve = item.j_curve === true
    return `
      <tr>
        <td>${item.label ?? '—'}${isJCurve ? ' <span class="badge-jc">J-CURVE</span>' : ''}</td>
        <td class="num ${colorClass(item.value)}">${fmt$(item.value)}</td>
        <td class="num ${colorClass(item.return_pct)}">${fmtPct(item.return_pct)} ITD</td>
        <td class="num ${colorClass(item.net_gain)}">${fmt$(item.net_gain)}</td>
        <td class="num neutral">${fmtPctAbs(item.alt_alloc_pct ?? item.weight_pct)}</td>
        <td class="bmark">${benchmark}</td>
      </tr>`
  }).join('')

  const categoryTotal = `
    <tr class="total-row">
      <td><strong>Total Alternatives</strong></td>
      <td class="num positive"><strong>${fmt$(totalValue)}</strong></td>
      <td class="num positive"><strong>${fmtPct(totalReturnPct)} ITD</strong></td>
      <td class="num positive"><strong>${fmt$(totalGain)}</strong></td>
      <td class="num neutral"><strong>${fmtPctAbs(portfolioPct)}</strong></td>
      <td class="bmark">—</td>
    </tr>`

  // ── Section 3: PE holdings table ──────────────────────────────────────────
  const peItem    = items.find(i => i.label?.toLowerCase().includes('private equity'))
  const peHoldings = peItem?.holdings ?? []
  const peAvgReturn = peItem?.return_pct ?? 0

  const peRows = peHoldings.map(h => {
    const isWeak  = h.return_pct != null && h.return_pct < peAvgReturn * 0.5
    const rowClass = isWeak ? ' class="flag-row"' : ''
    return `
      <tr${rowClass}>
        <td>${h.name ?? '—'}${isWeak ? ' <span class="badge-warn">LAGGING</span>' : ''}</td>
        <td class="num ${colorClass(h.value)}">${fmt$(h.value)}</td>
        <td class="num ${colorClass(h.return_pct)}">${fmtPct(h.return_pct)}</td>
        <td class="num ${colorClass(h.gain)}">${fmt$(h.gain)}</td>
        <td class="num ${colorClass(h.ytd_return_pct)}">${fmtPct(h.ytd_return_pct)}</td>
      </tr>`
  }).join('')

  // ── Section 4: HF + Futures + Hedged Equity ───────────────────────────────
  const hfItem      = items.find(i => i.label?.toLowerCase().includes('hedge'))
  const futuresItem = items.find(i => i.label?.toLowerCase().includes('futures'))
  const hedgedItem  = items.find(i => i.label?.toLowerCase().includes('hedged equity') || i.label?.toLowerCase().includes('invenomic'))

  const buildHoldingRows = (cat) =>
    (cat?.holdings ?? []).map(h => `
      <tr>
        <td>${h.name ?? '—'}</td>
        <td class="num ${colorClass(h.value)}">${fmt$(h.value)}</td>
        <td class="num ${colorClass(h.return_pct)}">${fmtPct(h.return_pct)} ITD</td>
        <td class="num ${colorClass(h.gain)}">${fmt$(h.gain)}</td>
        <td class="num ${colorClass(h.ytd_return_pct)}">${fmtPct(h.ytd_return_pct)} YTD</td>
      </tr>`).join('')

  // ── Section 5: Risk/return matrix — sort by return desc ──────────────────
  const sortedItems = [...items].sort((a, b) => (b.return_pct ?? 0) - (a.return_pct ?? 0))
  const riskMatrixRows = sortedItems.map(item => {
    const riskProfile = (() => {
      const lbl = (item.label ?? '').toLowerCase()
      if (lbl.includes('private equity'))   return 'Illiquid / Long-horizon'
      if (lbl.includes('hedge'))            return 'Semi-liquid / Active'
      if (lbl.includes('commodity'))        return 'Liquid / Momentum'
      if (lbl.includes('private credit'))   return 'Illiquid / Income'
      if (lbl.includes('futures'))          return 'Liquid / Trend-following'
      if (lbl.includes('hedged equity') || lbl.includes('invenomic')) return 'Liquid / Long-short'
      return '—'
    })()
    return `
      <tr>
        <td>${item.label ?? '—'}</td>
        <td class="num ${colorClass(item.return_pct)}">${fmtPct(item.return_pct)}</td>
        <td class="num neutral">${fmtPctAbs(item.alt_alloc_pct ?? item.weight_pct)}</td>
        <td class="num ${colorClass(item.net_gain)}">${fmt$(item.net_gain)}</td>
        <td>${riskProfile}</td>
      </tr>`
  }).join('')

  // ── Full HTML ─────────────────────────────────────────────────────────────
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Alternatives Sleeve Exhibit — Srinivasan Household</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,wght@0,300;0,400;0,600;0,700;1,400&family=JetBrains+Mono:wght@400;600&display=swap');

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Source Serif 4', Georgia, serif;
      font-size: 10pt;
      line-height: 1.5;
      color: #1a1a2e;
      background: #fff;
    }

    .page {
      max-width: 820px;
      margin: 0 auto;
      padding: 36px 48px;
    }

    /* ── Cover ─────────────────────────────────────────────────── */
    .cover-header {
      border-bottom: 2px solid #1a1a2e;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }

    .exhibit-title {
      font-size: 17pt;
      font-weight: 700;
      letter-spacing: -0.01em;
      color: #1a1a2e;
      margin-bottom: 2px;
    }

    .exhibit-subtitle {
      font-size: 9.5pt;
      color: #444;
      font-style: italic;
    }

    .cover-meta {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr 1fr;
      gap: 0;
      margin-top: 10px;
      font-size: 9pt;
    }

    .meta-label {
      text-transform: uppercase;
      letter-spacing: 0.07em;
      font-size: 7pt;
      color: #888;
      font-family: 'JetBrains Mono', monospace;
    }

    .meta-value {
      font-weight: 600;
      color: #1a1a2e;
      font-size: 9.5pt;
    }

    /* ── Section shell ──────────────────────────────────────────── */
    .section { margin-bottom: 20px; }

    .section-header {
      background: #1a1a2e;
      color: #fff;
      padding: 5px 12px;
      font-size: 8pt;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      font-family: 'JetBrains Mono', monospace;
      margin-bottom: 10px;
    }

    .section-header.tinted { background: #2d3a6e; }

    p { margin-bottom: 7px; }

    /* ── KPI row ───────────────────────────────────────────────── */
    .kpi-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 12px;
    }

    .kpi-box {
      border: 1px solid #ddd;
      border-top: 3px solid #1a1a2e;
      padding: 7px 10px;
    }

    .kpi-label {
      font-size: 7pt;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      color: #888;
      font-family: 'JetBrains Mono', monospace;
      margin-bottom: 3px;
      line-height: 1.3;
    }

    .kpi-value {
      font-family: 'JetBrains Mono', monospace;
      font-size: 12.5pt;
      font-weight: 600;
      color: #1a1a2e;
      line-height: 1;
    }

    .kpi-value.positive { color: #006b3c; }
    .kpi-value.negative { color: #c0392b; }
    .kpi-value.amber    { color: #b45309; }

    .kpi-sub {
      font-size: 7.5pt;
      color: #666;
      margin-top: 3px;
      line-height: 1.3;
    }

    /* ── Insight boxes ──────────────────────────────────────────── */
    .insight-box {
      padding: 9px 14px;
      margin-bottom: 10px;
      border-left: 4px solid;
      font-size: 9.5pt;
      line-height: 1.55;
    }

    .insight-box.key {
      background: #f0faf4;
      border-color: #0891b2;
    }

    .insight-box.attention {
      background: #fffbeb;
      border-color: #b45309;
    }

    .insight-box.flag {
      background: #fef3c7;
      border-color: #b45309;
    }

    .insight-box h4 {
      font-size: 7.5pt;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #555;
      font-family: 'JetBrains Mono', monospace;
      margin-bottom: 5px;
    }

    /* ── Comparison block ───────────────────────────────────────── */
    .comparison-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 8px;
      margin-bottom: 10px;
    }

    .cmp-box {
      border: 1px solid #ddd;
      padding: 9px 10px;
      text-align: center;
    }

    .cmp-label {
      font-size: 7pt;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      color: #888;
      font-family: 'JetBrains Mono', monospace;
      margin-bottom: 4px;
      line-height: 1.3;
    }

    .cmp-value {
      font-family: 'JetBrains Mono', monospace;
      font-size: 18pt;
      font-weight: 700;
      line-height: 1.1;
    }

    .cmp-value.positive { color: #006b3c; }
    .cmp-value.negative { color: #c0392b; }
    .cmp-value.amber    { color: #b45309; }
    .cmp-value.neutral  { color: #1a1a2e; }

    .cmp-sub {
      font-size: 8pt;
      color: #666;
      margin-top: 4px;
    }

    /* ── Tables (shared) ────────────────────────────────────────── */
    table.exhibit {
      width: 100%;
      border-collapse: collapse;
      font-size: 9pt;
      margin-bottom: 10px;
    }

    table.exhibit th {
      background: #1a1a2e;
      color: #fff;
      padding: 5px 8px;
      text-align: right;
      font-family: 'JetBrains Mono', monospace;
      font-size: 7pt;
      letter-spacing: 0.06em;
      font-weight: 600;
      white-space: nowrap;
    }

    table.exhibit th:first-child { text-align: left; }

    table.exhibit td {
      padding: 4px 8px;
      border-bottom: 1px solid #eee;
      vertical-align: middle;
    }

    table.exhibit td.num {
      text-align: right;
      font-family: 'JetBrains Mono', monospace;
      font-weight: 600;
      white-space: nowrap;
    }

    table.exhibit td.bmark {
      font-size: 8pt;
      color: #666;
      font-style: italic;
    }

    table.exhibit tr:nth-child(even) td { background: #f9f9fc; }

    table.exhibit tr.total-row td {
      border-top: 2px solid #1a1a2e;
      background: #f0f0f5 !important;
    }

    table.exhibit tr.flag-row td {
      background: #fef3c7 !important;
    }

    /* ── Color values ───────────────────────────────────────────── */
    .positive { color: #006b3c; }
    .negative { color: #c0392b; }
    .neutral  { color: #1a1a2e; }
    .amber    { color: #b45309; }

    /* ── Badges ─────────────────────────────────────────────────── */
    .badge-jc {
      display: inline-block;
      background: #1a1a2e;
      color: #fff;
      font-family: 'JetBrains Mono', monospace;
      font-size: 6pt;
      padding: 1px 4px;
      letter-spacing: 0.06em;
      vertical-align: middle;
      margin-left: 4px;
    }

    .badge-warn {
      display: inline-block;
      background: #b45309;
      color: #fff;
      font-family: 'JetBrains Mono', monospace;
      font-size: 6pt;
      padding: 1px 4px;
      letter-spacing: 0.06em;
      vertical-align: middle;
      margin-left: 4px;
    }

    /* ── Questions list ─────────────────────────────────────────── */
    .questions-list {
      counter-reset: q;
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .questions-list li {
      counter-increment: q;
      padding: 8px 12px 8px 44px;
      border-bottom: 1px solid #eee;
      position: relative;
      font-size: 9.5pt;
      line-height: 1.55;
    }

    .questions-list li::before {
      content: "Q" counter(q);
      position: absolute;
      left: 10px;
      top: 9px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 7.5pt;
      font-weight: 700;
      color: #0891b2;
    }

    .questions-list li:last-child { border-bottom: none; }

    .q-detail {
      font-size: 8.5pt;
      color: #555;
      margin-top: 3px;
      font-style: italic;
      line-height: 1.45;
    }

    /* ── Def grid ───────────────────────────────────────────────── */
    .def-grid {
      display: grid;
      grid-template-columns: 240px 1fr;
      gap: 3px 16px;
      font-size: 9.5pt;
      margin-bottom: 10px;
    }

    .def-label { color: #555; font-style: italic; }

    .def-value {
      font-family: 'JetBrains Mono', monospace;
      font-weight: 600;
      color: #1a1a2e;
    }

    /* ── Architecture challenge grid ───────────────────────────── */
    .challenge-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin-bottom: 10px;
    }

    .challenge-box {
      border: 1px solid #ddd;
      border-top: 3px solid #b45309;
      padding: 9px 11px;
    }

    .challenge-title {
      font-family: 'JetBrains Mono', monospace;
      font-size: 7.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      color: #b45309;
      margin-bottom: 5px;
    }

    .challenge-body {
      font-size: 8.5pt;
      line-height: 1.5;
      color: #333;
    }

    /* ── Structural comparison table ────────────────────────────── */
    .struct-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9pt;
      margin-bottom: 10px;
    }

    .struct-table th {
      background: #2d3a6e;
      color: #fff;
      padding: 5px 8px;
      text-align: right;
      font-family: 'JetBrains Mono', monospace;
      font-size: 7pt;
      letter-spacing: 0.06em;
      font-weight: 600;
      white-space: nowrap;
    }

    .struct-table th:first-child { text-align: left; }

    .struct-table td {
      padding: 4px 8px;
      border-bottom: 1px solid #eee;
      vertical-align: middle;
    }

    .struct-table td.num {
      text-align: right;
      font-family: 'JetBrains Mono', monospace;
      font-weight: 600;
      white-space: nowrap;
    }

    .struct-table tr:nth-child(even) td { background: #f9f9fc; }

    .struct-table tr.highlight td {
      background: #fef3c7 !important;
      font-weight: 700;
    }

    /* ── Disclaimer ─────────────────────────────────────────────── */
    .disclaimer {
      margin-top: 18px;
      padding-top: 10px;
      border-top: 1px solid #ddd;
      font-size: 7.5pt;
      color: #888;
      line-height: 1.5;
      font-style: italic;
    }

    /* ── Print ──────────────────────────────────────────────────── */
    @media print {
      body { padding: 0; font-size: 9.5pt; }
      .page { padding: 28px 40px; }
      .no-print { display: none !important; }
      .section-header { page-break-after: avoid; }
    }
  </style>
</head>
<body>
<div class="page">

  <!-- ── Cover Header ─────────────────────────────────────────────────── -->
  <div class="cover-header">
    <div class="exhibit-title">Alternatives Sleeve Exhibit</div>
    <div class="exhibit-subtitle">Srinivasan Household Portfolio — Prepared for Advisor Review</div>
    <div class="cover-meta">
      <div>
        <div class="meta-label">Prepared</div>
        <div class="meta-value">${today}</div>
      </div>
      <div>
        <div class="meta-label">Alternatives AUM</div>
        <div class="meta-value">${fmt$(totalValue)}</div>
      </div>
      <div>
        <div class="meta-label">% of Portfolio</div>
        <div class="meta-value">${fmtPctAbs(portfolioPct)}</div>
      </div>
      <div>
        <div class="meta-label">ITD Return</div>
        <div class="meta-value">${fmtPct(totalReturnPct)}</div>
      </div>
    </div>
  </div>

  <!-- ── Section 1: Investment Architecture ───────────────────────────── -->
  <div class="section">
    <div class="section-header">1 — Investment Architecture: The Bond Substitution Thesis</div>

    <div class="insight-box key">
      <h4>The Structural Premise</h4>
      This portfolio holds <strong>${fmtPctAbs(portfolioPct)}</strong> of AUM in private alternatives — 2–3× the typical 15–25% model allocation.
      The implied thesis: replace the traditional fixed income sleeve with private credit, PE, and hedge funds, which may offer
      better risk-adjusted returns than bonds while providing structural uncorrelation through private valuation mechanisms.
      The premise has merit — core bonds have shown equity correlation during systemic shocks (2008, early 2020).
      What matters is whether the execution earns its specific mechanics.
      An extended equity bull market is the hardest environment to validate this thesis.
    </div>

    <div class="challenge-grid">
      <div class="challenge-box">
        <div class="challenge-title">I — Illiquidity Premium</div>
        <div class="challenge-body">Private credit and equity lock up capital for 5–10 years. The premium is real, but it is earned through structural illiquidity, not risk reduction. Capital is unavailable for rebalancing or opportunistic deployment during market dislocations — precisely when liquidity would be most valuable.</div>
      </div>
      <div class="challenge-box">
        <div class="challenge-title">II — Valuation Lag ≠ Diversification</div>
        <div class="challenge-body">Quarterly NAV creates an <em>appearance</em> of low correlation during equity crashes. The reported Sharpe${sharpe != null ? ' (' + sharpe.toFixed(2) + ')' : ''} and volatility${stdDev != null ? ' (' + stdDev + '%)' : ''} are likely understated — 55% of AUM does not reprice during public market drawdowns. True economic correlation surfaces at exit or recapitalization, years later. This is measurement smoothing, not genuine diversification.</div>
      </div>
      <div class="challenge-box">
        <div class="challenge-title">III — Required Return Bar</div>
        <div class="challenge-body">At 55% concentration, the alternatives book must deliver near-top-quartile results to outperform a conventional 70/30 structure. Median PE and VC historically track — or slightly lag — public equity after fees and J-curve drag. This is a concentrated bet on manager selection, not just asset class diversification.</div>
      </div>
    </div>

    <div class="kpi-row">
      <div class="kpi-box">
        <div class="kpi-label">Actual Portfolio Return ITD</div>
        <div class="kpi-value ${portfolioReturnPct >= conv7030Return ? 'positive' : 'negative'}">${fmtPct(portfolioReturnPct)}</div>
        <div class="kpi-sub">${fmtPctAbs(portfolioPct)} alts · ~${(equityFrac * 100).toFixed(0)}% equity · ~${(cashFrac * 100).toFixed(0)}% cash</div>
      </div>
      <div class="kpi-box">
        <div class="kpi-label">70/30 Equity/Bond (No Alts)</div>
        <div class="kpi-value neutral">${fmtPct(conv7030Return)}</div>
        <div class="kpi-sub">SPY +${spyItd.toFixed(2)}% × 70% + AGG +${aggItd.toFixed(2)}% × 30%</div>
      </div>
      <div class="kpi-box">
        <div class="kpi-label">60/25/15 Equity/Bond/Alts</div>
        <div class="kpi-value neutral">${fmtPct(conv6015alts25bonds)}</div>
        <div class="kpi-sub">Typical model with 15% alts sleeve</div>
      </div>
      <div class="kpi-box">
        <div class="kpi-label">Alts Return Needed for 70/30 Parity</div>
        <div class="kpi-value amber">${fmtPct(requiredAltsForParity)}</div>
        <div class="kpi-sub">Delivered ${fmtPct(totalReturnPct)} — ${fmtPct(altsUnderdelivery)} short of breakeven</div>
      </div>
    </div>

    <div class="insight-box attention">
      <h4>Note on Reported Risk Metrics</h4>
      The portfolio's Sharpe ratio${sharpe != null ? ' (' + sharpe.toFixed(2) + ')' : ''} and annualised volatility${stdDev != null ? ' (' + stdDev + '%)' : ''} should not be taken at face value.
      With approximately ${fmtPctAbs(portfolioPct)} of AUM in quarterly-priced private assets, the standard deviation calculation
      reflects smoothed monthly values — not daily mark-to-market pricing. During the April 2025 equity drawdown,
      private holdings did not reprice; the measured volatility is lower than true economic risk.
      Any comparison to public-market Sharpe benchmarks overstates this portfolio's risk-adjusted performance on a like-for-like basis.
    </div>
  </div>

  <!-- ── Section 2: Core Analytical Insight ───────────────────────────── -->
  <div class="section">
    <div class="section-header">2 — Core Analytical Insight: Ex-Commodity Analysis</div>

    <div class="insight-box key">
      <h4>The Headline Number vs. The Real Question</h4>
      The reported alternatives ITD return of <strong>${fmtPct(totalReturnPct)}</strong> includes the commodity bucket
      (${fmt$(commodityValue)}, ITD ${fmtPct(commodityItem?.return_pct)}), driven primarily by gold ETF and a quant momentum fund —
      neither carries an illiquidity premium, a lock-up, or a complexity premium.
      Stripping commodity reveals the true illiquid book: PE, hedge funds, credit, futures, and hedged equity returned
      <strong>${fmtPct(exCommodityReturn)}</strong> ITD vs. the S&amp;P 500 at <strong>+${spyItd.toFixed(2)}%</strong>.
      That ${(spyItd - exCommodityReturn).toFixed(1)}-point gap is the core question — and it compounds the architecture concern in Section 1.
    </div>

    <div class="comparison-grid">
      <div class="cmp-box">
        <div class="cmp-label">Alternatives Reported ITD</div>
        <div class="cmp-value positive">${fmtPct(totalReturnPct)}</div>
        <div class="cmp-sub">All categories incl. commodity</div>
      </div>
      <div class="cmp-box">
        <div class="cmp-label">Core Alts Ex-Commodity</div>
        <div class="cmp-value amber">${fmtPct(exCommodityReturn)}</div>
        <div class="cmp-sub">${fmt$(exCommodityValue)} value · ${fmt$(exCommodityGain)} gain</div>
      </div>
      <div class="cmp-box">
        <div class="cmp-label">S&amp;P 500 ITD (Same Period)</div>
        <div class="cmp-value positive">+${spyItd.toFixed(2)}%</div>
        <div class="cmp-sub">Public equity benchmark</div>
      </div>
    </div>

    <div class="kpi-row">
      <div class="kpi-box">
        <div class="kpi-label">Commodity Value</div>
        <div class="kpi-value neutral">${fmt$(commodityValue)}</div>
        <div class="kpi-sub">${fmtPctAbs((commodityValue / totalValue) * 100)} of alts sleeve</div>
      </div>
      <div class="kpi-box">
        <div class="kpi-label">Commodity ITD Return</div>
        <div class="kpi-value positive">${fmtPct(commodityItem?.return_pct)}</div>
        <div class="kpi-sub">Statar + GLD ETF combined</div>
      </div>
      <div class="kpi-box">
        <div class="kpi-label">Ex-Commodity Value</div>
        <div class="kpi-value neutral">${fmt$(exCommodityValue)}</div>
        <div class="kpi-sub">Illiquid core book</div>
      </div>
      <div class="kpi-box">
        <div class="kpi-label">Ex-Commodity ITD Return</div>
        <div class="kpi-value amber">${fmtPct(exCommodityReturn)}</div>
        <div class="kpi-sub">vs. S&amp;P +${spyItd.toFixed(2)}% · AGG +${aggItd.toFixed(2)}%</div>
      </div>
    </div>

    <div class="insight-box attention">
      <h4>Ex-Commodity Formula</h4>
      Cost basis = ${fmt$(exCommodityValue)} − ${fmt$(exCommodityGain)} = ${fmt$(exCommodityCost)}.
      Return = ${fmt$(exCommodityGain)} ÷ ${fmt$(exCommodityCost)} = <strong>${fmtPct(exCommodityReturn)}</strong>.
      The proper benchmark is not AGG (+${aggItd.toFixed(2)}%) but public equity (+${spyItd.toFixed(2)}%) —
      the illiquid complexity premium must be measured against the liquid alternative foregone.
      Commodity excluded: GLD ETF and Statar are liquid public strategies; including them masks the illiquid book's underperformance.
    </div>
  </div>

  <!-- ── Section 3: Alternatives Sleeve Overview ───────────────────────── -->
  <div class="section">
    <div class="section-header">3 — Alternatives Sleeve Overview</div>

    <div class="kpi-row">
      <div class="kpi-box">
        <div class="kpi-label">Total Alternatives Value</div>
        <div class="kpi-value positive">${fmt$(totalValue)}</div>
        <div class="kpi-sub">Of ${fmt$(portfolioTotal)} total AUM</div>
      </div>
      <div class="kpi-box">
        <div class="kpi-label">% of Portfolio</div>
        <div class="kpi-value neutral">${fmtPctAbs(portfolioPct)}</div>
        <div class="kpi-sub">vs. typical 15–25% model</div>
      </div>
      <div class="kpi-box">
        <div class="kpi-label">ITD Return (All Alts)</div>
        <div class="kpi-value positive">${fmtPct(totalReturnPct)}</div>
        <div class="kpi-sub">Blended benchmark: ${fmtPct(benchmarkItd)}</div>
      </div>
      <div class="kpi-box">
        <div class="kpi-label">Net Gain ITD</div>
        <div class="kpi-value positive">${fmt$(totalGain)}</div>
        <div class="kpi-sub">Since portfolio inception</div>
      </div>
    </div>

    <table class="exhibit">
      <thead>
        <tr>
          <th>Category</th>
          <th>Value</th>
          <th>ITD Return</th>
          <th>$ Gain</th>
          <th>% of Alts</th>
          <th>Proper Benchmark</th>
        </tr>
      </thead>
      <tbody>
        ${categoryRows}
        ${categoryTotal}
      </tbody>
    </table>

    <p style="font-size:8pt; color:#888; font-style:italic;">
      J-CURVE: fund &lt;3 years old; early capital deployment suppresses reported returns.
      Benchmarks are industry-standard per strategy — not the blended AGG benchmark currently in use.
    </p>
  </div>

  <!-- ── Section 4: Private Equity Deep Dive ──────────────────────────── -->
  <div class="section">
    <div class="section-header">4 — Private Equity Deep Dive (${fmtPctAbs(peItem?.alt_alloc_pct ?? peItem?.weight_pct)} of Alternatives Sleeve)</div>

    <div class="kpi-row">
      <div class="kpi-box">
        <div class="kpi-label">PE Total Value</div>
        <div class="kpi-value positive">${fmt$(peItem?.value)}</div>
        <div class="kpi-sub">${fmtPctAbs(peItem?.alt_alloc_pct ?? peItem?.weight_pct)} of alternatives</div>
      </div>
      <div class="kpi-box">
        <div class="kpi-label">PE Category ITD Return</div>
        <div class="kpi-value positive">${fmtPct(peItem?.return_pct)}</div>
        <div class="kpi-sub">Average across ${(peItem?.holdings ?? []).length} funds</div>
      </div>
      <div class="kpi-box">
        <div class="kpi-label">PE Net Gain</div>
        <div class="kpi-value positive">${fmt$(peItem?.net_gain)}</div>
        <div class="kpi-sub">Since inception</div>
      </div>
      <div class="kpi-box">
        <div class="kpi-label">Fund Count</div>
        <div class="kpi-value neutral">${(peItem?.holdings ?? []).length}</div>
        <div class="kpi-sub">Most &lt;2 years old (J-curve)</div>
      </div>
    </div>

    <div class="insight-box flag">
      <h4>VistaOne: Largest Position, Weakest Return</h4>
      VistaOne is the single largest PE holding at <strong>${fmt$(peHoldings.find(h => h.name?.toLowerCase().includes('vista'))?.value)}</strong>,
      yet its ITD return of <strong>${fmtPct(peHoldings.find(h => h.name?.toLowerCase().includes('vista'))?.return_pct)}</strong>
      is substantially below the category average of <strong>${fmtPct(peAvgReturn)}</strong>.
      Unlike the other J-curve funds, VistaOne is old enough that the early-NAV-suppression explanation no longer applies.
      Key question: expected harvest timeline and distribution trajectory.
    </div>

    <table class="exhibit">
      <thead>
        <tr>
          <th>Fund Name</th>
          <th>Value</th>
          <th>ITD Return</th>
          <th>$ Gain</th>
          <th>YTD Return</th>
        </tr>
      </thead>
      <tbody>${peRows}</tbody>
    </table>

    <div class="insight-box key">
      <h4>J-Curve Context — and Why Median PE May Not Justify the Allocation</h4>
      Most funds here are &lt;2 years old; reported NAV marks are early-innings estimates, not performance conclusions.
      True PE performance is measured at net IRR at harvest (year 5–10).
      However, academic PME studies consistently show that <em>median</em> PE funds, after fees and J-curve, track or slightly lag public equity.
      Top-quartile funds outperform — but that is exactly the bar this 52% allocation must clear.
      The advisor should be able to show vintage-year PME expectations for each fund, not just narrative.
    </div>
  </div>

  <!-- ── Section 5: Hedge Funds & Liquid Alternatives ─────────────────── -->
  <div class="section">
    <div class="section-header">5 — Hedge Funds &amp; Liquid Alternatives</div>

    <div class="kpi-row">
      <div class="kpi-box">
        <div class="kpi-label">Hedge Funds Value</div>
        <div class="kpi-value positive">${fmt$(hfItem?.value)}</div>
        <div class="kpi-sub">2 funds</div>
      </div>
      <div class="kpi-box">
        <div class="kpi-label">HF ITD Return</div>
        <div class="kpi-value positive">${fmtPct(hfItem?.return_pct)}</div>
        <div class="kpi-sub">Best category excl. commodity</div>
      </div>
      <div class="kpi-box">
        <div class="kpi-label">Managed Futures Value</div>
        <div class="kpi-value neutral">${fmt$(futuresItem?.value)}</div>
        <div class="kpi-sub">MARS FX LP</div>
      </div>
      <div class="kpi-box">
        <div class="kpi-label">Futures ITD Return</div>
        <div class="kpi-value neutral">${fmtPct(futuresItem?.return_pct)}</div>
        <div class="kpi-sub">vs. SG CTA benchmark</div>
      </div>
    </div>

    <p style="font-size:9.5pt; color:#333; margin-bottom:8px;">
      <strong>Hedge Funds</strong> (${fmt$(hfItem?.value)}, ${fmtPct(hfItem?.return_pct)} ITD): both positions performing well.
      RA Capital International at ${fmtPct((hfItem?.holdings ?? [])[0]?.return_pct)} ITD is strong relative to HFRI Equity Hedge.
      This is the sleeve where active manager selection has demonstrated clear value.
    </p>

    <table class="exhibit">
      <thead>
        <tr><th>Fund</th><th>Value</th><th>ITD Return</th><th>$ Gain</th><th>YTD Return</th></tr>
      </thead>
      <tbody>${buildHoldingRows(hfItem)}</tbody>
    </table>

    <div class="insight-box attention">
      <h4>MARS FX LP: CTA Below Target — Was the Diversification Mandate Met?</h4>
      MARS FX LP returned ${fmtPct(futuresItem?.return_pct)} ITD (~${((futuresItem?.return_pct ?? 0) / 2.25).toFixed(1)}% annualised vs. 8–15% CTA target).
      The headline return is secondary. The test for a managed futures allocation is whether MARS FX
      delivered positive or uncorrelated returns during the April 2025 equity drawdown.
      If it did not provide a hedge precisely when equities fell, the diversification premise failed.
    </div>

    ${hedgedItem ? `
    <div class="insight-box attention">
      <h4>Invenomic: Only Negative Position — Strategic or Residual?</h4>
      ${fmt$(hedgedItem?.value)} (${fmtPctAbs((hedgedItem?.value / portfolioTotal) * 100)} of total AUM), ${fmtPct(hedgedItem?.return_pct)} ITD.
      P&amp;L impact is de minimis. The question is whether this is a deliberate long/short equity allocation
      or a residual position that should be consolidated into the core hedge fund sleeve.
    </div>` : ''}
  </div>

  <!-- ── Section 6: Private Credit & Risk/Return Matrix ───────────────── -->
  <div class="section">
    <div class="section-header">6 — Private Credit &amp; Full Risk/Return Matrix</div>

    ${(() => {
      const creditItem = items.find(i => i.label?.toLowerCase().includes('credit'))
      return `
      <div class="kpi-row">
        <div class="kpi-box">
          <div class="kpi-label">Private Credit Value</div>
          <div class="kpi-value positive">${fmt$(creditItem?.value)}</div>
          <div class="kpi-sub">PRF Fund II</div>
        </div>
        <div class="kpi-box">
          <div class="kpi-label">Credit ITD Return</div>
          <div class="kpi-value positive">${fmtPct(creditItem?.return_pct)}</div>
          <div class="kpi-sub">vs. Cliffwater DLI benchmark</div>
        </div>
        <div class="kpi-box">
          <div class="kpi-label">Credit Net Gain</div>
          <div class="kpi-value positive">${fmt$(creditItem?.net_gain)}</div>
          <div class="kpi-sub">Since inception</div>
        </div>
        <div class="kpi-box">
          <div class="kpi-label">Risk Profile</div>
          <div class="kpi-value neutral" style="font-size:9pt; line-height:1.2;">Illiquid / Income</div>
          <div class="kpi-sub">Quarterly liquidity, senior secured</div>
        </div>
      </div>
      <p style="font-size:9.5pt; color:#333; margin-bottom:8px;">
        PRF Fund II is the strongest performer in the core book at ${fmtPct(creditItem?.return_pct)} ITD — and the clearest risk-adjusted case.
        Private credit replacing bonds is structurally more defensible than PE replacing bonds:
        both are income-oriented and illiquid, but credit offers more predictable cash flows.
      </p>`
    })()}

    <p style="font-size:9pt; font-weight:700; margin-bottom:6px; color:#1a1a2e;">Full Risk/Return Matrix (sorted by ITD return)</p>

    <table class="exhibit">
      <thead>
        <tr>
          <th>Category</th><th>ITD Return</th><th>% of Alts</th><th>$ Gain</th><th>Risk Profile</th>
        </tr>
      </thead>
      <tbody>${riskMatrixRows}</tbody>
    </table>

    <div class="insight-box attention">
      <h4>Structural Opportunity Cost: This Portfolio vs. Conventional Alternatives</h4>
      <table class="struct-table" style="margin-top:6px;">
        <thead>
          <tr>
            <th style="text-align:left;">Portfolio Structure</th>
            <th>Alts %</th>
            <th>Est. ITD Return</th>
            <th>vs. Actual</th>
          </tr>
        </thead>
        <tbody>
          <tr class="highlight">
            <td>This Portfolio (actual)</td>
            <td class="num">${fmtPctAbs(portfolioPct)}</td>
            <td class="num ${portfolioReturnPct >= 0 ? 'positive' : 'negative'}">${fmtPct(portfolioReturnPct)}</td>
            <td class="num">—</td>
          </tr>
          <tr>
            <td>70/30 Equity/Bond (no alternatives)</td>
            <td class="num">0%</td>
            <td class="num neutral">${fmtPct(conv7030Return)}</td>
            <td class="num ${conv7030Return > portfolioReturnPct ? 'negative' : 'positive'}">${fmtPct(conv7030Return - portfolioReturnPct)}</td>
          </tr>
          <tr>
            <td>60/25/15 Equity/Bond/Alts (typical model)</td>
            <td class="num">15%</td>
            <td class="num neutral">${fmtPct(conv6015alts25bonds)}</td>
            <td class="num ${conv6015alts25bonds > portfolioReturnPct ? 'negative' : 'positive'}">${fmtPct(conv6015alts25bonds - portfolioReturnPct)}</td>
          </tr>
        </tbody>
      </table>
      <p style="font-size:8.5pt; color:#555; margin-top:6px; margin-bottom:0; font-style:italic;">
        These are illustrative blended return estimates using actual ITD figures (SPY ${fmtPct(spyItd)}, AGG ${fmtPct(aggItd)}, alts ${fmtPct(totalReturnPct)}).
        The alternatives book needed to return <strong>${fmtPct(requiredAltsForParity)}</strong> ITD just to match a simple 70/30 portfolio — it delivered ${fmtPct(totalReturnPct)}.
        This is the cost of the bond-substitution architecture in a prolonged equity bull market.
      </p>
    </div>
  </div>

  <!-- ── Section 7: Key Questions for Advisor Meeting ─────────────────── -->
  <div class="section">
    <div class="section-header tinted">7 — Key Questions for Advisor Meeting</div>

    <p style="font-size:9pt; color:#555; margin-bottom:10px;">
      Five questions with specific numbers. Each requires a direct answer — not a category overview or a fund narrative.
    </p>

    <ol class="questions-list">
      <li>
        Was the decision to hold ${fmtPctAbs(portfolioPct)} in alternatives an explicit, documented architectural choice
        to substitute traditional fixed income — or is it a structural outcome of capital committed to illiquid vehicles
        that cannot currently be redeployed?
        <div class="q-detail">
          If intentional: what is the written IPS target for alternatives, and what is the rebalancing mechanism if equities
          outperform for another two years? If structural lock-up: what is the weighted roll-off timeline across the seven funds?
          The answer determines whether the allocation will self-correct or requires active management.
        </div>
      </li>
      <li>
        During the April 2025 equity drawdown (S&amp;P approximately −18%), what was the actual quarterly NAV change
        across the private equity, private credit, and hedge fund positions?
        <div class="q-detail">
          If quarterly marks had not yet come back at the time of the drawdown, the portfolio's reported low volatility
          is a measurement artifact — not genuine protection. The advisor should be able to show Q1 or Q2 2025 NAV
          changes by fund. If private assets did not mark down materially while public equities fell 18%, the follow-up
          question is: what are the unrealized losses sitting in the quarterly lag?
        </div>
      </li>
      <li>
        VistaOne is the single largest PE holding at ${fmt$(peHoldings.find(h => h.name?.toLowerCase().includes('vista'))?.value ?? 0)}
        with an ITD return of ${fmtPct(peHoldings.find(h => h.name?.toLowerCase().includes('vista'))?.return_pct)} vs. the PE
        category average of ${fmtPct(peAvgReturn)}. What is the GP's harvest timeline, current distribution pace, and
        the specific path to closing the performance gap?
        <div class="q-detail">
          Unlike the other J-curve funds, VistaOne has been held long enough that early-NAV-suppression is no longer
          the explanation. The relative underperformance represents real tracking error vs. what the capital could have
          earned in a median PE vehicle. The advisor needs fund-level thesis and portfolio company status, not macro narrative.
        </div>
      </li>
      <li>
        The alternatives book needed to return approximately <strong>${fmtPct(requiredAltsForParity)}</strong> ITD to match
        a conventional 70/30 portfolio — it returned ${fmtPct(totalReturnPct)}, missing by ${fmtPct(altsUnderdelivery)}.
        What is the forward return expectation for each strategy over the next five years that justifies maintaining
        ${fmtPctAbs(portfolioPct)} in illiquid alternatives?
        <div class="q-detail">
          Median PE and VC funds track or slightly lag public equity after fees and J-curve. Top-quartile outperforms —
          but that is the bar 52% of this portfolio must clear. The advisor should provide vintage-year PME expectations
          by fund, not blended category figures. The case for this architecture must be made in forward returns,
          not the past performance of a commodity-boosted headline number.
        </div>
      </li>
      <li>
        The commodity sleeve (${fmt$(commodityValue)}, ${fmtPct(commodityItem?.return_pct)} ITD) inflates the alternatives
        headline return by ~${((totalReturnPct - exCommodityReturn)).toFixed(1)} percentage points. The blended benchmark uses
        AGG (+${aggItd.toFixed(2)}% ITD) as the alternatives comparator. Should both be corrected before the next performance review?
        <div class="q-detail">
          GLD ETF and Statar Capital are liquid public strategies — they carry no illiquidity, lock-up, or complexity premium.
          Benchmarking PE against AGG makes the alternatives book appear to outperform by design.
          Corrected benchmarks: PE → PME vs. S&amp;P 500. Credit → Cliffwater DLI. Hedge Funds → HFRI Equity Hedge. Futures → SG CTA.
          Request that the advisor report the ex-commodity book separately from the next review cycle onward.
        </div>
      </li>
    </ol>
  </div>

  <!-- ── Disclaimer ──────────────────────────────────────────────────────── -->
  <div class="disclaimer">
    <strong>Important Disclosure:</strong> This exhibit is prepared solely for informational and planning purposes by the portfolio holder.
    It does not constitute investment advice, a guarantee of future performance, or a solicitation to buy or sell any security.
    All returns are ITD as reported by AllSource Advisory / Tamarac. Private equity, private credit, and hedge fund NAVs are
    reported quarterly and may not reflect current economic value. Structural comparison returns (70/30, 60/25/15) are illustrative
    estimates using actual ITD benchmarks — they do not account for timing, rebalancing, or transaction costs.
    Opportunity cost calculations are models; actual results differ. Past performance does not guarantee future results.
  </div>

</div>

<script>
  window.onload = function() {
    setTimeout(function() {
      try {
        window.print();
      } catch(e) {
        alert('Auto-print failed. Please use File → Print (Cmd+P / Ctrl+P) to save as PDF.');
      }
    }, 400);
  };
</script>
</body>
</html>`

  // ── Open window ────────────────────────────────────────────────────────
  const win = window.open('', '_blank', 'width=920,height=760')
  if (!win) {
    alert('Pop-up blocked. Please allow pop-ups for this site and try again.')
    return
  }
  win.document.write(html)
  win.document.close()
}
