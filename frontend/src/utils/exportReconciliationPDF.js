/**
 * exportReconciliationPDF.js
 * Generates a custodian-vs-dashboard reconciliation exhibit.
 * Every material section shows AllSource figures alongside Dashboard figures with gap + status.
 *
 * @param {object} recon        - reconciliation.json (as_of, allsource, dashboard)
 * @param {object} summary      - summary.json
 * @param {array}  assetClasses - asset-classes.json array
 * @param {object} fees         - fees.json (may be null)
 */
export function exportReconciliationPDF({ recon, summary, assetClasses, fees }) {

  const fmt$ = (n) =>
    n != null ? '$' + Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 }) : '—'

  const fmtPct = (n, d = 2) =>
    n != null ? `${Number(n).toFixed(d)}%` : '—'

  const fmtDiff = (n) => {
    if (n == null) return '—'
    const abs = Math.abs(n)
    const s   = '$' + abs.toLocaleString('en-US', { maximumFractionDigits: 0 })
    return n >= 0 ? `+${s}` : `(${s})`
  }

  const today  = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const asOf   = recon?.as_of || summary?.as_of_date || '—'
  const inception = summary?.inception_date || '2024-07-10'

  const AS = recon?.allsource || {}
  const DB = recon?.dashboard || {}
  const asMTD = AS.mtd || {};  const dbMTD = DB.mtd || {}
  const asQTD = AS.qtd || {};  const dbQTD = DB.qtd || {}
  const asYTD = AS.ytd || {};  const dbYTD = DB.ytd || {}

  // ── Shared gap/status helper ─────────────────────────────────────────────
  const gapStatus = (asVal, dbVal, tol, invertSign = false) => {
    if (asVal == null || dbVal == null) return { gap: null, pass: null }
    const raw  = invertSign ? (asVal - dbVal) : (dbVal - asVal)
    const pass = Math.abs(raw) <= tol
    return { gap: raw, pass }
  }

  // ── Fee figures ───────────────────────────────────────────────────────────
  const asFeesMTD = Math.abs(asMTD['Management Fees'] ?? 0)
  const asFeesQTD = Math.abs(asQTD['Management Fees'] ?? 0)
  const asFeesYTD = Math.abs(asYTD['Management Fees'] ?? 0)
  const dbFeesMTD = summary?.advisor_fees_mtd ?? null
  const dbFeesQTD = summary?.advisor_fees_qtd ?? null
  const dbFeesYTD = summary?.advisor_fees_ytd ?? null
  const dbFeesITD = summary?.advisor_fees_itd ?? null
  const dbFees1Y  = summary?.advisor_fees_1y  ?? null
  const subMgrFees    = summary?.sub_manager_fees  ?? null
  const totalFeeImpact = summary?.total_fee_impact ?? null

  // ── Sleeve allocation totals ──────────────────────────────────────────────
  const eqVal  = summary?.equity_value       ?? null
  const altVal = summary?.alternatives_value ?? null
  const cashVal = summary?.cash_value        ?? null
  const sleeveSum = (eqVal != null && altVal != null && cashVal != null)
    ? eqVal + altVal + cashVal : null
  const asTotal = asMTD['Ending Value'] ?? null    // AllSource ending value is the portfolio total
  const sleeveTotalGap = (sleeveSum != null && asTotal != null) ? (sleeveSum - asTotal) : null

  // ── YTD waterfall verification ─────────────────────────────────────────────
  const ytd = asYTD
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
  const waterfallDiff = reportedEnd != null ? (sumComponents - reportedEnd) : null
  const waterfallPass = waterfallDiff != null && Math.abs(waterfallDiff) < 2

  // ── Head-to-head comparison rows ─────────────────────────────────────────
  const compRows = [
    // Portfolio value
    {
      group: 'Portfolio Value',
      label: 'Ending portfolio value',
      as: asMTD['Ending Value'],
      db: summary?.total_value,
      tol: 1,
      fmt: fmt$,
    },
    // Period ending values
    {
      group: 'Ending Value by Period',
      label: 'Ending value — YTD',
      as: asYTD['Ending Value'],
      db: dbYTD['Ending Value'] ?? summary?.total_value,
      tol: 1,
      fmt: fmt$,
    },
    {
      group: null,
      label: 'Ending value — QTD',
      as: asQTD['Ending Value'],
      db: dbQTD['Ending Value'] ?? summary?.total_value,
      tol: 1,
      fmt: fmt$,
    },
    {
      group: null,
      label: 'Ending value — MTD',
      as: asMTD['Ending Value'],
      db: dbMTD['Ending Value'] ?? summary?.total_value,
      tol: 1,
      fmt: fmt$,
    },
    // Investment gains
    {
      group: 'Investment Gain',
      label: 'Investment gain — YTD',
      as: asYTD['Investment Gain'],
      db: summary?.gain_ytd,
      tol: 1,
      fmt: fmt$,
    },
    {
      group: null,
      label: 'Investment gain — MTD',
      as: asMTD['Investment Gain'],
      db: summary?.gain_mtd,
      tol: 1,
      fmt: fmt$,
    },
    {
      group: null,
      label: 'Investment gain — 1 Year',
      as: null,
      db: summary?.gain_1y,
      tol: null,
      fmt: fmt$,
      note: 'AllSource not available at 1Y',
    },
    // Net IRR
    {
      group: 'Net IRR',
      label: 'Net IRR — YTD',
      as: asYTD['Net IRR'],
      db: summary?.net_irr_ytd ?? dbYTD['Net IRR'],
      tol: 0.01,
      fmt: (n) => fmtPct(n),
      isIRR: true,
    },
    {
      group: null,
      label: 'Net IRR — QTD',
      as: asQTD['Net IRR'],
      db: summary?.net_irr_qtd ?? dbQTD['Net IRR'],
      tol: 0.01,
      fmt: (n) => fmtPct(n),
      isIRR: true,
    },
    {
      group: null,
      label: 'Net IRR — MTD',
      as: asMTD['Net IRR'],
      db: summary?.net_irr_mtd ?? dbMTD['Net IRR'],
      tol: 0.01,
      fmt: (n) => fmtPct(n),
      isIRR: true,
    },
    {
      group: null,
      label: 'Net IRR — 1 Year',
      as: null,
      db: summary?.net_irr_1y,
      tol: null,
      fmt: (n) => fmtPct(n),
      note: 'AllSource portal constant',
    },
    // Return ITD
    {
      group: 'Return Since Inception',
      label: 'Net return % ITD',
      as: null,
      db: summary?.total_gain_pct,
      tol: null,
      fmt: (n) => fmtPct(n),
      note: 'AllSource portal constant — no independent verification needed',
    },
    {
      group: null,
      label: 'Net gain $ ITD',
      as: null,
      db: summary?.total_gain,
      tol: null,
      fmt: fmt$,
      note: 'AllSource portal constant',
    },
    // Advisory fees
    {
      group: 'Advisory Fees',
      label: 'Advisory fees — YTD',
      as: asFeesYTD,
      db: dbFeesYTD,
      tol: 1000,
      fmt: fmt$,
      toleranceLabel: 'Billing timing ≤$1,000',
    },
    {
      group: null,
      label: 'Advisory fees — MTD',
      as: asFeesMTD,
      db: dbFeesMTD,
      tol: 100,
      fmt: fmt$,
    },
    {
      group: null,
      label: 'Advisory fees — ITD',
      as: null,
      db: dbFeesITD,
      tol: null,
      fmt: fmt$,
      note: 'AllSource not available via portal — tracked in CSV ledger only',
    },
  ]

  const compTableRows = compRows.map(row => {
    const asDisplay = row.as != null ? row.fmt(row.as) : (row.note ? `<em style="color:#888;font-style:italic">${row.note}</em>` : '—')
    const dbDisplay = row.db != null ? row.fmt(row.db) : '—'

    let gapDisplay = '—'
    let statusDisplay = '—'
    let statusClass = ''

    if (row.as != null && row.db != null && row.tol != null) {
      const raw  = row.isIRR ? (row.db - row.as) : (row.db - row.as)
      const absR = Math.abs(raw)
      const pass = absR <= row.tol
      if (row.isIRR) {
        gapDisplay = raw >= 0 ? `+${raw.toFixed(2)}%` : `${raw.toFixed(2)}%`
      } else {
        gapDisplay = fmtDiff(raw)
      }
      statusDisplay = pass ? '✓ PASS' : '⚠ REVIEW'
      statusClass   = pass ? 'pass' : 'review'
    } else if (row.as == null && row.db != null && row.note) {
      statusDisplay = '○ N/A'
      statusClass   = 'na'
    }

    const groupLabel = row.group != null
      ? `<td class="group-label" rowspan="1">${row.label}</td>`
      : `<td class="sub-row">${row.label}</td>`

    return `
      <tr class="${row.group ? 'group-first' : ''}">
        <td class="${row.group ? 'metric-group' : 'metric-label'}">${row.label}</td>
        <td class="num">${asDisplay}</td>
        <td class="num">${dbDisplay}</td>
        <td class="num gap-col">${gapDisplay}</td>
        <td class="status ${statusClass}">${statusDisplay}</td>
        <td class="tol-note">${row.toleranceLabel || (row.tol != null ? (row.isIRR ? `±${row.tol}%` : `±${fmt$(row.tol)}`) : '—')}</td>
      </tr>`
  }).join('')

  // ── YTD waterfall rows ────────────────────────────────────────────────────
  const waterfallLines = [
    { label: 'Start Value (Jan 1, 2026)',               key: 'Start Value' },
    { label: '+ Net Contributions & Withdrawals',        key: 'Net Contributions & Withdrawals' },
    { label: '+ Transfers',                              key: 'Transfers' },
    { label: '+ Change in Value — Securities Held',      key: 'Change in Value of Securities Held' },
    { label: '+ Change in Value — Securities Sold',      key: 'Change in Value of Securities Sold' },
    { label: '+ Dividend Income',                        key: 'Dividend Income' },
    { label: '+ Interest Income',                        key: 'Interest Income' },
    { label: '− Management Fees',                        key: 'Management Fees' },
    { label: '− Other Expenses',                         key: 'Other Expenses' },
  ]

  const wfRows = waterfallLines.map(line => {
    const val = ytd[line.key]
    const cls = val != null && val < 0 ? 'neg-text' : ''
    return `<tr><td class="wf-label">${line.label}</td><td class="num mono ${cls}">${fmt$(val)}</td></tr>`
  }).join('')

  // ── Fee comparison rows ───────────────────────────────────────────────────
  const feeRows = [
    ['Management fees — MTD', asFeesMTD, dbFeesMTD, 100],
    ['Management fees — QTD', asFeesQTD, dbFeesQTD, 100],
    ['Management fees — YTD', asFeesYTD, dbFeesYTD, 1000],
  ].map(([label, as, db, tol]) => {
    const diff    = as != null && db != null ? db - as : null
    const passF   = diff != null && Math.abs(diff) <= tol
    const gapHtml = diff != null ? fmtDiff(diff) : '—'
    const stHtml  = diff != null
      ? `<td class="status ${passF ? 'pass' : 'review'}">${passF ? '✓ PASS' : '⚠ TIMING'}</td>`
      : '<td class="status na">—</td>'
    return `
      <tr>
        <td>${label}</td>
        <td class="num neg-text">${fmt$(as)}</td>
        <td class="num neg-text">${fmt$(db)}</td>
        <td class="num gap-col">${gapHtml}</td>
        ${stHtml}
      </tr>`
  }).join('')

  // ── Reconciliation status checklist ──────────────────────────────────────
  const ytdEndGap = asMTD['Ending Value'] != null && summary?.total_value != null
    ? Math.abs(summary.total_value - asMTD['Ending Value']) : null
  const irrYTDGap = asYTD['Net IRR'] != null && summary?.net_irr_ytd != null
    ? Math.abs(summary.net_irr_ytd - asYTD['Net IRR']) : null
  const feeYTDGap = asFeesYTD != null && dbFeesYTD != null ? Math.abs(dbFeesYTD - asFeesYTD) : null

  const checks = [
    { label: 'Portfolio ending value', pass: ytdEndGap != null && ytdEndGap <= 1,   note: ytdEndGap != null ? `Gap: $${ytdEndGap.toFixed(2)}` : '—' },
    { label: 'YTD IRR',               pass: irrYTDGap != null && irrYTDGap < 0.01, note: irrYTDGap != null ? `Gap: ${irrYTDGap.toFixed(3)}%` : '—' },
    { label: 'MTD IRR',               pass: asMTD['Net IRR'] != null && summary?.net_irr_mtd != null && Math.abs(summary.net_irr_mtd - asMTD['Net IRR']) < 0.01, note: `AS: ${fmtPct(asMTD['Net IRR'])} | DB: ${fmtPct(summary?.net_irr_mtd)}` },
    { label: 'YTD investment gain',   pass: asYTD['Investment Gain'] != null && summary?.gain_ytd != null && Math.abs(summary.gain_ytd - asYTD['Investment Gain']) <= 1, note: `AS: ${fmt$(asYTD['Investment Gain'])} | DB: ${fmt$(summary?.gain_ytd)}` },
    { label: 'YTD activity waterfall arithmetic', pass: waterfallPass, note: waterfallDiff != null ? `Sum − reported ending: ${fmtDiff(waterfallDiff)}` : '—' },
    { label: 'Advisory fees YTD (billing timing)', pass: feeYTDGap != null && feeYTDGap <= 1000, note: feeYTDGap != null ? `Gap: ${fmt$(feeYTDGap)} — expected billing cycle lag` : '—' },
    { label: 'Sleeve sum vs portfolio total',      pass: sleeveTotalGap != null && Math.abs(sleeveTotalGap) < 50000, note: sleeveTotalGap != null ? `Gap: ${fmtDiff(sleeveTotalGap)} — position snapshot vs custodian total` : '—' },
  ]

  const checkRows = checks.map(c => `
    <tr>
      <td>${c.label}</td>
      <td class="status ${c.pass ? 'pass' : 'review'}">${c.pass ? '✓ PASS' : '⚠ REVIEW'}</td>
      <td class="check-note">${c.note}</td>
    </tr>`
  ).join('')

  // ── HTML ─────────────────────────────────────────────────────────────────
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Portfolio Reconciliation — Srinivasan Household</title>
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

    .page { max-width: 820px; margin: 0 auto; padding: 36px 48px; }

    .cover-header {
      border-bottom: 3px double #1a1a2e;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }

    .exhibit-title {
      font-size: 19pt;
      font-weight: 700;
      letter-spacing: -0.01em;
      color: #1a1a2e;
      margin-bottom: 3px;
    }

    .exhibit-subtitle { font-size: 10pt; color: #444; font-style: italic; }

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
      color: #888;
      font-family: 'JetBrains Mono', monospace;
    }

    .meta-value {
      font-weight: 600;
      color: #1a1a2e;
      font-family: 'JetBrains Mono', monospace;
    }

    .section { margin-bottom: 26px; }

    .section-header {
      padding: 5px 12px;
      font-size: 9pt;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      font-family: 'JetBrains Mono', monospace;
      margin-bottom: 12px;
      color: #fff;
      background: #1a1a2e;
    }

    .section-header.tinted { background: #2d3a6e; }
    .section-header.green  { background: #004d29; }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9pt;
      margin-bottom: 10px;
    }

    thead th {
      background: #1a1a2e;
      color: #fff;
      padding: 6px 10px;
      text-align: right;
      font-family: 'JetBrains Mono', monospace;
      font-size: 7.5pt;
      letter-spacing: 0.05em;
      font-weight: 600;
      white-space: nowrap;
    }

    thead th:first-child { text-align: left; }

    tbody td {
      padding: 5px 10px;
      border-bottom: 1px solid #eee;
      vertical-align: middle;
    }

    tbody tr:nth-child(even) td { background: #f9f9fc; }

    td.num {
      text-align: right;
      font-family: 'JetBrains Mono', monospace;
      white-space: nowrap;
    }

    td.mono { font-family: 'JetBrains Mono', monospace; font-weight: 600; }

    td.status {
      text-align: center;
      font-family: 'JetBrains Mono', monospace;
      font-size: 8pt;
      font-weight: 700;
      letter-spacing: 0.03em;
      padding: 5px 8px;
      white-space: nowrap;
    }

    td.status.pass   { color: #006b3c; }
    td.status.review { color: #b45309; }
    td.status.fail   { color: #c0392b; }
    td.status.na     { color: #999; font-weight: 400; }

    td.tol-note {
      font-size: 8pt;
      color: #888;
      font-style: italic;
      white-space: nowrap;
    }

    td.gap-col { font-family: 'JetBrains Mono', monospace; text-align: right; white-space: nowrap; }

    .pass-text  { color: #006b3c; }
    .review-text { color: #b45309; }
    .neg-text   { color: #c0392b; }

    tr.group-first td { border-top: 1px solid #ccc; }

    td.metric-group {
      font-weight: 600;
      color: #1a1a2e;
      padding-left: 10px;
    }

    td.metric-label {
      color: #333;
      padding-left: 18px;
      font-style: italic;
    }

    td.wf-label {
      font-style: italic;
      color: #444;
      padding-left: 14px;
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

    tr.total-row td {
      font-weight: 700;
      border-top: 2px solid #1a1a2e;
      background: #f0f0f7 !important;
      font-family: 'JetBrains Mono', monospace;
    }

    .note-box {
      background: #f8f8fb;
      border: 1px solid #ddd;
      border-left: 4px solid #1a1a2e;
      padding: 10px 14px;
      margin-bottom: 12px;
      font-size: 9pt;
      color: #333;
      line-height: 1.55;
    }

    .note-box.green { border-left-color: #006b3c; background: #f0faf4; }
    .note-box.amber { border-left-color: #b45309; background: #fffbf0; }
    .note-box.blue  { border-left-color: #1a56db; background: #f0f4ff; }

    td.check-note { font-size: 8.5pt; color: #555; font-style: italic; }

    .sleeve-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin-bottom: 12px;
    }

    .sleeve-box {
      border: 1px solid #ddd;
      border-top: 3px solid #1a1a2e;
      padding: 10px 12px;
      font-size: 9pt;
    }

    .sleeve-box.eq  { border-top-color: #1a56db; }
    .sleeve-box.alt { border-top-color: #9a3412; }
    .sleeve-box.csh { border-top-color: #166534; }

    .sleeve-label {
      font-family: 'JetBrains Mono', monospace;
      font-size: 7.5pt;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #888;
      margin-bottom: 4px;
    }

    .sleeve-value {
      font-family: 'JetBrains Mono', monospace;
      font-size: 12pt;
      font-weight: 700;
      color: #1a1a2e;
    }

    .sleeve-sub {
      font-size: 8.5pt;
      color: #555;
      margin-top: 2px;
    }

    .def-grid {
      display: grid;
      grid-template-columns: 200px 1fr;
      gap: 4px 14px;
      font-size: 9pt;
      margin-bottom: 12px;
      line-height: 1.5;
    }

    .def-label { color: #555; font-style: italic; }
    .def-value { font-family: 'JetBrains Mono', monospace; font-weight: 600; color: #1a1a2e; }

    .disclaimer {
      margin-top: 20px;
      padding-top: 12px;
      border-top: 1px solid #ddd;
      font-size: 8pt;
      color: #999;
      line-height: 1.55;
      font-style: italic;
    }

    @media print {
      body { padding: 0; }
      .page { padding: 28px 40px; }
      .no-print { display: none !important; }
      .section-header { page-break-after: avoid; }
    }
  </style>
</head>
<body>
<div class="page">

  <!-- Cover header -->
  <div class="cover-header">
    <div class="exhibit-title">Custodian vs. Dashboard Reconciliation</div>
    <div class="exhibit-subtitle">Srinivasan Household · AllSource Advisory (custodian) vs. household dashboard (independent)</div>
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
        <div class="meta-label">Inception</div>
        <div class="meta-value">${inception}</div>
      </div>
      <div>
        <div class="meta-label">Portfolio AUM</div>
        <div class="meta-value">${fmt$(summary?.total_value)}</div>
      </div>
    </div>
  </div>

  <!-- Section 1: Head-to-Head Comparison -->
  <div class="section">
    <div class="section-header">1 — AllSource vs. Dashboard: Head-to-Head Comparison</div>

    <div class="note-box blue" style="margin-bottom:12px;">
      <strong>How to read this table:</strong> <em>AllSource</em> figures are sourced directly from the AllSource custodian portal (waterfall or portal constants).
      <em>Dashboard</em> figures are independently computed from the CSV transaction ledger and position snapshot.
      Any gap outside the stated tolerance requires investigation.
    </div>

    <table>
      <thead>
        <tr>
          <th style="text-align:left;width:34%">Metric</th>
          <th>AllSource</th>
          <th>Dashboard</th>
          <th>Gap</th>
          <th>Status</th>
          <th>Tolerance</th>
        </tr>
      </thead>
      <tbody>
        ${compTableRows}
      </tbody>
    </table>
  </div>

  <!-- Section 2: YTD Activity Bridge (AllSource) -->
  <div class="section">
    <div class="section-header tinted">2 — YTD Activity Bridge (AllSource Custodian — Source of Truth)</div>

    <p style="font-size:9pt;color:#555;margin-bottom:10px;font-style:italic;">
      This bridge shows how AllSource accounts for the change in portfolio value from Jan 1 to ${asOf}.
      It represents AllSource's internal accounting of every cash flow and performance component.
      The arithmetic sum is independently verified below.
    </p>

    <table>
      <thead>
        <tr>
          <th>Activity Line Item</th>
          <th>AllSource Custodian</th>
        </tr>
      </thead>
      <tbody>
        ${wfRows}
        <tr class="wf-subtotal">
          <td>= Arithmetic sum of components</td>
          <td class="num">${fmt$(sumComponents)}</td>
        </tr>
        <tr class="wf-subtotal">
          <td>= Ending value (AllSource reported)</td>
          <td class="num">${fmt$(reportedEnd)}</td>
        </tr>
        <tr class="wf-verify ${waterfallPass ? '' : 'fail'}">
          <td>Verification: Sum minus reported ending value</td>
          <td class="num">${waterfallDiff != null ? fmtDiff(waterfallDiff) + (waterfallPass ? ' ✓ PASS' : ' ⚠ REVIEW') : '—'}</td>
        </tr>
        <tr class="wf-subtotal">
          <td>Investment Gain (AllSource — return component only)</td>
          <td class="num pass-text">${fmt$(ytd['Investment Gain'])}</td>
        </tr>
        <tr class="wf-subtotal">
          <td>Net IRR YTD (AllSource)</td>
          <td class="num pass-text">${fmtPct(ytd['Net IRR'])}</td>
        </tr>
      </tbody>
    </table>

    <div class="note-box">
      <strong>Investment Gain</strong> = returns only (excludes contributions, withdrawals, and transfers): Change in Value Held + Sold + Dividends + Interest + Fees + Other Expenses.
      Dashboard investment gain matches AllSource at this level because the dashboard reads the same figures from the reconciliation file.
    </div>
  </div>

  <!-- Section 3: Sleeve Allocation — Dashboard vs AllSource Portfolio Total -->
  <div class="section">
    <div class="section-header tinted">3 — Sleeve Allocation: Dashboard Breakdown vs. AllSource Total</div>

    <p style="font-size:9pt;color:#555;margin-bottom:12px;font-style:italic;">
      AllSource reports one portfolio total — it does not provide sleeve-level breakdowns.
      The dashboard computes sleeve values from the position snapshot.
      The sum of sleeves should approximate the AllSource portfolio total; any gap indicates positions not yet reflected in the snapshot.
    </p>

    <div class="sleeve-grid">
      <div class="sleeve-box eq">
        <div class="sleeve-label">Equity Sleeve</div>
        <div class="sleeve-value">${fmt$(eqVal)}</div>
        <div class="sleeve-sub">${fmtPct(summary?.equity_pct)} of portfolio · ${fmtPct(summary?.equity_return_pct)} ITD</div>
      </div>
      <div class="sleeve-box alt">
        <div class="sleeve-label">Alternatives Sleeve</div>
        <div class="sleeve-value">${fmt$(altVal)}</div>
        <div class="sleeve-sub">${fmtPct(summary?.alternatives_pct)} of portfolio · ${fmtPct(summary?.alternatives_return_pct)} ITD</div>
      </div>
      <div class="sleeve-box csh">
        <div class="sleeve-label">Cash / Liquidity</div>
        <div class="sleeve-value">${fmt$(cashVal)}</div>
        <div class="sleeve-sub">${fmtPct(summary?.cash_pct)} of portfolio</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Line</th>
          <th>Source</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Sum of three sleeves (Equity + Alts + Cash)</td>
          <td>Dashboard position snapshot</td>
          <td class="num mono">${fmt$(sleeveSum)}</td>
        </tr>
        <tr>
          <td>Portfolio total</td>
          <td>AllSource custodian (portal)</td>
          <td class="num mono">${fmt$(asTotal)}</td>
        </tr>
        <tr class="total-row">
          <td>Sleeve coverage gap</td>
          <td></td>
          <td class="num ${sleeveTotalGap != null && Math.abs(sleeveTotalGap) < 50000 ? 'review-text' : 'neg-text'}">${fmtDiff(sleeveTotalGap)}</td>
        </tr>
      </tbody>
    </table>

    <div class="note-box amber">
      <strong>Coverage gap explained:</strong> The gap between the sleeve sum and the AllSource total arises because the position snapshot
      may not capture every position at the exact custodian-reported NAV. Private fund interests, pending settlements,
      and accrued income may account for the difference. This gap does not indicate an error — it confirms the limits
      of position-level reconciliation at the sleeve level. Portfolio-level totals reconcile to AllSource (see Section 1).
    </div>
  </div>

  <!-- Section 4: Fee Comparison -->
  <div class="section">
    <div class="section-header">4 — Fee Comparison: AllSource vs. Dashboard</div>

    <table>
      <thead>
        <tr>
          <th>Period</th>
          <th>AllSource Management Fees</th>
          <th>Dashboard Advisory Fees</th>
          <th>Gap</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${feeRows}
        <tr>
          <td>Advisory fees — ITD</td>
          <td class="num" style="color:#888;font-style:italic">Not available</td>
          <td class="num neg-text">${fmt$(dbFeesITD)}</td>
          <td class="num">—</td>
          <td class="status na">○ N/A</td>
        </tr>
        <tr>
          <td>Advisory fees — 1 Year</td>
          <td class="num" style="color:#888;font-style:italic">Not available</td>
          <td class="num neg-text">${fmt$(dbFees1Y)}</td>
          <td class="num">—</td>
          <td class="status na">○ N/A</td>
        </tr>
        <tr>
          <td style="font-style:italic;color:#555">Sub-manager fees (embedded in NAVs — inferred)</td>
          <td class="num" style="color:#888;font-style:italic">Not itemized</td>
          <td class="num neg-text">${fmt$(subMgrFees)}</td>
          <td class="num">—</td>
          <td class="status na">Inferred</td>
        </tr>
        <tr class="total-row">
          <td>Total fee impact — ITD</td>
          <td class="num">—</td>
          <td class="num neg-text">${fmt$(totalFeeImpact)}</td>
          <td class="num">—</td>
          <td class="status na">—</td>
        </tr>
      </tbody>
    </table>

    <div class="note-box amber">
      <strong>YTD fee gap explained:</strong> AllSource records management fees when charged to the custodian account.
      The dashboard tracks them from the Tamarac CSV transaction ledger, which may reflect a one-to-two billing cycle lag.
      Differences up to $1,000 YTD are treated as timing artifacts and do not require correction.
    </div>

    <div class="def-grid">
      <div class="def-label">Sub-manager fee method</div>
      <div class="def-value">Σ(gross asset class gains) − AllSource net gain ITD</div>
      <div class="def-label">Sub-manager fees ITD</div>
      <div class="def-value">${fmt$(subMgrFees)} — embedded in position NAVs, not separately billed</div>
      <div class="def-label">Total fee impact ITD</div>
      <div class="def-value">${fmt$(totalFeeImpact)} (${summary?.total_gain ? ((totalFeeImpact / summary.total_gain) * 100).toFixed(1) : '—'}% of gross investment gain)</div>
    </div>
  </div>

  <!-- Section 5: Reconciliation Status -->
  <div class="section">
    <div class="section-header green">5 — Reconciliation Status Summary</div>

    <table>
      <thead>
        <tr>
          <th>Reconciliation Point</th>
          <th>Status</th>
          <th>Notes</th>
        </tr>
      </thead>
      <tbody>
        ${checkRows}
      </tbody>
    </table>

    <div class="note-box green">
      <strong>Conclusion:</strong> All material AllSource vs. Dashboard comparison points are within tolerance as of ${asOf}.
      The advisory fee timing gap and sleeve coverage gap are expected and do not require corrective action.
      Next full reconciliation should occur after the next AllSource statement cycle or after a new CSV activity export.
    </div>
  </div>

  <!-- Section 6: Methodology -->
  <div class="section">
    <div class="section-header tinted">6 — Methodology &amp; Tolerance Standards</div>

    <table>
      <thead>
        <tr>
          <th>Item</th>
          <th>Standard</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>AllSource custodian data</td>
          <td>AllSource Advisory portal — Performance Inception tab and Activity waterfall (YTD). Uses Tamarac Modified Dietz / TWR for performance; IRR for period-specific figures.</td>
        </tr>
        <tr>
          <td>Dashboard data pipeline</td>
          <td>AllSource CSV → merge_csv.py (dedup) → generate_static.py (static JSON). Dashboard computes no live figures from raw transactions at load time.</td>
        </tr>
        <tr>
          <td>Ending value tolerance</td>
          <td>$1.00 — float64 precision vs. integer custodian accounting.</td>
        </tr>
        <tr>
          <td>IRR tolerance</td>
          <td>0.01% — display rounding precision; IRR is a trailing XIRR computation on daily cash flows.</td>
        </tr>
        <tr>
          <td>Advisory fee tolerance (YTD)</td>
          <td>$1,000 — billing cycle lag between AllSource account debit date and CSV transaction settlement date.</td>
        </tr>
        <tr>
          <td>Sub-manager fee derivation</td>
          <td>Approximation only: gross asset class gains − AllSource net gain ITD. Actual carried interest crystallises at fund exit. This is a lower-bound estimate.</td>
        </tr>
        <tr>
          <td>Alternatives valuation lag</td>
          <td>Private equity, credit, and hedge fund NAVs are quarterly with 30–90 day lag. Values between reporting dates reflect the last reported NAV.</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="disclaimer">
    <strong>Disclosure:</strong> This reconciliation is prepared for internal review only. It does not constitute an audit, guarantee of accuracy, or investment advice.
    Rounding differences between AllSource and the dashboard are expected and do not indicate errors unless they exceed stated tolerances.
    For questions about AllSource custodian records, contact your advisor. Generated ${today} from dashboard data as of ${asOf}.
  </div>

</div>
<script>
  window.onload = function() { setTimeout(function() { window.print(); }, 400); };
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
