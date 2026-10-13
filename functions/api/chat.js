/**
 * Cloudflare Pages Function: /api/chat
 * Independent portfolio analyst powered by GROQ.
 *
 * Required Cloudflare Pages environment variable: GROQ_API_KEY
 * Model: openai/gpt-oss-120b (set GROQ_MODEL env var to override)
 */

const GROQ_URL   = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL = 'openai/gpt-oss-120b'

const $ = (n) => n != null ? `$${Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '—'
const pct = (n) => n != null ? `${n > 0 ? '+' : ''}${Number(n).toFixed(2)}%` : '—'
const pct1 = (n) => n != null ? `${n > 0 ? '+' : ''}${Number(n).toFixed(1)}%` : '—'

function buildSystemPrompt(ctx) {
  const risk = ctx.risk || {}
  const pc   = ctx.pre_computed || {}

  // Alternatives table
  const altRows = (ctx.alternatives_detail || []).map(a => {
    const holdingLines = (a.holdings || []).map(h =>
      `      • ${h.name}: ${$(h.value)} | ${pct(h.return_pct)} ITD`
    ).join('\n')
    return `  ${a.category} (${pct1(a.weight_pct)} of portfolio)\n    Value: ${$(a.value)} | ITD Return: ${pct(a.return_pct)} | Net Gain: ${$(a.net_gain)}\n${holdingLines}`
  }).join('\n\n')

  // Asset class table
  const acRows = (ctx.asset_classes || []).map(ac =>
    `  ${ac.label} (${ac.category}): ${$(ac.value)} | ${pct(ac.return_pct)} ITD | ${ac.weight_pct?.toFixed(1)}% weight`
  ).join('\n')

  return `You are an independent, fiduciary portfolio analyst reviewing the Srinivasan household investment portfolio.

YOUR ROLE AND MANDATE:
- You have verified, current data on this portfolio — reconciled daily to AllSource custodian to ±$1 tolerance.
- You are NOT the advisor (Patrick Kennedy, AllSource RIA). You are an independent analyst reviewing his work.
- You form opinions and state them clearly. You flag underperformance, concentration risk, and fee drag without hedging.
- You think like a CFA charterholder who is not paid to keep money in alternatives.
- When asked a question, answer it precisely with numbers. Never say "for illustration purposes" or guess any figure.
- You can say things like "This is a concern" or "The data suggests the advisor should explain X." That is your job.
- Always cite the specific number that supports your point.

=== PORTFOLIO DATA (as of ${ctx.as_of_date || '2026-10-09'}, inception ${ctx.inception_date || '2024-07-10'}) ===

PORTFOLIO SUMMARY
  Total AUM:        ${$(ctx.total_value)}
  Cost Basis:       ${$(ctx.cost_basis)}
  Net Gain ITD:     ${$(ctx.total_gain)}  (${pct(ctx.total_gain_pct)})
  Gross Gain ITD:   ${$(ctx.gross_gain)}  (before fee drag)
  1-Year Net IRR:   ${pct(ctx.net_irr_1y)}
  YTD Net IRR:      ${pct(ctx.net_irr_ytd)}
  QTD Net IRR:      ${pct(ctx.net_irr_qtd)}

SLEEVES
  Equity:        ${$(ctx.equity_value)} (${pct1(ctx.equity_pct)}) | ITD ${pct(ctx.equity_return_pct)} | 1Y ${pct(ctx.equity_return_pct_1y)} | Gain ${$(ctx.equity_gain)}
  Alternatives:  ${$(ctx.alternatives_value)} (${pct1(ctx.alternatives_pct)}) | ITD ${pct(ctx.alternatives_return_pct)} | 1Y ${pct(ctx.alternatives_return_pct_1y)} | Gain ${$(ctx.alternatives_gain)}
  Cash:          ${$(ctx.cash_value)} (${pct1(ctx.cash_pct)})

BENCHMARKS (inception-to-date, Jul 2024 → Oct 2026)
  S&P 500 (SPY):              ${pct(ctx.spy_itd)}
  Bloomberg Aggregate (AGG):  ${pct(ctx.agg_itd)}
  Blended benchmark:          ${pct(ctx.benchmark_itd)}  (${pct1(ctx.equity_pct)} SPY + ${pct1(ctx.alternatives_pct)} AGG + cash)
  Portfolio alpha vs blend:   ${pct(ctx.alpha_itd)}
  Portfolio gap vs SPY:       ${pct(pc.spy_gap_itd)} (portfolio underperforms S&P by this margin ITD)

FEES (AllSource transaction ledger — verified)
  Advisor fees ITD:       ${$(ctx.advisor_fees_itd)}
  Advisor fees (1-Year):  ${$(ctx.advisor_fees_1y)}
  Advisor fees (YTD):     ${$(ctx.advisor_fees_ytd)}
  Advisor fee rate:       ~${ctx.advisor_fee_rate_pct?.toFixed(2) || '1.16'}% annualized on AUM
  Sub-manager drag:       ${$(ctx.sub_manager_fees)} ITD (embedded in fund NAVs — inferred from gross vs net gap)
  Total fee impact ITD:   ${$(ctx.total_fee_impact)}  (${pc.fee_as_pct_of_net_gain}% of net gain paid in fees)

RISK METRICS (${risk.source || 'Tamarac official, May 2026'})
  Sharpe ratio ITD:       ${risk.sharpe_itd || '0.84'}  (S&P 500: ${risk.sp500_sharpe || '0.70'})
  Sortino ratio ITD:      ${risk.sortino_itd || '1.26'}
  Beta ITD:               ${risk.beta_itd || '0.43'}  (low market correlation)
  Upside capture ITD:     ${((risk.upside_capture_itd || 0.26) * 100).toFixed(0)}%  ← captures only this much of S&P upside
  Downside capture ITD:   ${((risk.downside_capture_itd || 0.65) * 100).toFixed(0)}%  ← but absorbs this much of S&P downside
  R-squared ITD:          ${((risk.r_squared_itd || 0.7331) * 100).toFixed(1)}%

ALTERNATIVES DETAIL
  [Note: Alternatives benchmark is AGG (${pct(ctx.agg_itd)} ITD) — a low bar. PE/HF carry equity-like risk and should be judged vs PME/HFRI/CDLI.]

${altRows}

EQUITY ASSET CLASSES
${acRows}

=== PRE-COMPUTED ANALYTICAL FINDINGS ===

1. EX-COMMODITY ALTERNATIVES RETURN
   The alternatives sleeve includes a $${pc.commodity_value?.toLocaleString()} commodity bucket (Statar + Gold ETF) at +${pc.commodity_return_pct}% ITD.
   Stripping the commodity out: the core alternatives book (PE, HF, Private Credit, Managed Futures, Hedged Equity)
   = ~${$(pc.ex_commodity_alt_value)} at approximately +${pc.ex_commodity_alt_return_pct}% ITD.
   Compare: S&P 500 returned ${pct(ctx.spy_itd)} over the same window. Core alts significantly underperformed equities.

2. VISTAONE FLAG
   VistaOne (TE), L.P. = largest single alternative position at ${$(pc.vistaone_value)} (${((pc.vistaone_value || 0) / (ctx.alternatives_value || 1) * 100).toFixed(1)}% of alts sleeve).
   ITD return: +${pc.vistaone_return_pct}% — well below PE category average of +${pc.pe_avg_return_pct}% ITD.
   This is the largest illiquid position and the weakest PE performer. The household has initiated a $90K redemption.

3. SMALL-CAP MANAGER FAILURE
   ${pc.small_cap_underperformance}
   Combined value: ~${$(pc.small_cap_combined_value)}. Magnitude of underperformance vs. broad small-cap is a manager-selection question.

4. CAPTURE RATIO STORY
   ${pc.capture_story}
   This means the 55% alternatives allocation is dampening returns more than it's protecting against downside.
   The question: does this distribution improve in a drawdown, or does it simply reduce returns in all environments?

5. FEE IMPACT
   Total fees = ${$(ctx.total_fee_impact)} ITD, which is ${pc.fee_as_pct_of_net_gain}% of net gain.
   Every 1% of AUM paid in fees requires meaningful alpha just to break even vs. a passive Vanguard portfolio.

=== PROPER BENCHMARKS FOR ALTERNATIVES ===
  Private Equity:      PME vs. Russell 2000 or MSCI ACWI + illiquidity premium (not AGG)
  Private Credit:      Cliffwater Direct Lending Index (CDLI)
  Hedge Funds:         HFRI Fund Weighted Composite
  Managed Futures:     SG CTA Index / SG Trend Index
  Hedged Equity:       HFRI Equity Hedge Index

When asked about alternatives performance, use these benchmarks — not AGG.

=== DATA SOURCES ===
  1. AllSource CSV ledger — all transactions, fees, gains (9,412 rows, through Oct 2026)
  2. AllSource portal snapshot — market values, returns, ITD gains
  Reconciled to ±$1 tolerance. All figures are current, not estimates.

=== FORMATTING RULES (STRICT — follow every response) ===
  NEVER use markdown tables (no pipe characters for data). NEVER use | separators.
  Structure all data as bullet points:  • Label: **value** — context note
  Use ## for section headers. Use numbered lists for ranked items.
  Bold (**) only key numbers and verdicts. Keep responses under 400 words unless asked for detail.
  Example good format:
    ## Performance Snapshot
    • ITD Return: **+35.81%** (Jul 2024 – Oct 2026) vs cost basis of $2.16M
    • 1-Year Net IRR: **+13.32%**
    • Alpha vs blended benchmark: **+15.45pp**`
}

const PRELOAD_PROMPT = `Generate a portfolio analyst brief. Use bullet points ONLY — no tables, no pipe characters.

## Performance Snapshot
3 bullets with the key return figures, comparing ITD and 1Y.

## Top 3 Concerns
Numbered list, each with a specific number that supports the concern.

## Questions for Next Advisor Meeting
3 numbered questions — each must be specific enough that it cannot be answered with a generality.

Keep the entire brief under 350 words. Be direct. Cite exact numbers.`

export async function onRequestPost(context) {
  const { env, request } = context
  const GROQ_API_KEY = env.GROQ_API_KEY
  const model = env.GROQ_MODEL || GROQ_MODEL

  if (!GROQ_API_KEY) {
    return new Response(
      'data: {"error":"GROQ_API_KEY not set — add it to Cloudflare Pages environment variables (Settings → Environment variables)"}\ndata: [DONE]\n\n',
      { headers: { 'Content-Type': 'text/event-stream' } }
    )
  }

  let body
  try { body = await request.json() }
  catch { return new Response('Bad request', { status: 400 }) }

  const { message, history = [] } = body
  const isPreload = message === '__PRELOAD__'

  // Load portfolio context from pre-baked static JSON
  let ctx = {}
  try {
    const origin = new URL(request.url).origin
    const ctxResp = await fetch(`${origin}/data/system_context.json`)
    if (ctxResp.ok) ctx = await ctxResp.json()
  } catch { /* proceed with empty ctx — prompt will show '—' placeholders */ }

  const systemPrompt = buildSystemPrompt(ctx)

  const messages = [
    { role: 'system', content: systemPrompt },
    ...(isPreload ? [] : history),
    { role: 'user', content: isPreload ? PRELOAD_PROMPT : message },
  ]

  const groqResp = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      stream:      true,
      temperature: isPreload ? 0.2 : 0.3,
      max_tokens:  isPreload ? 600 : 1024,
    }),
  })

  if (!groqResp.ok) {
    const err = await groqResp.text()
    return new Response(
      `data: {"error":"GROQ error (model: ${model}): ${err.slice(0, 200)}"}\ndata: [DONE]\n\n`,
      { headers: { 'Content-Type': 'text/event-stream' } }
    )
  }

  // Stream GROQ SSE → client SSE ({ token } events)
  const { readable, writable } = new TransformStream()
  const writer  = writable.getWriter()
  const encoder = new TextEncoder()

  ;(async () => {
    const reader  = groqResp.body.getReader()
    const decoder = new TextDecoder()
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue
          const payload = line.slice(6).trim()
          if (payload === '[DONE]') {
            await writer.write(encoder.encode('data: [DONE]\n\n'))
            break
          }
          try {
            const parsed = JSON.parse(payload)
            const token  = parsed.choices?.[0]?.delta?.content
            if (token) await writer.write(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`))
          } catch { /* skip malformed SSE chunk */ }
        }
      }
    } finally {
      await writer.close()
    }
  })()

  return new Response(readable, {
    headers: {
      'Content-Type':      'text/event-stream',
      'Cache-Control':     'no-cache',
      'X-Accel-Buffering': 'no',
    },
  })
}
