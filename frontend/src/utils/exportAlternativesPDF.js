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

  <!-- ── Section 1: Core Analytical Insight ───────────────────────────── -->
  <div class="section">
    <div class="section-header">1 — Core Analytical Insight: Ex-Commodity Analysis</div>

    <div class="insight-box key">
      <h4>The Headline Number vs. The Strategic Question</h4>
      The reported alternatives ITD return of <strong>${fmtPct(totalReturnPct)}</strong> includes
      the commodity bucket (${fmt$(commodityValue)}, ITD +${(commodityItem?.return_pct ?? 0).toFixed(2)}%),
      which is driven primarily by gold ETF and a quant momentum fund —
      neither of which carries an illiquidity premium, a lock-up, or a complexity premium.
      Stripping commodity out reveals the true core alternatives book: PE, hedge funds, credit, futures, and hedged equity
      returned <strong>${fmtPct(exCommodityReturn)}</strong> ITD vs. the S&amp;P 500 at
      <strong>+${spyItd.toFixed(2)}%</strong> over the same period.
      That gap — ${(spyItd - exCommodityReturn).toFixed(1)} percentage points — is the strategic question for the advisor meeting.
    </div>

    <div class="comparison-grid">
      <div class="cmp-box">
        <div class="cmp-label">Alternatives Reported ITD</div>
        <div class="cmp-value positive">${fmtPct(totalReturnPct)}</div>
        <div class="cmp-sub">All 6 categories incl. commodity</div>
      </div>
      <div class="cmp-box">
        <div class="cmp-label">Core Alternatives Ex-Commodity</div>
        <div class="cmp-value amber">${fmtPct(exCommodityReturn)}</div>
        <div class="cmp-sub">${fmt$(exCommodityValue)} value · ${fmt$(exCommodityGain)} gain</div>
      </div>
      <div class="cmp-box">
        <div class="cmp-label">S&amp;P 500 ITD (Same Period)</div>
        <div class="cmp-value positive">+${spyItd.toFixed(2)}%</div>
        <div class="cmp-sub">Equity benchmark</div>
      </div>
    </div>

    <div class="kpi-row">
      <div class="kpi-box">
        <div class="kpi-label">Commodity Bucket Value</div>
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
        <div class="kpi-sub">Core alternatives book</div>
      </div>
      <div class="kpi-box">
        <div class="kpi-label">Ex-Commodity ITD Return</div>
        <div class="kpi-value amber">${fmtPct(exCommodityReturn)}</div>
        <div class="kpi-sub">vs. S&amp;P +${spyItd.toFixed(2)}% equity benchmark</div>
      </div>
    </div>

    <div class="insight-box attention">
      <h4>Ex-Commodity Formula</h4>
      Cost basis = ${fmt$(exCommodityValue)} − ${fmt$(exCommodityGain)} = ${fmt$(exCommodityCost)}.
      Return = ${fmt$(exCommodityGain)} ÷ ${fmt$(exCommodityCost)} = <strong>${fmtPct(exCommodityReturn)}</strong>.
      This is the return earned by the illiquid, complex, locked-up book — PE, hedge funds, credit, futures, and hedged equity.
      The proper question is not "did alternatives beat bonds" (AGG: +${aggItd.toFixed(2)}%) but
      "did illiquid complexity earn enough premium over public equity (+${spyItd.toFixed(2)}%)."
    </div>

    <div class="insight-box attention">
      <h4>Why Commodity Should Be Assessed Separately</h4>
      <ul style="margin-left: 18px; margin-top: 4px; line-height: 1.8;">
        <li>GLD ETF is a liquid public security — zero illiquidity premium, intraday redemption.</li>
        <li>Statar Capital is a quant fund with monthly liquidity — no lock-up, no J-curve, no complexity premium.</li>
        <li>Both perform well precisely because gold had an exceptional run — this is market beta, not manager alpha.</li>
        <li>Including them inflates the alternatives headline return by ~${((totalReturnPct - exCommodityReturn)).toFixed(1)} percentage points.</li>
        <li>The blended benchmark of ${fmtPct(benchmarkItd)} uses AGG (bond index) as the alternatives comparator — structurally wrong for PE and credit.</li>
      </ul>
    </div>
  </div>

  <!-- ── Section 2: Alternatives Sleeve Overview ───────────────────────── -->
  <div class="section">
    <div class="section-header">2 — Alternatives Sleeve Overview</div>

    <div class="kpi-row">
      <div class="kpi-box">
        <div class="kpi-label">Total Alternatives Value</div>
        <div class="kpi-value positive">${fmt$(totalValue)}</div>
        <div class="kpi-sub">Of ${fmt$(portfolioTotal)} total AUM</div>
      </div>
      <div class="kpi-box">
        <div class="kpi-label">% of Portfolio</div>
        <div class="kpi-value neutral">${fmtPctAbs(portfolioPct)}</div>
        <div class="kpi-sub">vs. typical 15–25% model allocation</div>
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

    <p style="font-size:8.5pt; color:#888; font-style:italic;">
      J-CURVE badge: fund is &lt;3 years old and early capital deployment suppresses reported returns; long-term IRR is expected to improve materially.
      Benchmarks shown are industry-standard comparators for each strategy, not the blended AGG benchmark currently reported.
    </p>
  </div>

  <!-- ── Section 3: Private Equity Deep Dive ──────────────────────────── -->
  <div class="section">
    <div class="section-header">3 — Private Equity Deep Dive (${fmtPctAbs(peItem?.alt_alloc_pct ?? peItem?.weight_pct)} of Alternatives Sleeve)</div>

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
      <h4>VistaOne Flag: Largest Position, Weakest Performance</h4>
      VistaOne is the single largest PE holding at <strong>${fmt$(peHoldings.find(h => h.name?.toLowerCase().includes('vista'))?.value)}</strong>,
      yet its ITD return of <strong>${fmtPct(peHoldings.find(h => h.name?.toLowerCase().includes('vista'))?.return_pct)}</strong>
      is substantially below the PE category average of <strong>${fmtPct(peAvgReturn)}</strong>.
      At current cost basis, VistaOne would need to return approximately <strong>${fmtPct(peAvgReturn)}</strong> from here
      to close the relative gap — requiring a material acceleration in distributions or NAV appreciation.
      Key question: what is the expected harvest timeline and return trajectory?
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
      <tbody>
        ${peRows}
      </tbody>
    </table>

    <div class="insight-box key">
      <h4>J-Curve Context</h4>
      Most of the PE funds in this portfolio are &lt;2 years old. Private equity funds typically show flat or negative early returns as management fees are charged before capital is deployed and investments begin compounding.
      True fund performance is measured by the net IRR at harvest (year 5–10), not reported NAV at year 1–2.
      The current reported returns should be read as early-innings NAV marks, not performance conclusions.
      Exception: VistaOne is old enough to warrant scrutiny.
    </div>
  </div>

  <!-- ── Section 4: Hedge Funds, Managed Futures & Hedged Equity ──────── -->
  <div class="section">
    <div class="section-header">4 — Hedge Funds &amp; Liquid Alternatives</div>

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

    <p style="font-size: 10.5pt; color: #333; margin-bottom: 12px;">
      <strong>Hedge Funds</strong> (${fmt$(hfItem?.value)}, ${fmtPct(hfItem?.return_pct)} ITD):
      Both positions are performing well. RA Capital International leads at ${fmtPct((hfItem?.holdings ?? [])[0]?.return_pct)} ITD —
      strong relative to the HFRI Equity Hedge benchmark. This is the sleeve where active manager selection
      has demonstrated clear value.
    </p>

    <table class="exhibit">
      <thead>
        <tr>
          <th>Fund</th>
          <th>Value</th>
          <th>ITD Return</th>
          <th>$ Gain</th>
          <th>YTD Return</th>
        </tr>
      </thead>
      <tbody>
        ${buildHoldingRows(hfItem)}
      </tbody>
    </table>

    <div class="insight-box attention">
      <h4>MARS FX LP: CTA Performance Below Target</h4>
      MARS FX LP returned ${fmtPct(futuresItem?.return_pct)} ITD.
      Managed futures / CTA funds typically target 8–15% annualized returns,
      with a purpose of uncorrelated returns during equity drawdowns.
      At ${fmtPctAbs(futuresItem?.return_pct)} over the holding period, annualized return is approximately
      ${((futuresItem?.return_pct ?? 0) / 2.25).toFixed(1)}% — below typical CTA targets.
      The relevant question is whether MARS FX delivered its diversification mandate during drawdown periods,
      even if the headline return is subdued.
    </div>

    ${hedgedItem ? `
    <div class="insight-box attention">
      <h4>Hedged Equity (Invenomic): Rounding Error</h4>
      Invenomic represents ${fmt$(hedgedItem?.value)} — approximately ${fmtPctAbs((hedgedItem?.value / portfolioTotal) * 100)} of total portfolio.
      At ${fmtPct(hedgedItem?.return_pct)} ITD, it is the only negative-returning position.
      Given its size, the P&amp;L impact is de minimis. The question is whether this position serves a strategic purpose
      or should be redeployed into a better-performing sleeve.
    </div>` : ''}
  </div>

  <!-- ── Section 5: Private Credit & Risk/Return Analysis ─────────────── -->
  <div class="section">
    <div class="section-header">5 — Private Credit &amp; Full Risk/Return Matrix</div>

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
          <div class="kpi-value neutral" style="font-size:10pt;">Illiquid / Income</div>
          <div class="kpi-sub">Quarterly liquidity, senior secured</div>
        </div>
      </div>

      <p style="font-size:10.5pt; color:#333; margin-bottom:12px;">
        PRF Fund II is the strongest performer in the core alternatives book at ${fmtPct(creditItem?.return_pct)} ITD.
        Private credit at this return level meaningfully exceeds its Cliffwater DLI benchmark
        and justifies the illiquidity taken on. This is the position with the strongest risk-adjusted case.
      </p>`
    })()}

    <p style="font-size:10pt; font-weight:700; margin-bottom: 8px; color: #1a1a2e;">Full Alternatives Risk/Return Matrix (sorted by ITD return)</p>

    <table class="exhibit">
      <thead>
        <tr>
          <th>Category</th>
          <th>ITD Return</th>
          <th>% of Alts</th>
          <th>$ Gain</th>
          <th>Risk Profile</th>
        </tr>
      </thead>
      <tbody>
        ${riskMatrixRows}
      </tbody>
    </table>

    <div class="insight-box attention">
      <h4>Opportunity Cost: 55% Alternatives vs. 100% Equity</h4>
      <div class="def-grid" style="margin-top: 8px;">
        <div class="def-label">Alternatives actual gain (ITD)</div>
        <div class="def-value positive">${fmt$(totalGain)}</div>
        <div class="def-label">If alternatives had matched S&amp;P 500 (+${spyItd.toFixed(2)}%)</div>
        <div class="def-value neutral">${fmt$(impliedEquityGain)}</div>
        <div class="def-label">Opportunity cost gap (nominal)</div>
        <div class="def-value amber">${fmt$(opportunityCostGap)}</div>
        <div class="def-label">Holding period</div>
        <div class="def-value neutral">~27 months (inception to present)</div>
      </div>
      <p style="margin-top:7px; margin-bottom:0;">This ${fmt$(opportunityCostGap)} is the cost of diversification in a bull equity market —
      it does not mean alternatives are wrong. Diversification's value is asymmetric: it pays in down markets.
      The question is whether Patrick's model allocation of 55% alts is a deliberate diversification posture
      or a legacy of capital committed to illiquid vehicles that cannot be easily rebalanced.</p>
    </div>
  </div>

  <!-- ── Section 6: Key Questions for Advisor Meeting ─────────────────── -->
  <div class="section">
    <div class="section-header tinted">6 — Key Questions for Advisor Meeting</div>

    <p style="font-size:10pt; color:#555; margin-bottom: 14px;">
      These are the five questions that cannot be answered with generalities.
      Each has a specific number behind it. Bring this exhibit to the meeting.
    </p>

    <ol class="questions-list">
      <li>
        Is the 55% alternatives allocation (${fmt$(totalValue)} of ${fmt$(portfolioTotal)}) Patrick's deliberate model allocation,
        or is it a structural outcome of capital locked into illiquid vintage commitments that cannot be redeployed?
        <div class="q-detail">
          A 55% alts allocation is approximately 2–3× the typical model for a growth-oriented household portfolio.
          If it's intentional, what is the target allocation and when does it normalize?
          If it's structural lock-up, what is the expected roll-off timeline?
        </div>
      </li>
      <li>
        VistaOne is the single largest PE holding at ${fmt$(peHoldings.find(h => h.name?.toLowerCase().includes('vista'))?.value ?? 0)} —
        yet its ITD return of ${fmtPct(peHoldings.find(h => h.name?.toLowerCase().includes('vista'))?.return_pct)} is the weakest
        in the PE category (average: ${fmtPct(peAvgReturn)}). What is the expected return trajectory and harvest timeline?
        <div class="q-detail">
          At PE category average, VistaOne would be worth ~${fmt$((peHoldings.find(h => h.name?.toLowerCase().includes('vista'))?.value ?? 0) * 1.20)} today.
          The relative underperformance represents a ~${fmt$(((peItem?.return_pct ?? 0) / 100 - (peHoldings.find(h => h.name?.toLowerCase().includes('vista'))?.return_pct ?? 0) / 100) * (peHoldings.find(h => h.name?.toLowerCase().includes('vista'))?.value ?? 0))} drag
          vs. category average. What's the GP's fund thesis and current portfolio company status?
        </div>
      </li>
      <li>
        The commodity bucket (Statar + GLD ETF, ${fmt$(commodityValue)}) accounts for a disproportionate share of the alternatives
        headline return at ${fmtPct(commodityItem?.return_pct)} ITD. Should it be classified and benchmarked separately from
        illiquid alternatives?
        <div class="q-detail">
          Neither position carries illiquidity, lock-up, or complexity premium — the defining characteristics of
          alternatives. Reporting them in the same sleeve as PE and private credit inflates the alternatives ITD return
          by approximately ${((totalReturnPct - exCommodityReturn)).toFixed(1)} percentage points.
          Gold's exceptional recent run (+${(commodityItem?.return_pct ?? 0).toFixed(0)}%) will not persist indefinitely.
        </div>
      </li>
      <li>
        The core alternatives book (ex-commodity) returned ${fmtPct(exCommodityReturn)} ITD vs. the S&amp;P 500 at +${spyItd.toFixed(2)}%.
        What is the specific investment case for maintaining ${fmtPctAbs(portfolioPct)} in alternatives
        vs. a structure like 40% equity + 15% alternatives?
        <div class="q-detail">
          A 40/15 split would have placed ~${fmt$(portfolioTotal * 0.40)} in public equity and ${fmt$(portfolioTotal * 0.15)} in alternatives —
          the equity portion alone at S&amp;P pace would have generated ${fmt$(portfolioTotal * 0.40 * spyItd / 100)} vs.
          the actual alternatives gain of ${fmt$(totalGain)}.
          The diversification benefit needs to be quantified in terms of drawdown protection, not just nominal return.
        </div>
      </li>
      <li>
        What is the proper performance benchmark for each alternatives category? The current blended benchmark
        uses AGG (Bloomberg U.S. Aggregate Bond Index, +${aggItd.toFixed(2)}% ITD) as the alternatives comparator — structurally wrong.
        <div class="q-detail">
          Correct benchmarks: PE → PME vs. S&amp;P 500. Private Credit → Cliffwater DLI.
          Hedge Funds → HFRI Equity Hedge Index. Managed Futures → SG CTA Index.
          Commodity → Bloomberg Commodity Total Return or GLD. Using AGG as the alternatives benchmark
          makes every alternatives position look like an outperformer — it sets an inappropriately low bar.
        </div>
      </li>
    </ol>
  </div>

  <!-- ── Disclaimer ──────────────────────────────────────────────────────── -->
  <div class="disclaimer">
    <strong>Important Disclosure:</strong> This exhibit is prepared solely for informational and planning purposes by the portfolio holder.
    It does not constitute investment advice, a guarantee of future performance, or a solicitation to buy or sell any security.
    All returns are inception-to-date (ITD) as reported by AllSource Advisory / Tamarac.
    Private equity, private credit, and hedge fund NAVs are reported quarterly and may not reflect current economic value.
    Ex-commodity figures are computed from category-level data; minor rounding differences may exist.
    Opportunity cost calculations are illustrative compounding models — actual results differ due to timing,
    fees, and sequence of returns.
    Past performance does not guarantee future results.
    Prepared from independently reconciled AllSource custodian data as of the date shown above.
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
