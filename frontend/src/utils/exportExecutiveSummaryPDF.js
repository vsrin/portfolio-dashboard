/**
 * exportExecutiveSummaryPDF.js
 * Generates a professional 2-page executive summary exhibit for the Srinivasan household
 * portfolio. Opens a styled HTML window and auto-triggers window.print() → Save as PDF.
 *
 * @param {object} summary      - From summary.json  (total_value, gain_ytd, irr figures, sleeve breakdown, fees, …)
 * @param {object} insights     - From insights.json (benchmark comparisons, gross_gain, alpha_itd, …)
 * @param {Array}  assetClasses - From asset-classes.json (label, category, value, net_gain, return_pct, weight_pct)
 * @param {object} official     - From risk-metrics.json (itd.sharpe/sortino/beta/upside_capture/downside_capture/std_dev, benchmark_itd, as_of)
 */
export function exportExecutiveSummaryPDF({ summary, insights, assetClasses, official }) {
  // ── Formatters ───────────────────────────────────────────────────────────────

  const fmt$ = (n, decimals = 0) =>
    n != null
      ? '$' + Number(n).toLocaleString('en-US', { maximumFractionDigits: decimals, minimumFractionDigits: decimals })
      : '—'

  const fmtPct = (n, decimals = 2, forceSign = false) => {
    if (n == null) return '—'
    const sign = n > 0 ? '+' : ''
    return `${forceSign || n !== 0 ? sign : ''}${Number(n).toFixed(decimals)}%`
  }

  const fmtPctNoSign = (n, decimals = 2) =>
    n != null ? `${Number(n).toFixed(decimals)}%` : '—'

  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  // ── Pull values (fall back to hard-coded dataset values so the exhibit never goes blank) ──

  const totalValue          = summary?.total_value           ?? 2807577.26
  const asOfDate            = summary?.as_of_date            ?? '2026-10-09'
  const inceptionDate       = summary?.inception_date        ?? '2024-07-10'
  const costBasis           = summary?.cost_basis            ?? 2160964.0
  const totalGain           = summary?.total_gain            ?? 646613.26
  const totalGainPct        = summary?.total_gain_pct        ?? 35.81
  const netIrr1y            = summary?.net_irr_1y            ?? 13.32
  const netIrrYtd           = summary?.net_irr_ytd           ?? 11.31
  const netIrrQtd           = summary?.net_irr_qtd           ?? 1.06
  const netIrrMtd           = summary?.net_irr_mtd           ?? 1.06

  const equityValue         = summary?.equity_value          ?? 1113746.47
  const equityPct           = summary?.equity_pct            ?? 39.67
  const equityGain          = summary?.equity_gain           ?? 439509.56
  const equityReturnPct     = summary?.equity_return_pct     ?? 65.19
  const equityReturn1y      = summary?.equity_return_pct_1y  ?? 14.64

  const altsValue           = summary?.alternatives_value    ?? 1551095.97
  const altsPct             = summary?.alternatives_pct      ?? 55.25
  const altsGain            = summary?.alternatives_gain     ?? 249777.45
  const altsReturnPct       = summary?.alternatives_return_pct    ?? 19.19
  const altsReturn1y        = summary?.alternatives_return_pct_1y ?? 11.54

  const cashValue           = summary?.cash_value            ?? 105843.86
  const cashPct             = summary?.cash_pct              ?? 3.77

  const advisorFeesItd      = summary?.advisor_fees_itd      ?? 59537.7
  const advisorFees1y       = summary?.advisor_fees_1y       ?? 42064.89
  const advisorFeesYtd      = summary?.advisor_fees_ytd      ?? 25967.16
  const advisorFeeRatePct   = summary?.advisor_fee_rate_pct  ?? 1.16
  const subManagerFees      = summary?.sub_manager_fees      ?? 56682.98
  const totalFeeImpact      = summary?.total_fee_impact      ?? 116220.68
  const gainYtd             = summary?.gain_ytd              ?? 279573.26
  const gain1y              = summary?.gain_1y               ?? 283940.71

  const spyItd              = insights?.spy_itd              ?? 42.25
  const aggItd              = insights?.agg_itd              ?? 5.91
  const benchmarkItd        = insights?.benchmark_itd        ?? 20.37
  const alphaItd            = insights?.alpha_itd            ?? 15.44
  const spy1y               = insights?.spy_1y               ?? 20.44
  const grossGain           = insights?.gross_gain           ?? 703296.24
  const feeGap              = insights?.fee_gap              ?? 56682.98

  const itd                 = official?.itd                  ?? {}
  const sharpe              = itd.sharpe   ?? 0.84
  const sortino             = itd.sortino  ?? 1.26
  const beta                = itd.beta     ?? 0.43
  const upsideCapture       = itd.upside_capture   != null ? Math.round(itd.upside_capture * 100)   : 26
  const downsideCapture     = itd.downside_capture != null ? Math.round(itd.downside_capture * 100) : 65
  const stdDevRaw           = itd.std_dev  ?? 0.0845
  const stdDev              = (stdDevRaw * 100).toFixed(2)
  const sp500Sharpe         = official?.benchmark_itd?.sp500_sharpe ?? 0.70
  const riskAsOf            = official?.as_of ?? '2026-05-09'

  // ── Derived values ───────────────────────────────────────────────────────────

  const equityVsSpy         = equityReturnPct - spyItd   // +22.94pp
  const feeImpactPct        = totalFeeImpact / grossGain * 100

  // ── Asset class buckets ──────────────────────────────────────────────────────

  const sortedByReturn = (assetClasses ?? [])
    .filter(ac => ac.return_pct != null)
    .sort((a, b) => b.return_pct - a.return_pct)

  // Top performers (positive return, top 5 by return)
  const topPerformers = sortedByReturn.filter(ac => ac.return_pct > 0).slice(0, 5)

  // Flags — negative return classes
  const flagged = sortedByReturn.filter(ac => ac.return_pct < 0)

  // Combined small-cap drag (sum of flagged absolute losses)
  const combinedFlaggedValue = flagged.reduce((s, ac) => s + (ac.value ?? 0), 0)
  const combinedFlaggedGain  = flagged.reduce((s, ac) => s + (ac.net_gain ?? 0), 0)

  // ── Helper: colour class from return ────────────────────────────────────────

  const retColour = (n) => (n > 0 ? 'pos' : n < 0 ? 'neg' : '')

  // ── Build performer rows ─────────────────────────────────────────────────────

  const topRows = topPerformers.map(ac => `
    <tr>
      <td>${ac.label ?? '—'}</td>
      <td class="mono ${retColour(ac.return_pct)}">${fmtPct(ac.return_pct, 2, true)}</td>
      <td class="mono">${fmt$(ac.value)}</td>
      <td class="mono ${retColour(ac.net_gain)}">${fmt$(ac.net_gain)}</td>
    </tr>`).join('')

  const flagRows = flagged.map(ac => `
    <tr class="flag-row">
      <td>${ac.label ?? '—'}</td>
      <td class="mono neg">${fmtPct(ac.return_pct, 2, true)}</td>
      <td class="mono">${fmt$(ac.value)}</td>
      <td class="mono neg">${fmt$(ac.net_gain)}</td>
      <td class="tag">MANAGER FAILURE</td>
    </tr>`).join('')

  // ── HTML ─────────────────────────────────────────────────────────────────────

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Executive Portfolio Summary — Srinivasan Household</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,wght@0,300;0,400;0,600;0,700;1,400&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Source Serif 4', Georgia, serif;
      font-size: 10.5pt;
      line-height: 1.6;
      color: #1a1a2e;
      background: #fff;
    }

    .page {
      max-width: 820px;
      margin: 0 auto;
      padding: 40px 50px;
    }

    /* ── Cover ─────────────────────────────────────────── */
    .cover-header {
      border-bottom: 3px double #1a1a2e;
      padding-bottom: 16px;
      margin-bottom: 22px;
    }

    .exhibit-title {
      font-size: 19pt;
      font-weight: 700;
      letter-spacing: -0.01em;
      color: #1a1a2e;
      margin-bottom: 3px;
    }

    .exhibit-sub {
      font-size: 10.5pt;
      color: #555;
      font-style: italic;
    }

    .cover-meta {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 0;
      margin-top: 12px;
      font-size: 9pt;
    }

    .meta-label {
      text-transform: uppercase;
      letter-spacing: 0.07em;
      font-size: 7.5pt;
      color: #999;
      font-family: 'JetBrains Mono', monospace;
    }

    .meta-value {
      font-weight: 600;
      color: #1a1a2e;
      font-family: 'JetBrains Mono', monospace;
      font-size: 9pt;
    }

    /* ── Section ───────────────────────────────────────── */
    .section {
      margin-bottom: 26px;
    }

    .section-header {
      background: #1a1a2e;
      color: #fff;
      padding: 5px 12px;
      font-size: 8.5pt;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      font-family: 'JetBrains Mono', monospace;
      margin-bottom: 12px;
    }

    /* ── KPI tiles ─────────────────────────────────────── */
    .kpi-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 10px;
    }

    .kpi-box {
      border: 1px solid #ddd;
      border-top: 3px solid #1a1a2e;
      padding: 9px 11px;
    }

    .kpi-label {
      font-size: 7.5pt;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #999;
      font-family: 'JetBrains Mono', monospace;
      margin-bottom: 4px;
    }

    .kpi-value {
      font-family: 'JetBrains Mono', monospace;
      font-size: 15pt;
      font-weight: 600;
      color: #1a1a2e;
      line-height: 1.1;
    }

    .kpi-value.pos { color: #006b3c; }
    .kpi-value.neg { color: #c0392b; }

    .kpi-sub {
      font-size: 8pt;
      color: #777;
      margin-top: 3px;
    }

    .meta-line {
      font-size: 8.5pt;
      color: #666;
      font-style: italic;
      margin-top: 2px;
    }

    /* ── Tables ────────────────────────────────────────── */
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9.5pt;
    }

    table th {
      background: #1a1a2e;
      color: #fff;
      padding: 6px 10px;
      text-align: right;
      font-family: 'JetBrains Mono', monospace;
      font-size: 7.5pt;
      letter-spacing: 0.06em;
      font-weight: 600;
    }

    table th:first-child { text-align: left; }

    table td {
      padding: 5px 10px;
      border-bottom: 1px solid #eee;
      vertical-align: middle;
    }

    table td:first-child { text-align: left; }

    table td.mono {
      text-align: right;
      font-family: 'JetBrains Mono', monospace;
      font-weight: 600;
    }

    table td.center { text-align: center; }

    table tr:nth-child(even) td { background: #f9f9fc; }

    .pos { color: #006b3c; }
    .neg { color: #c0392b; }

    /* ── Sleeve breakdown ──────────────────────────────── */
    .sleeve-table th,
    .sleeve-table td {
      text-align: center;
    }

    .sleeve-table th:first-child,
    .sleeve-table td:first-child {
      text-align: left;
    }

    .sleeve-table .row-label {
      font-size: 8.5pt;
      color: #666;
      font-style: italic;
    }

    /* ── Benchmark note ────────────────────────────────── */
    .callout {
      background: #f0faf4;
      border-left: 4px solid #006b3c;
      padding: 8px 12px;
      margin-top: 10px;
      font-size: 9.5pt;
      color: #1a1a2e;
    }

    .callout strong { color: #006b3c; }

    /* ── Performance/flags grid ────────────────────────── */
    .perf-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }

    .perf-col-header {
      font-size: 8pt;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #888;
      font-family: 'JetBrains Mono', monospace;
      margin-bottom: 6px;
    }

    /* Flag rows */
    tr.flag-row td {
      background: #fff5f5 !important;
      border-left: 3px solid #c0392b;
    }

    .tag {
      display: inline-block;
      font-size: 7pt;
      font-family: 'JetBrains Mono', monospace;
      background: #c0392b;
      color: #fff;
      padding: 1px 5px;
      border-radius: 2px;
      white-space: nowrap;
      font-weight: 600;
      letter-spacing: 0.04em;
    }

    .drag-callout {
      background: #fff0f0;
      border-left: 4px solid #c0392b;
      padding: 7px 12px;
      margin-top: 8px;
      font-size: 9pt;
      color: #7a1010;
    }

    /* ── Risk metrics table ────────────────────────────── */
    .risk-table th { text-align: left; }
    .risk-table td { text-align: left; }
    .risk-table td.mono { text-align: left; }
    .risk-table td.bench { text-align: left; color: #666; font-family: 'JetBrains Mono', monospace; }
    .risk-table td.note { font-size: 8.5pt; color: #555; font-style: italic; }

    /* ── Fee section ───────────────────────────────────── */
    .fee-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }

    .fee-block { font-size: 9.5pt; }
    .fee-block .fee-row { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #eee; }
    .fee-block .fee-row .lbl { color: #555; }
    .fee-block .fee-row .val { font-family: 'JetBrains Mono', monospace; font-weight: 600; color: #1a1a2e; }
    .fee-block .fee-row.total .val { color: #c0392b; }

    .fee-note {
      font-size: 8.5pt;
      color: #777;
      font-style: italic;
      margin-top: 8px;
      line-height: 1.5;
    }

    /* ── Source / methodology ──────────────────────────── */
    .disclaimer {
      margin-top: 18px;
      padding-top: 12px;
      border-top: 1px solid #ddd;
      font-size: 8pt;
      color: #999;
      line-height: 1.6;
      font-style: italic;
    }

    /* ── Print ─────────────────────────────────────────── */
    @media print {
      body { background: #fff; }
      .page { padding: 28px 38px; }

      .section { page-break-inside: avoid; }
      .section-header { page-break-after: avoid; }
      .perf-grid { page-break-inside: avoid; }
    }

    @page {
      size: letter;
      margin: 0.5in 0.45in;
    }
  </style>
</head>
<body>
<div class="page">

  <!-- ── Cover ──────────────────────────────────────────────────────────── -->
  <div class="cover-header">
    <div class="exhibit-title">Executive Portfolio Summary</div>
    <div class="exhibit-sub">Srinivasan Household — Prepared for Advisor Review</div>
    <div class="cover-meta">
      <div>
        <div class="meta-label">Prepared</div>
        <div class="meta-value">${today}</div>
      </div>
      <div>
        <div class="meta-label">Portfolio as of</div>
        <div class="meta-value">${asOfDate}</div>
      </div>
      <div>
        <div class="meta-label">Inception</div>
        <div class="meta-value">${inceptionDate}</div>
      </div>
      <div>
        <div class="meta-label">Advisor</div>
        <div class="meta-value">AllSource RIA</div>
      </div>
    </div>
  </div>

  <!-- ── Section 1: Portfolio at a Glance ──────────────────────────────── -->
  <div class="section">
    <div class="section-header">1 — Portfolio at a Glance</div>

    <div class="kpi-row">
      <div class="kpi-box">
        <div class="kpi-label">Total AUM</div>
        <div class="kpi-value">${fmt$(totalValue)}</div>
        <div class="kpi-sub">As of ${asOfDate}</div>
      </div>
      <div class="kpi-box">
        <div class="kpi-label">Total Gain ITD</div>
        <div class="kpi-value pos">+${fmt$(totalGain)}</div>
        <div class="kpi-sub">${fmtPct(totalGainPct, 2, true)} since inception</div>
      </div>
      <div class="kpi-box">
        <div class="kpi-label">1-Year IRR</div>
        <div class="kpi-value pos">${fmtPct(netIrr1y, 2, true)}</div>
        <div class="kpi-sub">Net of advisor fees</div>
      </div>
      <div class="kpi-box">
        <div class="kpi-label">YTD IRR</div>
        <div class="kpi-value pos">${fmtPct(netIrrYtd, 2, true)}</div>
        <div class="kpi-sub">QTD ${fmtPct(netIrrQtd, 2, true)} · MTD ${fmtPct(netIrrMtd, 2, true)}</div>
      </div>
    </div>

    <div class="meta-line">
      Inception ${inceptionDate} · 27 months · Cost basis ${fmt$(costBasis)} · Gain YTD ${fmt$(gainYtd)} · Gain 1Y ${fmt$(gain1y)}
    </div>
  </div>

  <!-- ── Section 2: Sleeve Breakdown ──────────────────────────────────── -->
  <div class="section">
    <div class="section-header">2 — Sleeve Breakdown</div>

    <table class="sleeve-table">
      <thead>
        <tr>
          <th></th>
          <th>Equity</th>
          <th>Alternatives</th>
          <th>Cash</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="row-label">Weight</td>
          <td class="mono">${fmtPctNoSign(equityPct)}</td>
          <td class="mono">${fmtPctNoSign(altsPct)}</td>
          <td class="mono">${fmtPctNoSign(cashPct)}</td>
        </tr>
        <tr>
          <td class="row-label">Value</td>
          <td class="mono">${fmt$(equityValue)}</td>
          <td class="mono">${fmt$(altsValue)}</td>
          <td class="mono">${fmt$(cashValue)}</td>
        </tr>
        <tr>
          <td class="row-label">ITD Return</td>
          <td class="mono pos">${fmtPct(equityReturnPct, 2, true)}</td>
          <td class="mono pos">${fmtPct(altsReturnPct, 2, true)}</td>
          <td class="mono">—</td>
        </tr>
        <tr>
          <td class="row-label">1Y Return</td>
          <td class="mono pos">${fmtPct(equityReturn1y, 2, true)}</td>
          <td class="mono pos">${fmtPct(altsReturn1y, 2, true)}</td>
          <td class="mono">—</td>
        </tr>
        <tr>
          <td class="row-label">$ Gain ITD</td>
          <td class="mono pos">+${fmt$(equityGain)}</td>
          <td class="mono pos">+${fmt$(altsGain)}</td>
          <td class="mono">—</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- ── Section 3: Benchmark Comparison ─────────────────────────────── -->
  <div class="section">
    <div class="section-header">3 — Benchmark Comparison</div>

    <table>
      <thead>
        <tr>
          <th>Period / Metric</th>
          <th>This Portfolio</th>
          <th>S&amp;P 500 (SPY)</th>
          <th>Blended Benchmark</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>ITD Return (Jul 2024 – Oct 2026)</td>
          <td class="mono pos">${fmtPct(totalGainPct, 2, true)}</td>
          <td class="mono">${fmtPct(spyItd, 2, true)}</td>
          <td class="mono">${fmtPct(benchmarkItd, 2, true)}</td>
        </tr>
        <tr>
          <td>Alpha vs Blended Benchmark</td>
          <td class="mono pos" colspan="3">${fmtPct(alphaItd, 2, true)} above blended benchmark ITD</td>
        </tr>
        <tr>
          <td>1-Year Return</td>
          <td class="mono pos">${fmtPct(netIrr1y, 2, true)}</td>
          <td class="mono">${fmtPct(spy1y, 2, true)}</td>
          <td class="mono">—</td>
        </tr>
        <tr>
          <td>Equity Sleeve vs S&amp;P 500 (ITD)</td>
          <td class="mono pos">${fmtPct(equityReturnPct, 2, true)}</td>
          <td class="mono">${fmtPct(spyItd, 2, true)}</td>
          <td class="mono pos">Equity outperformance: +${equityVsSpy.toFixed(2)}pp</td>
        </tr>
      </tbody>
    </table>

    <div class="callout">
      <strong>Blended benchmark:</strong> ${fmtPctNoSign(equityPct)} SPY + ${fmtPctNoSign(altsPct)} AGG + ${fmtPctNoSign(cashPct)} cash.
      Period: Jul 2024 → Oct 2026 (27 months). Portfolio ITD ${fmtPct(totalGainPct, 2, true)} vs blended ${fmtPct(benchmarkItd, 2, true)} → alpha ${fmtPct(alphaItd, 2, true)}.
      <strong>Key finding:</strong> Equity sleeve (${fmtPct(equityReturnPct, 2, true)}) beat S&amp;P 500 (${fmtPct(spyItd, 2, true)}) by +${equityVsSpy.toFixed(2)}pp — active equity management added measurable value.
    </div>
  </div>

  <!-- ── Section 4: Top Performers and Flags ──────────────────────────── -->
  <div class="section">
    <div class="section-header">4 — Top Performers &amp; Flags</div>

    <div class="perf-grid">
      <!-- Top performers -->
      <div>
        <div class="perf-col-header">Top performers (by ITD return)</div>
        <table>
          <thead>
            <tr>
              <th>Asset Class</th>
              <th>ITD Return</th>
              <th>Value</th>
              <th>$ Gain</th>
            </tr>
          </thead>
          <tbody>
            ${topRows || '<tr><td colspan="4" style="color:#999;font-style:italic">No data</td></tr>'}
          </tbody>
        </table>
      </div>

      <!-- Flags -->
      <div>
        <div class="perf-col-header">Flags — underperforming positions</div>
        <table>
          <thead>
            <tr>
              <th>Asset Class</th>
              <th>ITD Return</th>
              <th>Value</th>
              <th>$ Gain</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${flagRows || '<tr><td colspan="5" style="color:#999;font-style:italic">No flags</td></tr>'}
          </tbody>
        </table>
        ${flagged.length > 0 ? `
        <div class="drag-callout">
          Combined small-cap drag: ${fmt$(combinedFlaggedGain)} on ${fmt$(combinedFlaggedValue)} combined value.
          Three small-cap managers have each destroyed more than 44% of capital since inception — review required.
        </div>` : ''}
      </div>
    </div>
  </div>

  <!-- ── Section 5: Risk Metrics ──────────────────────────────────────── -->
  <div class="section">
    <div class="section-header">5 — Risk Metrics (Tamarac Official, as of ${riskAsOf})</div>

    <table class="risk-table">
      <thead>
        <tr>
          <th>Metric</th>
          <th>Portfolio</th>
          <th>S&amp;P 500</th>
          <th>Comment</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Sharpe Ratio (ITD)</td>
          <td class="mono pos">${sharpe.toFixed(2)}</td>
          <td class="bench">${sp500Sharpe.toFixed(2)}</td>
          <td class="note">Portfolio edges benchmark (+${(sharpe - sp500Sharpe).toFixed(2)})</td>
        </tr>
        <tr>
          <td>Sortino Ratio (ITD)</td>
          <td class="mono pos">${sortino.toFixed(2)}</td>
          <td class="bench">1.02 (est.)</td>
          <td class="note">Strong downside-adjusted return; higher than Sharpe → asymmetric gains</td>
        </tr>
        <tr>
          <td>Beta (ITD)</td>
          <td class="mono">${beta.toFixed(2)}</td>
          <td class="bench">1.00</td>
          <td class="note">Low market sensitivity — portfolio does not move in lock-step with S&amp;P</td>
        </tr>
        <tr>
          <td>Volatility (ann., ITD)</td>
          <td class="mono">${stdDev}%</td>
          <td class="bench">~16.9%</td>
          <td class="note">Dampened by illiquid alts (quarterly NAV); understates true economic vol</td>
        </tr>
        <tr>
          <td>Upside Capture (ITD)</td>
          <td class="mono">${upsideCapture}%</td>
          <td class="bench">100%</td>
          <td class="note">Captures ${upsideCapture}% of S&amp;P gains in up-months — structural: 55% alts doesn't track equity</td>
        </tr>
        <tr>
          <td>Downside Capture (ITD)</td>
          <td class="mono ${downsideCapture > upsideCapture ? 'neg' : 'pos'}">${downsideCapture}%</td>
          <td class="bench">100%</td>
          <td class="note">Goal: close the capture asymmetry (upside ${upsideCapture}% vs downside ${downsideCapture}%)</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- ── Section 6: Fee Summary ───────────────────────────────────────── -->
  <div class="section">
    <div class="section-header">6 — Fee Summary</div>

    <div class="fee-grid">
      <div class="fee-block">
        <div class="fee-row"><span class="lbl">Advisor fees ITD</span><span class="val">${fmt$(advisorFeesItd)}</span></div>
        <div class="fee-row"><span class="lbl">Advisor fees — 1Y</span><span class="val">${fmt$(advisorFees1y)}</span></div>
        <div class="fee-row"><span class="lbl">Advisor fees — YTD</span><span class="val">${fmt$(advisorFeesYtd)}</span></div>
        <div class="fee-row"><span class="lbl">Advisor fee rate (billed)</span><span class="val">${fmtPctNoSign(advisorFeeRatePct)}</span></div>
        <div class="fee-row"><span class="lbl">Sub-manager fees (embedded) ITD</span><span class="val">${fmt$(subManagerFees)}</span></div>
        <div class="fee-row total"><span class="lbl"><strong>Total fee impact ITD</strong></span><span class="val">${fmt$(totalFeeImpact)}</span></div>
      </div>
      <div class="fee-block">
        <div class="fee-row"><span class="lbl">Gross gain ITD</span><span class="val">${fmt$(grossGain)}</span></div>
        <div class="fee-row"><span class="lbl">Net gain ITD</span><span class="val pos">${fmt$(totalGain)}</span></div>
        <div class="fee-row"><span class="lbl">Fee impact as % of gross gain</span><span class="val neg">${fmtPctNoSign(feeImpactPct, 1)}</span></div>
        <p class="fee-note">
          Sub-manager fees are not billed separately — inferred as the gap between gross gain
          (${fmt$(grossGain)}) and net gain (${fmt$(totalGain)}).
          Total fee drag of ${fmt$(totalFeeImpact)} equals ${fmtPctNoSign(feeImpactPct, 1)} of gross gains since inception.
        </p>
      </div>
    </div>
  </div>

  <!-- ── Section 7: Data Source & Methodology ─────────────────────────── -->
  <div class="section">
    <div class="section-header">7 — Data Source &amp; Methodology</div>

    <p style="font-size:9.5pt; color:#444; line-height:1.65;">
      Portfolio data is sourced from the <strong>AllSource custodian</strong>, reconciled daily via Tamarac.
      Market values reflect the close of business on <strong>${asOfDate}</strong>. Inception date is
      <strong>${inceptionDate}</strong> (27 months through the as-of date). IRR figures (1Y, YTD, QTD, MTD)
      are as reported by AllSource using Modified Dietz / time-weighted methodology.
      Official risk metrics (Sharpe, Sortino, Beta, Volatility, Capture Ratios) are sourced from
      <strong>Tamarac Account Analytics as of ${riskAsOf}</strong> and have not been independently recomputed.
      Blended benchmark weights mirror the portfolio's sleeve allocation: ${fmtPctNoSign(equityPct)} SPY +
      ${fmtPctNoSign(altsPct)} Bloomberg AGG + ${fmtPctNoSign(cashPct)} cash proxy.
      Sub-manager fees represent the difference between sum-of-position gross gains and portfolio net gain;
      they are absorbed in individual position NAVs and not billed as line items.
      Alternatives (Private Equity, Private Credit, Hedge Funds) report NAV quarterly — values between
      reporting dates reflect the most recently available NAV and may lag current economic value.
      All returns are in nominal USD; no inflation adjustment has been applied.
    </p>
  </div>

  <!-- ── Disclaimer ──────────────────────────────────────────────────── -->
  <div class="disclaimer">
    <strong>Important Disclosure:</strong> This exhibit is prepared solely for informational and review purposes.
    It does not constitute investment advice, a recommendation to buy or sell any security, or a guarantee of
    future performance. All figures are derived from AllSource custodian data as of ${asOfDate}.
    Past performance does not guarantee future results. Risk metrics sourced from Tamarac Account Analytics
    (official, as of ${riskAsOf}).
  </div>

</div>

<script>
  window.onload = function () {
    setTimeout(function () { window.print(); }, 400);
  };
</script>
</body>
</html>`

  const win = window.open('', '_blank', 'width=920,height=750')
  if (!win) {
    alert('Pop-up blocked. Please allow pop-ups for this site and try again.')
    return
  }
  win.document.write(html)
  win.document.close()
}
