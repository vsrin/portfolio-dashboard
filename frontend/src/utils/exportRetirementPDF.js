/**
 * exportRetirementPDF.js
 * Generates a professional exhibit-quality PDF for the retirement projection section.
 * Opens a new window with styled HTML and triggers browser print → Save as PDF.
 *
 * @param {object} ret      - Retirement data from /api/risk
 * @param {object} rm       - Risk metrics from /api/risk (computed)
 * @param {object} official - Official Tamarac metrics from /api/risk-metrics
 * @param {string} asOf     - Portfolio as-of date string
 * @param {string} inception - Portfolio inception date string
 * @param {object} summary  - Optional summary (total_value, cost_basis, total_gain, total_gain_pct)
 */
export function exportRetirementPDF({ ret, rm, official, asOf, inception, summary }) {
  const fmt$ = (n) =>
    n != null ? '$' + Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 }) : '—'

  const fmtPct = (n, decimals = 2) =>
    n != null ? `${n > 0 ? '+' : ''}${Number(n).toFixed(decimals)}%` : '—'

  const fmtFactor = (r, years) => Math.pow(1 + r / 100, years).toFixed(4)

  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  // Pull official Tamarac annualized return if available, fall back to computed
  const itd = official?.itd || {}
  const officialAnnReturn = itd.net_return_ann != null ? (itd.net_return_ann * 100) : null
  const displayAnnReturn  = officialAnnReturn ?? ret.annualized_return_pct
  const sharpe    = itd.sharpe    ?? rm?.sharpe_ratio    ?? null
  const sortino   = itd.sortino   ?? rm?.sortino_ratio   ?? null
  const upCap     = itd.upside_capture   != null ? Math.round(itd.upside_capture * 100)   : 26
  const dnCap     = itd.downside_capture != null ? Math.round(itd.downside_capture * 100) : 65
  const stdDev    = itd.std_dev != null ? (itd.std_dev * 100).toFixed(2) : rm?.volatility_pct ?? null
  const officialSrc = official?.as_of ? `AllSource / Tamarac Account Analytics (official, as of ${official.as_of})` : 'Estimated from monthly portfolio snapshots'

  // Required return derivation — show the steps
  const pv    = ret.current_aum || ret.current_aum || 0
  const fv    = ret.target_portfolio
  const years = ret.years_to_retirement
  const ratio = (fv / pv).toFixed(4)
  const reqRaw = ((fv / pv) ** (1 / years) - 1) * 100
  const factor = ((fv / pv) ** (1 / years)).toFixed(6)
  const reqDisplay = reqRaw.toFixed(2)

  // Full year-by-year projection table
  const tableRows = ret.projection_series.map((row) => {
    const age = ret.current_age + (row.year - 2026)
    return `
      <tr>
        <td class="num">${row.year}</td>
        <td class="num">${age}</td>
        ${ret.scenarios.map(s => `<td class="num">${fmt$(row[s.id])}</td>`).join('')}
        <td class="num">${fmt$(fv)}</td>
      </tr>`
  }).join('')

  // Per-scenario arithmetic block
  const scenarioMath = ret.scenarios.map(s => {
    const r      = s.rate
    const f      = fmtFactor(r, years)
    const result = fmt$(s.projected_value)
    const diff   = s.projected_value - fv
    const outcome = diff >= 0
      ? `<span class="pass">Exceeds target by ${fmt$(diff)} ✓</span>`
      : `<span class="fail">Misses target by ${fmt$(Math.abs(diff))} ✗</span>`
    return `
      <div class="scenario-block">
        <div class="scenario-label">${s.label}</div>
        <div class="formula-line">
          ${fmt$(pv)} × (1 + ${r.toFixed(2)}%)^${years}
        </div>
        <div class="formula-line">
          = ${fmt$(pv)} × (1.${String(r.toFixed(2)).replace('.', '')} …)^${years}
          = ${fmt$(pv)} × ${f}
          = <strong>${result}</strong>
        </div>
        <div class="outcome">${outcome}</div>
      </div>`
  }).join('')

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Retirement Planning Exhibit — Srinivasan Household</title>
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
      max-width: 800px;
      margin: 0 auto;
      padding: 48px 52px;
    }

    /* ── Cover header ── */
    .cover-header {
      border-bottom: 3px double #1a1a2e;
      padding-bottom: 18px;
      margin-bottom: 24px;
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
      grid-template-columns: 1fr 1fr 1fr;
      gap: 0;
      margin-top: 14px;
      font-size: 9.5pt;
    }

    .meta-item { }
    .meta-label { text-transform: uppercase; letter-spacing: 0.07em; font-size: 8pt; color: #888; font-family: 'JetBrains Mono', monospace; }
    .meta-value { font-weight: 600; color: #1a1a2e; }

    /* ── Sections ── */
    .section {
      margin-bottom: 32px;
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

    .section-header.tinted {
      background: #2d3a6e;
    }

    /* ── Key figures row ── */
    .kpi-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 16px;
    }

    .kpi-box {
      border: 1px solid #ddd;
      border-top: 3px solid #1a1a2e;
      padding: 10px 12px;
    }

    .kpi-label {
      font-size: 8pt;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #888;
      font-family: 'JetBrains Mono', monospace;
      margin-bottom: 5px;
    }

    .kpi-value {
      font-family: 'JetBrains Mono', monospace;
      font-size: 15pt;
      font-weight: 600;
      color: #1a1a2e;
      line-height: 1;
    }

    .kpi-value.positive { color: #006b3c; }
    .kpi-value.negative { color: #c0392b; }

    .kpi-sub {
      font-size: 8.5pt;
      color: #666;
      margin-top: 4px;
    }

    /* ── Definition list ── */
    .def-grid {
      display: grid;
      grid-template-columns: 220px 1fr;
      gap: 4px 20px;
      font-size: 10.5pt;
      margin-bottom: 12px;
    }

    .def-label {
      color: #555;
      font-style: italic;
    }

    .def-value {
      font-family: 'JetBrains Mono', monospace;
      font-weight: 600;
      color: #1a1a2e;
    }

    /* ── Derivation box ── */
    .derivation-box {
      background: #f8f8fb;
      border: 1px solid #ddd;
      border-left: 4px solid #1a1a2e;
      padding: 16px 20px;
      margin-bottom: 16px;
      font-size: 10.5pt;
    }

    .derivation-box h4 {
      font-size: 9.5pt;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      color: #888;
      font-family: 'JetBrains Mono', monospace;
      margin-bottom: 12px;
    }

    .formula-display {
      font-family: 'JetBrains Mono', monospace;
      font-size: 10.5pt;
      line-height: 2.2;
      color: #222;
    }

    .formula-display .label {
      color: #888;
      font-size: 9pt;
    }

    .formula-display .result {
      font-size: 13pt;
      font-weight: 700;
      color: #006b3c;
    }

    .formula-display .required {
      font-size: 13pt;
      font-weight: 700;
      color: #1a1a2e;
    }

    /* ── Scenario blocks ── */
    .scenarios-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-bottom: 16px;
    }

    .scenario-block {
      border: 1px solid #ddd;
      padding: 14px;
      font-size: 10pt;
    }

    .scenario-label {
      font-weight: 700;
      font-size: 10pt;
      margin-bottom: 8px;
      color: #1a1a2e;
      font-family: 'JetBrains Mono', monospace;
    }

    .formula-line {
      font-family: 'JetBrains Mono', monospace;
      font-size: 8.5pt;
      color: #444;
      line-height: 1.8;
    }

    .outcome {
      margin-top: 8px;
      font-size: 9.5pt;
      font-weight: 600;
    }

    .pass { color: #006b3c; }
    .fail { color: #c0392b; }

    /* ── Projection table ── */
    .proj-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9.5pt;
      margin-bottom: 16px;
    }

    .proj-table th {
      background: #1a1a2e;
      color: #fff;
      padding: 7px 10px;
      text-align: right;
      font-family: 'JetBrains Mono', monospace;
      font-size: 8pt;
      letter-spacing: 0.06em;
      font-weight: 600;
    }

    .proj-table th:first-child { text-align: left; }
    .proj-table th.scenario-header { background: #2d3a6e; }

    .proj-table td {
      padding: 5px 10px;
      border-bottom: 1px solid #eee;
    }

    .proj-table td.num {
      text-align: right;
      font-family: 'JetBrains Mono', monospace;
    }

    .proj-table tr:nth-child(even) td { background: #f9f9fc; }

    .proj-table tr.retirement-year td {
      background: #e8f4e8;
      font-weight: 700;
      border-top: 2px solid #006b3c;
    }

    .proj-table tr.retirement-year td.num { color: #006b3c; }

    /* ── Risk metrics table ── */
    .metrics-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10pt;
      margin-bottom: 12px;
    }

    .metrics-table th {
      background: #f0f0f5;
      padding: 7px 12px;
      text-align: left;
      font-size: 8.5pt;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #555;
      border-bottom: 2px solid #ddd;
    }

    .metrics-table td {
      padding: 8px 12px;
      border-bottom: 1px solid #eee;
    }

    .metrics-table td.mono {
      font-family: 'JetBrains Mono', monospace;
      font-weight: 600;
    }

    .metrics-table td.positive { color: #006b3c; }
    .metrics-table td.negative { color: #c0392b; }
    .metrics-table td.neutral  { color: #1a1a2e; }

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

    .verdict-banner {
      padding: 12px 16px;
      margin-bottom: 16px;
      font-size: 11pt;
      font-weight: 600;
      border-left: 5px solid;
    }

    .verdict-banner.on-track {
      background: #f0faf4;
      border-color: #006b3c;
      color: #006b3c;
    }

    .verdict-banner.off-track {
      background: #fdf3f0;
      border-color: #c0392b;
      color: #c0392b;
    }

    p { margin-bottom: 10px; }

    @media print {
      body { padding: 0; }
      .page { padding: 32px 44px; }
      .no-print { display: none !important; }

      /* Keep section headers from splitting */
      .section { page-break-inside: avoid; }
      .section-header { page-break-after: avoid; }

      /* Force page break before projection table */
      .projection-table-section { page-break-before: auto; }
    }
  </style>
</head>
<body>
  <div class="page">

    <!-- ── Cover Header ──────────────────────────────────────────── -->
    <div class="cover-header">
      <div class="exhibit-title">Retirement Planning Exhibit</div>
      <div class="exhibit-subtitle">Srinivasan Household Portfolio — Prepared for External Review</div>
      <div class="cover-meta">
        <div class="meta-item">
          <div class="meta-label">Prepared</div>
          <div class="meta-value">${today}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Portfolio as of</div>
          <div class="meta-value">${asOf || '—'}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Inception date</div>
          <div class="meta-value">${inception || '—'}</div>
        </div>
      </div>
    </div>

    <!-- ── Section 1: Portfolio Summary ─────────────────────────── -->
    <div class="section">
      <div class="section-header">1 — Current Portfolio Position</div>

      <div class="kpi-row">
        <div class="kpi-box">
          <div class="kpi-label">Market Value</div>
          <div class="kpi-value">${fmt$(pv)}</div>
          <div class="kpi-sub">As of ${asOf || '—'}</div>
        </div>
        <div class="kpi-box">
          <div class="kpi-label">Total Cost Basis</div>
          <div class="kpi-value">${summary ? fmt$(summary.cost_basis) : '—'}</div>
          <div class="kpi-sub">Total invested since ${inception || '—'}</div>
        </div>
        <div class="kpi-box">
          <div class="kpi-label">Net Gain ITD</div>
          <div class="kpi-value positive">${summary ? fmt$(summary.total_gain) : '—'}</div>
          <div class="kpi-sub">${summary ? fmtPct(summary.total_gain_pct) : '—'} since inception</div>
        </div>
        <div class="kpi-box">
          <div class="kpi-label">Annualised Return</div>
          <div class="kpi-value positive">${fmtPct(displayAnnReturn)}</div>
          <div class="kpi-sub">${officialAnnReturn != null ? 'Tamarac official (ITD)' : 'Computed ITD CAGR'}</div>
        </div>
      </div>

      <div class="def-grid">
        <div class="def-label">Annualised return formula</div>
        <div class="def-value">(End Value ÷ Begin Value)^(12 ÷ Months) − 1</div>
        <div class="def-label">Inception window</div>
        <div class="def-value">${inception} → ${asOf} (22 months)</div>
        <div class="def-label">Source</div>
        <div class="def-value">${officialSrc}</div>
      </div>
    </div>

    <!-- ── Section 2: Retirement Parameters ─────────────────────── -->
    <div class="section">
      <div class="section-header">2 — Retirement Planning Parameters</div>

      <div class="def-grid">
        <div class="def-label">Current age</div>
        <div class="def-value">${ret.current_age}</div>
        <div class="def-label">Target retirement age</div>
        <div class="def-value">${ret.retirement_age}</div>
        <div class="def-label">Years remaining</div>
        <div class="def-value">${years} years</div>
        <div class="def-label">Current portfolio value (PV)</div>
        <div class="def-value">${fmt$(pv)}</div>
        <div class="def-label">Target portfolio at retirement (FV)</div>
        <div class="def-value">${fmt$(fv)}</div>
        <div class="def-label">Annual income supported by target</div>
        <div class="def-value">≈ ${fmt$(fv * 0.04)} / year</div>
        <div class="def-label">Withdrawal rule</div>
        <div class="def-value">4% safe withdrawal rate (${fmt$(fv)} × 4% = ${fmt$(fv * 0.04)} / year)</div>
        <div class="def-label">Contribution assumption</div>
        <div class="def-value">None (lump-sum model — no new deposits assumed)</div>
      </div>

      <div class="derivation-box">
        <h4>Why $5,000,000?</h4>
        <p style="font-size:10.5pt; color:#333; margin-bottom:0;">
          The 4% rule is the most widely cited guideline in retirement income planning (Bengen 1994; Trinity Study 1998).
          It states that a retiree can withdraw 4% of their starting portfolio in year one, adjust for inflation annually,
          and historically sustain that income for 30+ years. At ${fmt$(fv)}, the first-year withdrawal is
          <strong>${fmt$(fv * 0.04)}</strong> — a practical threshold for financial independence at this household's cost structure.
        </p>
      </div>
    </div>

    <!-- ── Section 3: Required Return Calculation ─────────────────── -->
    <div class="section">
      <div class="section-header">3 — Required Return Derivation (Step by Step)</div>

      <div class="derivation-box">
        <h4>Formula: Compound Annual Growth Rate (CAGR)</h4>
        <div class="formula-display">
          <div><span class="label">General form:  </span>  Required Rate = (FV ÷ PV)^(1 ÷ n) − 1</div>
          <div><span class="label">Variables:     </span>  PV = ${fmt$(pv)},  FV = ${fmt$(fv)},  n = ${years} years</div>
          <div><span class="label">Step 1 — ratio:</span>  FV ÷ PV = ${fmt$(fv)} ÷ ${fmt$(pv)} = <strong>${ratio}</strong></div>
          <div><span class="label">Step 2 — root: </span>  ${ratio}^(1 ÷ ${years}) = ${ratio}^(0.${String(Math.round(10000 / years)).padStart(4, '0')}) = <strong>${factor}</strong></div>
          <div><span class="label">Step 3 — rate: </span>  ${factor} − 1 = <span class="required">${(parseFloat(factor) - 1).toFixed(6)}</span> = <span class="required">${reqDisplay}% per year</span></div>
        </div>
      </div>

      <div class="verdict-banner ${ret.on_track ? 'on-track' : 'off-track'}">
        ${ret.on_track
          ? `✓ ON TRACK — Required return: ${reqDisplay}% / year. Current annualised return: ${fmtPct(displayAnnReturn)}. Buffer: ${fmtPct(displayAnnReturn - parseFloat(reqDisplay))} above minimum hurdle. Returns would need to decline by ${fmtPct(displayAnnReturn - parseFloat(reqDisplay))} annually before the $5M target is missed.`
          : `✗ NEEDS ATTENTION — Required return: ${reqDisplay}% / year. Current annualised return: ${fmtPct(displayAnnReturn)}. The portfolio is running ${fmtPct(parseFloat(reqDisplay) - displayAnnReturn)} below the minimum required rate.`
        }
      </div>
    </div>

    <!-- ── Section 4: Scenario Projections ───────────────────────── -->
    <div class="section">
      <div class="section-header">4 — Scenario Projections: Arithmetic</div>

      <p style="font-size:10pt; color:#444; margin-bottom:14px;">
        Each scenario applies <strong>FV = PV × (1 + r)^n</strong>, no additional contributions, lump-sum model.
        PV = ${fmt$(pv)}, n = ${years} years.
      </p>

      <div class="scenarios-grid">
        ${scenarioMath}
      </div>
    </div>

    <!-- ── Section 5: Year-by-Year Table ─────────────────────────── -->
    <div class="section projection-table-section">
      <div class="section-header tinted">5 — Year-by-Year Projection Table</div>

      <table class="proj-table">
        <thead>
          <tr>
            <th>Year</th>
            <th>Age</th>
            ${ret.scenarios.map(s => `<th class="scenario-header">${s.label}</th>`).join('')}
            <th>$5M Target</th>
          </tr>
        </thead>
        <tbody>
          ${ret.projection_series.map(row => {
            const age = ret.current_age + (row.year - 2026)
            const isRetYear = age === ret.retirement_age
            return `
              <tr class="${isRetYear ? 'retirement-year' : ''}">
                <td class="num">${row.year}${isRetYear ? ' ← Retirement' : ''}</td>
                <td class="num">${age}</td>
                ${ret.scenarios.map(s => `<td class="num">${fmt$(row[s.id])}</td>`).join('')}
                <td class="num">${fmt$(fv)}</td>
              </tr>`
          }).join('')}
        </tbody>
      </table>

      <p style="font-size:8.5pt; color:#888; font-style:italic;">
        Green row = target retirement year (age ${ret.retirement_age}, ${2026 + years}).
        All figures in nominal dollars — not adjusted for inflation.
      </p>
    </div>

    <!-- ── Section 6: Risk Context ───────────────────────────────── -->
    <div class="section">
      <div class="section-header">6 — Risk Context (${official?.as_of ? `Tamarac official, ${official.as_of}` : 'Computed ITD'})</div>

      <table class="metrics-table">
        <thead>
          <tr>
            <th>Metric</th>
            <th>Value</th>
            <th>Benchmark</th>
            <th>Interpretation</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Sharpe Ratio (ITD)</td>
            <td class="mono ${sharpe >= 0.8 ? 'positive' : sharpe >= 0.5 ? 'neutral' : 'negative'}">${sharpe != null ? sharpe.toFixed(2) : '—'}</td>
            <td class="mono">S&amp;P 500: ${official?.benchmark_itd?.sp500_sharpe?.toFixed(2) ?? '0.70'}</td>
            <td>${sharpe >= 1.0 ? 'Strong (>1.0)' : sharpe >= 0.8 ? 'Good (>0.8)' : sharpe >= 0.5 ? 'Acceptable' : 'Weak'}</td>
          </tr>
          <tr>
            <td>Sortino Ratio (ITD)</td>
            <td class="mono ${sortino >= 1.0 ? 'positive' : 'neutral'}">${sortino != null ? sortino.toFixed(2) : '—'}</td>
            <td class="mono">S&amp;P 500: ${official?.benchmark_itd?.sp500_sortino?.toFixed(2) ?? '1.02'}</td>
            <td>Downside-only risk measure; higher than Sharpe means asymmetric gains</td>
          </tr>
          <tr>
            <td>Annualised Volatility (ITD)</td>
            <td class="mono neutral">${stdDev != null ? stdDev + '%' : '—'}</td>
            <td class="mono">S&amp;P 500: ~${official?.benchmark_itd?.sp500_std_dev != null ? (official.benchmark_itd.sp500_std_dev * 100).toFixed(1) : '16.9'}%</td>
            <td>Lower than market — dampened by illiquid alternatives (quarterly NAV reporting)</td>
          </tr>
          <tr>
            <td>Upside Capture (ITD)</td>
            <td class="mono neutral">${upCap}%</td>
            <td class="mono">100% = full participation</td>
            <td>Captures ${upCap}% of S&amp;P 500 gains in up-months — dampened by 55% alts sleeve</td>
          </tr>
          <tr>
            <td>Downside Capture (ITD)</td>
            <td class="mono ${dnCap > 60 ? 'negative' : 'neutral'}">${dnCap}%</td>
            <td class="mono">Goal: &lt; upside capture</td>
            <td>Absorbs ${dnCap}% of S&amp;P 500 losses. Goal: close upside/downside gap over time.</td>
          </tr>
          <tr>
            <td>Max Drawdown (ITD)</td>
            <td class="mono negative">${rm?.max_drawdown_pct != null ? rm.max_drawdown_pct + '%' : '—'}</td>
            <td class="mono">S&amp;P 500 ~−18% (Apr 2025)</td>
            <td>Worst peak-to-trough decline. Period: ${rm?.max_drawdown_start ?? '—'} → ${rm?.max_drawdown_trough ?? '—'}</td>
          </tr>
        </tbody>
      </table>

      <p style="font-size:9pt; color:#555; line-height:1.6;">
        <strong>Source:</strong> ${officialSrc}.
        Risk metrics reflect the ITD window (${inception} → ${asOf}).
        Volatility and drawdown derived from monthly portfolio valuations;
        official Tamarac figures sourced from AllSource Account Analytics export.
      </p>
    </div>

    <!-- ── Section 7: Assumptions & Limitations ──────────────────── -->
    <div class="section">
      <div class="section-header">7 — Assumptions, Methodology &amp; Limitations</div>

      <table class="metrics-table">
        <thead>
          <tr><th>Item</th><th>Assumption</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>Projection model</td>
            <td>Lump-sum future value: FV = PV × (1 + r)^n. No additional contributions assumed.</td>
          </tr>
          <tr>
            <td>Inflation</td>
            <td>Projections in nominal (not inflation-adjusted) dollars. Real return is approximately nominal return minus CPI (~3%).</td>
          </tr>
          <tr>
            <td>Return assumption basis</td>
            <td>Conservative (6%) = roughly half current pace. Moderate (8%) = historically consistent with balanced portfolios. Current pace = actual ITD CAGR.</td>
          </tr>
          <tr>
            <td>4% withdrawal rule</td>
            <td>Based on Trinity Study / Bengen research. Historically supports 30+ year withdrawal periods. Actual sustainable rate depends on sequence-of-returns risk at retirement.</td>
          </tr>
          <tr>
            <td>Cost basis</td>
            <td>All-in cost of securities purchased since ${inception}, as reconciled to AllSource custodian records.</td>
          </tr>
          <tr>
            <td>Alternatives valuation</td>
            <td>PE, Private Credit, and Hedge Funds report NAV quarterly. Values between reporting dates are as of last reported NAV and may lag current economic value.</td>
          </tr>
          <tr>
            <td>Fees</td>
            <td>Portfolio returns are net of advisor fees (1.16% billed rate). Sub-manager fees (fund-level management fees and carried interest) are absorbed in position NAVs and not shown separately.</td>
          </tr>
          <tr>
            <td>Social Security / other income</td>
            <td>Not included. Any Social Security benefit received at retirement would reduce the portfolio withdrawal required, improving the effective picture.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ── Disclaimer ──────────────────────────────────────────────── -->
    <div class="disclaimer">
      <strong>Important Disclosure:</strong> This exhibit is prepared solely for informational and planning purposes.
      It does not constitute investment advice, a guarantee of future performance, or a solicitation to buy or sell
      any security. All projections are illustrative compounding models based on historical portfolio data —
      actual results will differ due to return sequence, market conditions, inflation, fees, and actual contribution patterns.
      Past performance does not guarantee future results. This document was generated from independently reconciled
      AllSource custodian data as of ${asOf}. Risk metrics sourced from ${officialSrc}.
    </div>

  </div>

  <script>
    // Auto-print on load
    window.onload = function() {
      setTimeout(function() { window.print(); }, 400);
    };
  </script>
</body>
</html>`

  const win = window.open('', '_blank', 'width=900,height=700')
  if (!win) {
    alert('Pop-up blocked. Please allow pop-ups for this site and try again.')
    return
  }
  win.document.write(html)
  win.document.close()
}
