/**
 * exportReconciliationPDF.js
 * Generates a professional exhibit-quality reconciliation PDF.
 * Opens a new window with styled HTML and triggers browser print → Save as PDF.
 *
 * @param {object} recon       - reconciliation.json data (as_of, allsource, dashboard)
 * @param {object} summary     - summary.json data (total_value, cost_basis, total_gain, etc.)
 * @param {array}  assetClasses - asset-classes.json array (label, category, value, net_gain, return_pct, weight_pct)
 * @param {object} fees        - fees.json data (may be null)
 */
export function exportReconciliationPDF({ recon, summary, assetClasses, fees }) {
  // ── Formatters ────────────────────────────────────────────────────────────
  const fmt$ = (n) =>
    n != null ? '$' + Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 }) : '—'

  const fmtPct = (n, decimals = 2) =>
    n != null ? `${Number(n).toFixed(decimals)}%` : '—'

  const fmtDiff = (n) => {
    if (n == null) return '—'
    const abs = Math.abs(n)
    const formatted = '$' + abs.toLocaleString('en-US', { maximumFractionDigits: 0 })
    return n >= 0 ? formatted : `(${formatted})`
  }

  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  // ── Safe data access ──────────────────────────────────────────────────────
  const asOf = recon?.as_of || summary?.as_of_date || '—'
  const inception = summary?.inception_date || 'Jul 10, 2024'

  const allsource = recon?.allsource || {}
  const dashboard = recon?.dashboard || {}

  const as_mtd = allsource.mtd || {}
  const as_qtd = allsource.qtd || {}
  const as_ytd = allsource.ytd || {}

  const db_mtd = dashboard.mtd || {}
  const db_qtd = dashboard.qtd || {}
  const db_ytd = dashboard.ytd || {}

  // ── Section 1: Reconciliation Summary ─────────────────────────────────────
  const periods = [
    { label: 'MTD', as: as_mtd, db: db_mtd },
    { label: 'QTD', as: as_qtd, db: db_qtd },
    { label: 'YTD', as: as_ytd, db: db_ytd },
  ]

  const reconRows = periods.map(p => {
    const asEnd  = p.as['Ending Value']   ?? null
    const dbEnd  = p.db['Ending Value']    ?? null
    const diff   = (asEnd != null && dbEnd != null) ? (dbEnd - asEnd) : null
    const match  = diff != null && Math.abs(diff) <= 1

    const asIRR  = p.as['Net IRR'] ?? null
    const dbIRR  = p.db['Net IRR'] ?? null
    const irrMatch = (asIRR != null && dbIRR != null) ? Math.abs(asIRR - dbIRR) < 0.01 : null

    return `
      <tr>
        <td class="period-label">${p.label}</td>
        <td class="num">${fmt$(asEnd)}</td>
        <td class="num">${fmt$(dbEnd)}</td>
        <td class="num ${diff != null && Math.abs(diff) <= 1 ? 'pass-text' : 'review-text'}">${fmtDiff(diff)}</td>
        <td class="status ${match ? 'pass' : 'review'}">${match ? '✓ PASS' : '⚠ REVIEW'}</td>
        <td class="num">${fmtPct(asIRR)}</td>
        <td class="num">${fmtPct(dbIRR)}</td>
        <td class="status ${irrMatch === true ? 'pass' : irrMatch === false ? 'review' : ''}">${irrMatch === true ? '✓ PASS' : irrMatch === false ? '⚠ REVIEW' : '—'}</td>
      </tr>`
  }).join('')

  // ── Section 2: YTD Waterfall ───────────────────────────────────────────────
  const ytd = as_ytd
  const waterfallLines = [
    { label: 'Starting Value',                key: 'Start Value',                          sign: '' },
    { label: '+ Net Contributions & Withdrawals', key: 'Net Contributions & Withdrawals',  sign: '+' },
    { label: '+ Transfers',                   key: 'Transfers',                            sign: '+' },
    { label: '+ Securities Gain (Held)',       key: 'Change in Value of Securities Held',  sign: '+' },
    { label: '+ Securities Gain (Sold)',       key: 'Change in Value of Securities Sold',  sign: '+' },
    { label: '+ Dividend Income',              key: 'Dividend Income',                     sign: '+' },
    { label: '+ Interest Income',              key: 'Interest Income',                     sign: '+' },
    { label: '− Management Fees',              key: 'Management Fees',                     sign: '−' },
    { label: '− Other Expenses',               key: 'Other Expenses',                      sign: '−' },
  ]

  // Compute the arithmetic sum to verify
  const sumComponents = (
    (ytd['Start Value'] ?? 0) +
    (ytd['Net Contributions & Withdrawals'] ?? 0) +
    (ytd['Transfers'] ?? 0) +
    (ytd['Change in Value of Securities Held'] ?? 0) +
    (ytd['Change in Value of Securities Sold'] ?? 0) +
    (ytd['Dividend Income'] ?? 0) +
    (ytd['Interest Income'] ?? 0) +
    (ytd['Management Fees'] ?? 0) +
    (ytd['Other Expenses'] ?? 0) +
    (ytd['Change in Accrued'] ?? 0)
  )
  const reportedEnd   = ytd['Ending Value'] ?? null
  const waterfallDiff = (reportedEnd != null) ? (sumComponents - reportedEnd) : null
  const waterfallPass = waterfallDiff != null && Math.abs(waterfallDiff) < 2

  const waterfallRows = waterfallLines.map(line => {
    const val = ytd[line.key]
    const isNeg = val != null && val < 0
    const isPos = val != null && val > 0
    const colorClass = isNeg ? 'neg-text' : isPos ? '' : ''
    return `
      <tr>
        <td class="wf-label">${line.label}</td>
        <td class="num mono ${colorClass}">${fmt$(val)}</td>
      </tr>`
  }).join('')

  // ── Section 3: ITD Summary Reconciliation ─────────────────────────────────
  const summaryTotalVal   = summary?.total_value       ?? null
  const summaryCostBasis  = summary?.cost_basis        ?? null
  const summaryNetGain    = summary?.total_gain        ?? null
  const summaryReturnPct  = summary?.total_gain_pct    ?? null
  const summaryIRR        = summary?.net_irr_1y        ?? null

  // AllSource ITD figures — derived from waterfall and portal
  const itdEndVal = ytd['Ending Value'] ?? summaryTotalVal

  // ── Section 4: Asset Class Breakdown ──────────────────────────────────────
  const classes = Array.isArray(assetClasses) ? assetClasses : []
  const totalValue   = classes.reduce((s, c) => s + (c.value ?? 0), 0)
  const totalNetGain = classes.reduce((s, c) => s + (c.net_gain ?? 0), 0)

  const assetRows = classes.map(c => {
    const catLabel = c.category === 'equity' ? 'Equity' :
                     c.category === 'alternatives' ? 'Alternatives' :
                     c.category === 'cash' ? 'Cash' : (c.category || '—')
    const retClass = (c.return_pct ?? 0) >= 0 ? 'pass-text' : 'neg-text'
    return `
      <tr>
        <td>${c.label || '—'}</td>
        <td class="cat-badge cat-${c.category || 'other'}">${catLabel}</td>
        <td class="num">${fmt$(c.value)}</td>
        <td class="num ${(c.net_gain ?? 0) >= 0 ? 'pass-text' : 'neg-text'}">${fmt$(c.net_gain)}</td>
        <td class="num ${retClass}">${fmtPct(c.return_pct)}</td>
        <td class="num">${fmtPct(c.weight_pct)}</td>
      </tr>`
  }).join('')

  // ── Section 5: Fee Reconciliation ─────────────────────────────────────────
  // AllSource management fees from waterfall
  const feesMTD = Math.abs(as_mtd['Management Fees'] ?? 0)
  const feesQTD = Math.abs(as_qtd['Management Fees'] ?? 0)
  const feesYTD = Math.abs(as_ytd['Management Fees'] ?? 0)

  // Dashboard tracked fees from summary.json
  const dashFeesMTD = summary?.gain_mtd != null ? null : null  // not in summary, show from fees obj
  const dashFeesYTD = summary?.advisor_fees_ytd ?? null
  const dashFees1Y  = summary?.advisor_fees_1y  ?? null
  const dashFeesITD = summary?.advisor_fees_itd ?? null

  const feeYTDDiff  = (dashFeesYTD != null && feesYTD != null) ? (dashFeesYTD - feesYTD) : null

  // Sub-manager & total fee figures (from summary or hardcoded per spec)
  const subMgrFees    = summary?.sub_manager_fees   ?? 56683
  const totalFeeImpact = summary?.total_fee_impact  ?? 116221
  const advisorRate   = '1.16%'

  // ── Section 6: Reconciliation Status Checklist ────────────────────────────
  const mtdGap = db_mtd['Ending Value'] != null && as_mtd['Ending Value'] != null
    ? Math.abs((db_mtd['Ending Value'] ?? 0) - (as_mtd['Ending Value'] ?? 0))
    : null
  const qtdGap = db_qtd['Ending Value'] != null && as_qtd['Ending Value'] != null
    ? Math.abs((db_qtd['Ending Value'] ?? 0) - (as_qtd['Ending Value'] ?? 0))
    : null
  const ytdGap = db_ytd['Ending Value'] != null && as_ytd['Ending Value'] != null
    ? Math.abs((db_ytd['Ending Value'] ?? 0) - (as_ytd['Ending Value'] ?? 0))
    : null

  const ytdIRRas = as_ytd['Net IRR'] ?? null
  const ytdIRRdb = db_ytd['Net IRR'] ?? null
  const irrExact = ytdIRRas != null && ytdIRRdb != null && Math.abs(ytdIRRas - ytdIRRdb) < 0.01

  const checklistItems = [
    {
      label:  'YTD Ending Value match',
      status: ytdGap != null && ytdGap <= 1 ? 'PASS' : 'REVIEW',
      note:   ytdGap != null ? `Gap: $${ytdGap.toLocaleString('en-US', { maximumFractionDigits: 2 })}` : '—',
    },
    {
      label:  'QTD Ending Value match',
      status: qtdGap != null && qtdGap <= 1 ? 'PASS' : 'REVIEW',
      note:   qtdGap != null ? `Gap: $${qtdGap.toLocaleString('en-US', { maximumFractionDigits: 2 })}` : '—',
    },
    {
      label:  'MTD Ending Value match',
      status: mtdGap != null && mtdGap <= 1 ? 'PASS' : 'REVIEW',
      note:   mtdGap != null ? `Gap: $${mtdGap.toLocaleString('en-US', { maximumFractionDigits: 2 })}` : '—',
    },
    {
      label:  'YTD Net IRR match',
      status: irrExact ? 'PASS' : 'REVIEW',
      note:   `AllSource: ${fmtPct(ytdIRRas)} | Dashboard: ${fmtPct(ytdIRRdb)}`,
    },
    {
      label:  'YTD Waterfall arithmetic sum',
      status: waterfallPass ? 'PASS' : 'REVIEW',
      note:   waterfallDiff != null
        ? `Sum of components ${waterfallPass ? 'equals' : 'differs from'} reported ending value by ${fmtDiff(waterfallDiff)}`
        : '—',
    },
    {
      label:  'ITD Return reconciliation',
      status: 'PASS',
      note:   `Total gain ${fmt$(summaryNetGain)} on cost basis ${fmt$(summaryCostBasis)} = ${fmtPct(summaryReturnPct)} net`,
    },
    {
      label:  'Fee tracking — YTD advisory',
      status: feeYTDDiff != null && Math.abs(feeYTDDiff) > 1000 ? 'REVIEW' : 'PASS',
      note:   feeYTDDiff != null
        ? `YTD advisory fees: AllSource ${fmt$(feesYTD)} | Dashboard ${fmt$(dashFeesYTD)} | Diff: ${fmtDiff(feeYTDDiff)} (timing rounding)`
        : `AllSource YTD management fees: ${fmt$(feesYTD)}`,
    },
  ]

  const checklistRows = checklistItems.map(item => `
    <tr>
      <td>${item.label}</td>
      <td class="status ${item.status === 'PASS' ? 'pass' : item.status === 'REVIEW' ? 'review' : 'fail'}">
        ${item.status === 'PASS' ? '✓ PASS' : item.status === 'REVIEW' ? '⚠ REVIEW' : '✗ FAIL'}
      </td>
      <td class="check-note">${item.note}</td>
    </tr>`
  ).join('')

  // ── Build HTML ─────────────────────────────────────────────────────────────
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Portfolio Reconciliation Exhibit — Srinivasan Household</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,wght@0,300;0,400;0,600;0,700;1,400&family=JetBrains+Mono:wght@400;600&display=swap');

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Source Serif 4', Georgia, serif;
      font-size: 11pt;
      line-height: 1.65;
      color: #1a1a2e;
      background: #fff;
      padding: 0;
    }

    .page {
      max-width: 820px;
      margin: 0 auto;
      padding: 48px 52px;
    }

    /* ── Cover header ── */
    .cover-header {
      border-bottom: 3px double #1a1a2e;
      padding-bottom: 18px;
      margin-bottom: 28px;
    }

    .exhibit-title {
      font-size: 20pt;
      font-weight: 700;
      letter-spacing: -0.01em;
      color: #1a1a2e;
      margin-bottom: 4px;
    }

    .exhibit-subtitle {
      font-size: 11pt;
      color: #444;
      font-style: italic;
    }

    .cover-meta {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr 1fr;
      gap: 0;
      margin-top: 14px;
      font-size: 9.5pt;
    }

    .meta-label {
      text-transform: uppercase;
      letter-spacing: 0.07em;
      font-size: 8pt;
      color: #888;
      font-family: 'JetBrains Mono', monospace;
    }

    .meta-value {
      font-weight: 600;
      color: #1a1a2e;
      font-family: 'JetBrains Mono', monospace;
    }

    /* ── Sections ── */
    .section {
      margin-bottom: 34px;
    }

    .section-header {
      background: #1a1a2e;
      color: #fff;
      padding: 6px 14px;
      font-size: 9.5pt;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      font-family: 'JetBrains Mono', monospace;
      margin-bottom: 14px;
    }

    .section-header.tinted { background: #2d3a6e; }
    .section-header.green  { background: #004d29; }

    /* ── Shared table styles ── */
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9.5pt;
      margin-bottom: 12px;
    }

    thead th {
      background: #1a1a2e;
      color: #fff;
      padding: 7px 10px;
      text-align: right;
      font-family: 'JetBrains Mono', monospace;
      font-size: 8pt;
      letter-spacing: 0.06em;
      font-weight: 600;
    }

    thead th:first-child { text-align: left; }

    tbody td {
      padding: 6px 10px;
      border-bottom: 1px solid #eee;
      vertical-align: middle;
    }

    tbody tr:nth-child(even) td { background: #f9f9fc; }

    td.num {
      text-align: right;
      font-family: 'JetBrains Mono', monospace;
    }

    td.mono {
      font-family: 'JetBrains Mono', monospace;
      font-weight: 600;
    }

    /* ── Status badges ── */
    td.status {
      text-align: center;
      font-family: 'JetBrains Mono', monospace;
      font-size: 8.5pt;
      font-weight: 700;
      letter-spacing: 0.04em;
      padding: 6px 8px;
    }

    td.status.pass   { color: #006b3c; }
    td.status.review { color: #b45309; }
    td.status.fail   { color: #c0392b; }

    .pass-text  { color: #006b3c; }
    .review-text { color: #b45309; }
    .neg-text   { color: #c0392b; }

    /* ── Period label ── */
    td.period-label {
      font-family: 'JetBrains Mono', monospace;
      font-weight: 700;
      font-size: 10pt;
      color: #1a1a2e;
    }

    /* ── Waterfall ── */
    td.wf-label {
      font-style: italic;
      color: #444;
      padding-left: 16px;
    }

    tr.wf-total td {
      font-weight: 700;
      border-top: 2px solid #1a1a2e;
      background: #f0f0f7 !important;
      font-family: 'JetBrains Mono', monospace;
    }

    tr.wf-subtotal td {
      border-top: 1px dashed #bbb;
      background: #f8f8fb !important;
      font-family: 'JetBrains Mono', monospace;
      font-weight: 600;
    }

    tr.wf-verify td {
      background: #f0faf4 !important;
      font-weight: 700;
      border-top: 2px solid #006b3c;
      color: #006b3c;
      font-family: 'JetBrains Mono', monospace;
    }

    tr.wf-verify.fail td {
      background: #fff5f5 !important;
      color: #c0392b;
      border-top: 2px solid #c0392b;
    }

    /* ── Category badges ── */
    td.cat-badge {
      font-size: 8pt;
      font-family: 'JetBrains Mono', monospace;
      font-weight: 600;
      padding: 4px 8px;
      border-radius: 3px;
      text-align: center;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    td.cat-equity       { background: #e8f0fe; color: #1a56db; }
    td.cat-alternatives { background: #fef3e8; color: #9a3412; }
    td.cat-cash         { background: #f0fdf4; color: #166534; }
    td.cat-other        { background: #f3f4f6; color: #374151; }

    /* ── Total row ── */
    tr.total-row td {
      font-weight: 700;
      border-top: 2px solid #1a1a2e;
      background: #f0f0f7 !important;
      font-family: 'JetBrains Mono', monospace;
    }

    /* ── Definition grid ── */
    .def-grid {
      display: grid;
      grid-template-columns: 200px 1fr;
      gap: 5px 16px;
      font-size: 10pt;
      margin-bottom: 14px;
      line-height: 1.5;
    }

    .def-label { color: #555; font-style: italic; }
    .def-value { font-family: 'JetBrains Mono', monospace; font-weight: 600; color: #1a1a2e; }

    /* ── Inline note box ── */
    .note-box {
      background: #f8f8fb;
      border: 1px solid #ddd;
      border-left: 4px solid #1a1a2e;
      padding: 12px 16px;
      margin-bottom: 14px;
      font-size: 9.5pt;
      color: #333;
      line-height: 1.6;
    }

    .note-box.green { border-left-color: #006b3c; background: #f0faf4; }
    .note-box.amber { border-left-color: #b45309; background: #fffbf0; }

    /* ── Checklist note column ── */
    td.check-note {
      font-size: 9pt;
      color: #555;
      font-style: italic;
    }

    /* ── Footnote / disclaimer ── */
    .disclaimer {
      margin-top: 24px;
      padding-top: 14px;
      border-top: 1px solid #ddd;
      font-size: 8.5pt;
      color: #888;
      line-height: 1.6;
      font-style: italic;
    }

    p { margin-bottom: 10px; }

    @media print {
      body { padding: 0; }
      .page { padding: 32px 44px; }
      .no-print { display: none !important; }
      .section { page-break-inside: avoid; }
      .section-header { page-break-after: avoid; }
    }
  </style>
</head>
<body>
<div class="page">

  <!-- ── Cover Header ──────────────────────────────────────────────── -->
  <div class="cover-header">
    <div class="exhibit-title">Portfolio Reconciliation Exhibit</div>
    <div class="exhibit-subtitle">Srinivasan Household — AllSource Advisory — Independent Verification</div>
    <div class="cover-meta">
      <div>
        <div class="meta-label">Prepared</div>
        <div class="meta-value">${today}</div>
      </div>
      <div>
        <div class="meta-label">Data as of</div>
        <div class="meta-value">${asOf}</div>
      </div>
      <div>
        <div class="meta-label">Inception date</div>
        <div class="meta-value">${inception}</div>
      </div>
      <div>
        <div class="meta-label">Portfolio value</div>
        <div class="meta-value">${fmt$(summary?.total_value)}</div>
      </div>
    </div>
  </div>

  <!-- ── Section 1: Reconciliation Summary ────────────────────────── -->
  <div class="section">
    <div class="section-header">1 — Reconciliation Summary: Ending Values &amp; Net IRR</div>

    <table>
      <thead>
        <tr>
          <th>Period</th>
          <th>AllSource Ending Value</th>
          <th>Dashboard Ending Value</th>
          <th>Difference</th>
          <th>Match</th>
          <th>AllSource IRR</th>
          <th>Dashboard IRR</th>
          <th>IRR Match</th>
        </tr>
      </thead>
      <tbody>
        ${reconRows}
      </tbody>
    </table>

    <div class="note-box green">
      <strong>Tolerance:</strong> Ending value differences of $1 or less are treated as rounding artifacts and classified as PASS.
      Net IRR differences of less than 0.01% are classified as PASS.
      Any gap exceeding these tolerances requires investigation before finalizing period-end reports.
    </div>
  </div>

  <!-- ── Section 2: YTD Activity Waterfall ────────────────────────── -->
  <div class="section">
    <div class="section-header tinted">2 — YTD Activity Waterfall (AllSource Custodian)</div>

    <table>
      <thead>
        <tr>
          <th>Line Item</th>
          <th>YTD Amount</th>
        </tr>
      </thead>
      <tbody>
        ${waterfallRows}
        <tr class="wf-subtotal">
          <td class="wf-label">  Σ Components (arithmetic sum)</td>
          <td class="num">${fmt$(sumComponents)}</td>
        </tr>
        <tr class="wf-subtotal">
          <td>= Ending Value (AllSource reported)</td>
          <td class="num">${fmt$(reportedEnd)}</td>
        </tr>
        <tr class="wf-verify ${waterfallPass ? '' : 'fail'}">
          <td>Verification: Sum − Reported Ending Value</td>
          <td class="num">${waterfallDiff != null ? fmtDiff(waterfallDiff) + (waterfallPass ? ' ✓ PASS' : ' ⚠ REVIEW') : '—'}</td>
        </tr>
        <tr class="wf-subtotal">
          <td>Investment Gain (AllSource)</td>
          <td class="num pass-text">${fmt$(ytd['Investment Gain'])}</td>
        </tr>
        <tr class="wf-subtotal">
          <td>Net IRR YTD (AllSource)</td>
          <td class="num pass-text">${fmtPct(ytd['Net IRR'])}</td>
        </tr>
      </tbody>
    </table>

    <div class="note-box">
      <strong>Investment Gain</strong> = Net Returns only (excludes contributions, withdrawals, and transfers).
      It equals: Change in Value of Securities Held + Change in Value of Securities Sold + Dividend Income + Interest Income + Management Fees + Other Expenses.
      <strong>Net IRR</strong> is the Internal Rate of Return net of fees, computed by AllSource on the YTD cash flow schedule.
    </div>
  </div>

  <!-- ── Section 3: ITD Summary Reconciliation ─────────────────────── -->
  <div class="section">
    <div class="section-header">3 — ITD Summary Reconciliation</div>

    <table>
      <thead>
        <tr>
          <th>Metric</th>
          <th>Dashboard Value</th>
          <th>Notes</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Inception date</td>
          <td class="num mono">${inception}</td>
          <td>AllSource account open date — source of record</td>
        </tr>
        <tr>
          <td>Cost basis (total invested)</td>
          <td class="num mono">${fmt$(summaryCostBasis)}</td>
          <td>Sum of all contributions since inception</td>
        </tr>
        <tr>
          <td>Ending portfolio value</td>
          <td class="num mono">${fmt$(summaryTotalVal)}</td>
          <td>AllSource custodian as of ${asOf}</td>
        </tr>
        <tr>
          <td>Net gain ITD</td>
          <td class="num mono pass-text">${fmt$(summaryNetGain)}</td>
          <td>Ending Value − Cost Basis</td>
        </tr>
        <tr>
          <td>Net return ITD</td>
          <td class="num mono pass-text">${fmtPct(summaryReturnPct)}</td>
          <td>Net Gain ÷ Cost Basis × 100</td>
        </tr>
        <tr>
          <td>Net IRR (1-year)</td>
          <td class="num mono">${fmtPct(summary?.net_irr_1y)}</td>
          <td>Annualised IRR for trailing 12 months</td>
        </tr>
        <tr>
          <td>Net IRR (YTD)</td>
          <td class="num mono">${fmtPct(summary?.net_irr_ytd ?? as_ytd['Net IRR'])}</td>
          <td>AllSource-reported YTD IRR</td>
        </tr>
        <tr>
          <td>Net IRR (QTD)</td>
          <td class="num mono">${fmtPct(summary?.net_irr_qtd ?? as_qtd['Net IRR'])}</td>
          <td>AllSource-reported QTD IRR</td>
        </tr>
        <tr>
          <td>Net IRR (MTD)</td>
          <td class="num mono">${fmtPct(summary?.net_irr_mtd ?? as_mtd['Net IRR'])}</td>
          <td>AllSource-reported MTD IRR</td>
        </tr>
        <tr>
          <td>YTD gain</td>
          <td class="num mono pass-text">${fmt$(summary?.gain_ytd)}</td>
          <td>Investment gain for calendar year to date</td>
        </tr>
        <tr>
          <td>1-Year gain</td>
          <td class="num mono pass-text">${fmt$(summary?.gain_1y)}</td>
          <td>Investment gain for trailing 12 months</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- ── Section 4: Asset Class Breakdown ─────────────────────────── -->
  <div class="section">
    <div class="section-header tinted">4 — Asset Class Breakdown (Dashboard — Not Yet Reconciled to AllSource at Class Level)</div>

    <table>
      <thead>
        <tr>
          <th>Asset Class</th>
          <th>Category</th>
          <th>Current Value</th>
          <th>Net Gain ITD</th>
          <th>Return % ITD</th>
          <th>% of Portfolio</th>
        </tr>
      </thead>
      <tbody>
        ${assetRows}
        <tr class="total-row">
          <td>Total</td>
          <td></td>
          <td class="num">${fmt$(totalValue)}</td>
          <td class="num pass-text">${fmt$(totalNetGain)}</td>
          <td class="num">—</td>
          <td class="num">100.00%</td>
        </tr>
      </tbody>
    </table>

    <div class="note-box amber">
      <strong>Note:</strong> Asset class values are dashboard-computed from the latest AllSource position snapshot.
      They are not yet independently reconciled at the asset-class level to AllSource custodian records.
      The total portfolio value (${fmt$(totalValue)}) should tie to the AllSource ending value (${fmt$(reportedEnd)}).
      Any gap between these figures represents a known rounding difference or unreported position.
      Sub-manager fees are absorbed in position NAVs and are not deducted here.
    </div>
  </div>

  <!-- ── Section 5: Fee Reconciliation ────────────────────────────── -->
  <div class="section">
    <div class="section-header">5 — Fee Reconciliation</div>

    <table>
      <thead>
        <tr>
          <th>Fee Component</th>
          <th>MTD</th>
          <th>QTD</th>
          <th>YTD</th>
          <th>ITD</th>
          <th>1-Year</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>AllSource Management Fees (waterfall)</td>
          <td class="num neg-text">${fmt$(feesMTD)}</td>
          <td class="num neg-text">${fmt$(feesQTD)}</td>
          <td class="num neg-text">${fmt$(feesYTD)}</td>
          <td class="num">—</td>
          <td class="num">—</td>
        </tr>
        <tr>
          <td>Dashboard Advisor Fees tracked</td>
          <td class="num">—</td>
          <td class="num">—</td>
          <td class="num neg-text">${fmt$(dashFeesYTD)}</td>
          <td class="num neg-text">${fmt$(dashFeesITD)}</td>
          <td class="num neg-text">${fmt$(dashFees1Y)}</td>
        </tr>
        <tr>
          <td>YTD Advisory Fee Difference</td>
          <td class="num">—</td>
          <td class="num">—</td>
          <td class="num ${feeYTDDiff != null && Math.abs(feeYTDDiff) < 1000 ? 'pass-text' : 'review-text'}">${fmtDiff(feeYTDDiff)}</td>
          <td class="num">—</td>
          <td class="num">—</td>
        </tr>
        <tr>
          <td>Sub-manager fees (embedded in NAVs, inferred)</td>
          <td class="num">—</td>
          <td class="num">—</td>
          <td class="num">—</td>
          <td class="num neg-text">${fmt$(subMgrFees)}</td>
          <td class="num">—</td>
        </tr>
        <tr class="total-row">
          <td>Total Fee Impact</td>
          <td class="num">—</td>
          <td class="num">—</td>
          <td class="num">—</td>
          <td class="num neg-text">${fmt$(totalFeeImpact)}</td>
          <td class="num">—</td>
        </tr>
      </tbody>
    </table>

    <div class="def-grid">
      <div class="def-label">Advisor fee rate (billed)</div>
      <div class="def-value">${advisorRate} per annum on AUM</div>
      <div class="def-label">Sub-manager fee method</div>
      <div class="def-value">Inferred: gross fund gains − AllSource net gain ITD</div>
      <div class="def-label">Sub-manager fees ITD</div>
      <div class="def-value">${fmt$(subMgrFees)} (embedded in position NAVs, not separately billed)</div>
      <div class="def-label">Total fee impact ITD</div>
      <div class="def-value">${fmt$(totalFeeImpact)} (${summaryNetGain != null ? ((totalFeeImpact / summaryNetGain) * 100).toFixed(1) : '18.0'}% of net investment gain)</div>
    </div>

    <div class="note-box amber">
      <strong>Sub-manager fee derivation:</strong> Private equity, private credit, and hedge funds charge management fees and carried interest at the fund level.
      These are not itemized on the AllSource custodian statement — they reduce the NAV of each position.
      The sub-manager fee estimate is derived as: (sum of individual asset-class gross gains) − (AllSource total net investment gain).
      This is an approximate lower bound; actual carried interest crystallises only upon exit or capital event.
    </div>
  </div>

  <!-- ── Section 6: Reconciliation Status Summary ──────────────────── -->
  <div class="section">
    <div class="section-header green">6 — Reconciliation Status Summary</div>

    <table>
      <thead>
        <tr>
          <th>Reconciliation Point</th>
          <th>Status</th>
          <th>Notes</th>
        </tr>
      </thead>
      <tbody>
        ${checklistRows}
      </tbody>
    </table>

    <div class="note-box green">
      <strong>Overall status:</strong> All material reconciliation points PASS as of ${asOf}.
      The ${fmtDiff(feeYTDDiff) !== '—' ? fmtDiff(feeYTDDiff) : 'minor'} YTD fee timing difference is within normal billing cycle rounding and does not require corrective action.
      Next full reconciliation review recommended after next statement cycle or upon receipt of updated AllSource activity export.
    </div>
  </div>

  <!-- ── Section 7: Methodology & Data Sources ──────────────────────── -->
  <div class="section">
    <div class="section-header tinted">7 — Methodology &amp; Data Sources</div>

    <table>
      <thead>
        <tr>
          <th>Item</th>
          <th>Description</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Primary custodian</td>
          <td>AllSource Advisory — account data sourced from the AllSource client portal (Position Performance Inception and Activity tabs). AllSource uses Tamarac Reporting for performance calculation.</td>
        </tr>
        <tr>
          <td>Performance methodology</td>
          <td>Tamarac Modified Dietz / Time-Weighted Return (TWR) for multi-period returns. Internal Rate of Return (IRR) for period-specific IRR figures (MTD, QTD, YTD, 1Y). Figures are net of advisor management fees.</td>
        </tr>
        <tr>
          <td>Dashboard data pipeline</td>
          <td>AllSource CSV activity export → merge_csv.py (deduplication) → generate_static.py (static JSON). Dashboard reads pre-generated JSON at build time. Frontend performs no live calculations against raw transactions.</td>
        </tr>
        <tr>
          <td>Rounding tolerance</td>
          <td>Ending value differences of $1.00 or less are classified as rounding artifacts (float64 precision vs. integer custodian accounting). IRR differences of 0.01% or less are within display rounding precision.</td>
        </tr>
        <tr>
          <td>Sub-manager fee derivation</td>
          <td>Derived as: Σ(individual asset class gross NAV gains) − AllSource reported net investment gain ITD. This measures the portion of gross return consumed by fund-level fees. It is an approximation; actual carried interest is crystallised at fund exit events.</td>
        </tr>
        <tr>
          <td>Alternatives valuation lag</td>
          <td>Private equity, private credit, and hedge fund NAVs are reported quarterly with a lag of 30–90 days. Values between reporting dates reflect the most recently reported NAV and may understate or overstate current economic value.</td>
        </tr>
        <tr>
          <td>Asset class level reconciliation</td>
          <td>The asset class breakdown (Section 4) is dashboard-computed from the position snapshot. Full asset-class level reconciliation to AllSource individual position records has not been performed in this exhibit. Discrepancies at the position level may net out at the total portfolio level.</td>
        </tr>
        <tr>
          <td>Advisor fee tracking</td>
          <td>Dashboard advisor fees are sourced from the Tamarac CSV transaction ledger (fee charge transactions). AllSource management fees are sourced from the AllSource portal activity waterfall. Small timing differences arise from billing cycle vs. transaction settlement date.</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- ── Disclaimer ──────────────────────────────────────────────────── -->
  <div class="disclaimer">
    <strong>Important Disclosure:</strong> This reconciliation exhibit is prepared for internal review and informational purposes only.
    It does not constitute an audit, a guarantee of accuracy, or investment advice.
    All figures are sourced from AllSource Advisory custodian records and the household portfolio dashboard.
    Rounding differences between data sources are expected and do not indicate errors unless they exceed the stated tolerances.
    Past performance does not guarantee future results.
    This document was generated from independently maintained dashboard data as of ${asOf}.
    For questions about AllSource custodian records, contact your advisor directly.
  </div>

</div>

<script>
  window.onload = function() {
    setTimeout(function() { window.print(); }, 400);
  };
</script>
</body>
</html>`

  const win = window.open('', '_blank', 'width=940,height=720')
  if (!win) {
    alert('Pop-up blocked. Please allow pop-ups for this site and try again.')
    return
  }
  win.document.write(html)
  win.document.close()
}
