/**
 * Cloudflare Pages Function: /api/chat
 * Independent portfolio analyst powered by GROQ.
 *
 * Required Cloudflare Pages environment variable: GROQ_API_KEY
 * Model: openai/gpt-oss-120b (set GROQ_MODEL env var to override)
 *
 * PORTFOLIO_CTX is auto-updated by scripts/generate_static.py at bake time.
 * Do not edit the PORTFOLIO_CTX block manually — run generate_static.py instead.
 */

const GROQ_URL   = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL = 'openai/gpt-oss-120b'

// === PORTFOLIO_CTX_START (auto-updated by generate_static.py — do not edit manually) ===
const PORTFOLIO_CTX = {"as_of_date":"2026-10-09","inception_date":"2024-07-10","total_value":2807577.26,"cost_basis":2160964.0,"total_gain":646613.26,"total_gain_pct":35.81,"net_irr_1y":13.32,"net_irr_ytd":11.31,"net_irr_qtd":1.06,"equity_value":1113746.47,"equity_return_pct":65.19,"equity_return_pct_1y":14.64,"equity_gain":439509.56,"equity_pct":39.67,"alternatives_value":1551095.97,"alternatives_return_pct":19.19,"alternatives_return_pct_1y":11.54,"alternatives_gain":249777.45,"alternatives_pct":55.25,"cash_value":105843.86,"cash_pct":3.77,"advisor_fees_itd":59537.7,"advisor_fees_1y":42064.89,"advisor_fees_ytd":25967.16,"advisor_fee_rate_pct":1.16,"sub_manager_fees":56682.98,"total_fee_impact":116220.68,"spy_itd":42.25,"agg_itd":5.91,"benchmark_itd":20.37,"alpha_itd":15.44,"spy_1y":20.44,"gross_gain":703296.24,"fee_gap":56682.98,"risk":{"sharpe_itd":0.84,"sortino_itd":1.26,"beta_itd":0.43,"upside_capture_itd":0.26,"downside_capture_itd":0.65,"r_squared_itd":0.7331,"sp500_sharpe":0.7,"source":"Tamarac official as of 2026-05-09"},"alternatives_detail":[{"category":"Private Equity","value":814116.32,"return_pct":28.06,"net_gain":98131.32,"weight_pct":29.0,"holdings":[{"name":"Jpmorgan Private Markets Fund Class I","value":126094.16,"return_pct":26.09},{"name":"VistaOne (TE), L.P.","value":268268.29,"return_pct":8.35},{"name":"Hamilton Lane Venture Capital & Growth Fund (HLVCG)","value":89232.13,"return_pct":18.98},{"name":"Caz Gp Ownership Class F Fund - Te L","value":116031.53,"return_pct":17.99},{"name":"STEPSTONE PRV VTRE AD GRW CL I MF","value":85673.04,"return_pct":14.23},{"name":"North Haven Private Equity Co-Investment Opportuni","value":83460.0,"return_pct":23.07},{"name":"Caz Professional Sports Ownership Fund III - Touch","value":45357.17,"return_pct":37.0}]},{"category":"Hedge Funds","value":278130.59,"return_pct":39.68,"net_gain":78130.59,"weight_pct":9.91,"holdings":[{"name":"RA Capital International","value":152845.0,"return_pct":52.85},{"name":"CAIS SSA Strategic Partners Offshore Ltd.","value":125285.59,"return_pct":25.29}]},{"category":"Commodity (Gold)","value":191526.03,"return_pct":81.04,"net_gain":36614.52,"weight_pct":6.82,"holdings":[{"name":"SCLLH1 Series (Statar Capital Partners, LP) GLAS","value":125383.0,"return_pct":24.39},{"name":"WORLD GOLD TRUST SPDR GLD MINI S ETF","value":66143.03,"return_pct":38.37}]},{"category":"Private Credit","value":143892.37,"return_pct":37.04,"net_gain":38892.37,"weight_pct":5.13,"holdings":[{"name":"Prf Fund II Lp","value":143892.37,"return_pct":37.04}]},{"category":"Managed Futures","value":107568.18,"return_pct":7.57,"net_gain":7568.18,"weight_pct":3.83,"holdings":[{"name":"MARS FX LP","value":107568.18,"return_pct":7.57}]},{"category":"Hedged Equity (Invenomic)","value":15862.48,"return_pct":-6.33,"net_gain":-9559.53,"weight_pct":0.56,"holdings":[{"name":"Global X NASDAQ 100 Covered Call ETF","value":0.0,"return_pct":-0.45},{"name":"Invenomic Institutional","value":15862.48,"return_pct":-6.13}]}],"asset_classes":[{"label":"Large-Cap Core","category":"equity","value":242616.12,"net_gain":72275.39,"return_pct":56.1,"weight_pct":8.64},{"label":"Large-Cap Growth","category":"equity","value":419980.3,"net_gain":287590.65,"return_pct":186.07,"weight_pct":14.96},{"label":"Large-Cap Value","category":"equity","value":157859.56,"net_gain":45418.14,"return_pct":70.03,"weight_pct":5.62},{"label":"Small-Cap Core","category":"equity","value":20245.46,"net_gain":-15885.09,"return_pct":-45.27,"weight_pct":0.72},{"label":"Small-Cap Growth","category":"equity","value":3530.73,"net_gain":-17817.18,"return_pct":-60.76,"weight_pct":0.13},{"label":"Small-Cap Value","category":"equity","value":31371.46,"net_gain":-21080.18,"return_pct":-44.0,"weight_pct":1.12},{"label":"Mid-Cap Core","category":"equity","value":51698.56,"net_gain":2254.01,"return_pct":3.96,"weight_pct":1.84},{"label":"Mid-Cap Growth","category":"equity","value":25212.7,"net_gain":25413.45,"return_pct":191.62,"weight_pct":0.9},{"label":"Mid-Cap Value","category":"equity","value":57101.89,"net_gain":10173.72,"return_pct":12.42,"weight_pct":2.03},{"label":"Foreign Large-Cap Growth","category":"equity","value":93451.65,"net_gain":40725.19,"return_pct":65.06,"weight_pct":3.33},{"label":"Foreign Small/Mid-Cap Growth","category":"equity","value":0.0,"net_gain":477.38,"return_pct":10.48,"weight_pct":0.0},{"label":"Int'l Developed Markets","category":"equity","value":10678.04,"net_gain":9964.08,"return_pct":38.99,"weight_pct":0.38},{"label":"Commodity (Gold)","category":"alternatives","value":191526.03,"net_gain":36614.52,"return_pct":81.04,"weight_pct":6.82},{"label":"Hedged Equity (Invenomic)","category":"alternatives","value":15862.48,"net_gain":-9559.53,"return_pct":-6.33,"weight_pct":0.56},{"label":"Managed Futures","category":"alternatives","value":107568.18,"net_gain":7568.18,"return_pct":7.57,"weight_pct":3.83},{"label":"Hedge Funds","category":"alternatives","value":278130.59,"net_gain":78130.59,"return_pct":39.68,"weight_pct":9.91},{"label":"Private Equity","category":"alternatives","value":814116.32,"net_gain":98131.32,"return_pct":28.06,"weight_pct":29.0},{"label":"Private Credit","category":"alternatives","value":143892.37,"net_gain":38892.37,"return_pct":37.04,"weight_pct":5.13},{"label":"Cash & Equivalents","category":"cash","value":105843.86,"net_gain":14009.23,"return_pct":9.91,"weight_pct":3.77},{"label":"Venture Capital","category":"alternatives","value":0.0,"net_gain":0.0,"return_pct":0.0,"weight_pct":0.0}],"pre_computed":{"ex_commodity_alt_return_pct":18.6,"ex_commodity_alt_value":1359570,"commodity_return_pct":81.04,"commodity_value":191526,"vistaone_value":268268,"vistaone_return_pct":8.35,"pe_avg_return_pct":28.06,"small_cap_underperformance":"Small-Cap Value \u201344.0%, Small-Cap Core \u201345.3%, Small-Cap Growth \u201360.8% ITD vs broadly flat small-cap market","small_cap_combined_value":55147,"capture_story":"26% upside / 65% downside \u2014 captures <1/3 of market gains but >2/3 of losses","fee_as_pct_of_net_gain":18.0,"spy_gap_itd":6.44}}
// === PORTFOLIO_CTX_END ===

const $ = (n) => n != null ? `$${Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '—'
const pct = (n) => n != null ? `${n > 0 ? '+' : ''}${Number(n).toFixed(2)}%` : '—'
const pct1 = (n) => n != null ? `${n > 0 ? '+' : ''}${Number(n).toFixed(1)}%` : '—'

function buildSystemPrompt(ctx) {
  const risk = ctx.risk || {}
  const pc   = ctx.pre_computed || {}

  // Top-5 alternatives by value for the brief
  const topAlts = (ctx.alternatives_detail || [])
    .filter(a => a.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 6)
    .map(a => `  ${a.category}: ${$(a.value)} | ${pct(a.return_pct)} ITD`)
    .join('\n')

  // Equity classes with notable performance
  const equityHighlights = (ctx.asset_classes || [])
    .filter(ac => ac.category === 'equity' && ac.value > 0)
    .map(ac => `  ${ac.label}: ${$(ac.value)} | ${pct(ac.return_pct)} ITD`)
    .join('\n')

  return `You are an independent portfolio analyst for the Srinivasan household ($${(ctx.total_value || 0).toLocaleString()} AUM, managed by AllSource RIA).
Your data is verified and current. Give direct, opinionated answers. Cite exact numbers. Never hedge with "it depends."

PORTFOLIO (as of ${ctx.as_of_date}, inception ${ctx.inception_date})
  AUM: ${$(ctx.total_value)} | Cost basis: ${$(ctx.cost_basis)} | Net gain: ${$(ctx.total_gain)} (${pct(ctx.total_gain_pct)})
  1Y IRR: ${pct(ctx.net_irr_1y)} | YTD IRR: ${pct(ctx.net_irr_ytd)} | QTD: ${pct(ctx.net_irr_qtd)}

SLEEVES
  Equity ${pct1(ctx.equity_pct)}: ${$(ctx.equity_value)} | ITD ${pct(ctx.equity_return_pct)} | 1Y ${pct(ctx.equity_return_pct_1y)}
  Alternatives ${pct1(ctx.alternatives_pct)}: ${$(ctx.alternatives_value)} | ITD ${pct(ctx.alternatives_return_pct)} | 1Y ${pct(ctx.alternatives_return_pct_1y)}
  Cash ${pct1(ctx.cash_pct)}: ${$(ctx.cash_value)}

BENCHMARKS (ITD)
  S&P 500: ${pct(ctx.spy_itd)} | AGG: ${pct(ctx.agg_itd)} | Blended: ${pct(ctx.benchmark_itd)} | Portfolio alpha: ${pct(ctx.alpha_itd)}

FEES
  Advisor ITD: ${$(ctx.advisor_fees_itd)} | 1Y: ${$(ctx.advisor_fees_1y)} | YTD: ${$(ctx.advisor_fees_ytd)}
  Sub-mgr drag: ${$(ctx.sub_manager_fees)} | Total fee impact: ${$(ctx.total_fee_impact)} (${pc.fee_as_pct_of_net_gain}% of net gain)

RISK (Tamarac official May 2026)
  Sharpe: ${risk.sharpe_itd} | Sortino: ${risk.sortino_itd} | Beta: ${risk.beta_itd}
  Upside capture: ${((risk.upside_capture_itd || 0.26) * 100).toFixed(0)}% | Downside capture: ${((risk.downside_capture_itd || 0.65) * 100).toFixed(0)}%

ALTERNATIVES DETAIL
${topAlts}
  Note: Core alts ex-commodity (${$(pc.ex_commodity_alt_value)}) returned only +${pc.ex_commodity_alt_return_pct}% ITD vs S&P +${pct(ctx.spy_itd)}.
  VistaOne: ${$(pc.vistaone_value)} — largest PE position but weakest at +${pc.vistaone_return_pct}% vs PE avg +${pc.pe_avg_return_pct}%.
  Small-caps: ${pc.small_cap_underperformance}.
  Capture: ${pc.capture_story}.

EQUITY CLASSES
${equityHighlights}

FORMAT RULES: Never use markdown tables or pipe characters. Use bullet points and bold numbers. Always write at least 3–5 sentences per answer. Never truncate.`
}

const PRELOAD_PROMPT = `Generate a portfolio analyst brief. Use bullet points ONLY — no tables, no pipe characters.

## Performance Snapshot
3 bullets with the key return figures (ITD, 1Y, vs S&P benchmark).

## Top 3 Concerns
Numbered list. Each item must include a specific dollar amount or percentage.

## Questions for Next Advisor Meeting
3 numbered questions specific enough that they cannot be answered with generalities.

Under 350 words total. Be direct. Cite exact numbers from the data.`

export async function onRequestPost(context) {
  const { env, request } = context
  const GROQ_API_KEY = env.GROQ_API_KEY
  const model = env.GROQ_MODEL || GROQ_MODEL

  if (!GROQ_API_KEY) {
    return new Response(
      'data: {"error":"GROQ_API_KEY not set in Cloudflare Pages environment variables"}\ndata: [DONE]\n\n',
      { headers: { 'Content-Type': 'text/event-stream' } }
    )
  }

  let body
  try { body = await request.json() }
  catch { return new Response('Bad request', { status: 400 }) }

  const { message, history = [] } = body
  const isPreload = message === '__PRELOAD__'

  // Raw GROQ test — type __RAWTEST__ in chat to see raw SSE stream from model
  if (message === '__RAWTEST__') {
    const testResp = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'You are a helpful assistant. Keep responses short.' },
          { role: 'user', content: 'Say exactly: HELLO WORLD' },
        ],
        stream: true,
        temperature: 0,
        max_tokens: 20,
      }),
    })
    const status = testResp.status
    const rawText = await testResp.text()
    const preview = rawText.slice(0, 800).replace(/\n/g, '\\n')
    return new Response(
      `data: ${JSON.stringify({ token: `RAWTEST model=${model} http=${status}\n\n${preview}` })}\ndata: [DONE]\n\n`,
      { headers: { 'Content-Type': 'text/event-stream' } }
    )
  }

  // Debug endpoint — type __DEBUG__ in chat to see what the function loaded
  if (message === '__DEBUG__') {
    const ctx = PORTFOLIO_CTX
    const info = [
      `Model: ${model}`,
      `Context source: embedded (generate_static.py)`,
      `As of: ${ctx.as_of_date || 'not set'}`,
      `Total AUM: $${(ctx.total_value || 0).toLocaleString()}`,
      `Equity: $${(ctx.equity_value || 0).toLocaleString()} | Alts: $${(ctx.alternatives_value || 0).toLocaleString()}`,
      `Alt categories: ${(ctx.alternatives_detail || []).map(a => a.category).join(', ')}`,
      `Risk keys: ${Object.keys(ctx.risk || {}).join(', ')}`,
      `Pre-computed: ${Object.keys(ctx.pre_computed || {}).join(', ')}`,
    ].join('\n')
    return new Response(
      `data: ${JSON.stringify({ token: info })}\ndata: [DONE]\n\n`,
      { headers: { 'Content-Type': 'text/event-stream' } }
    )
  }

  const systemPrompt = buildSystemPrompt(PORTFOLIO_CTX)

  // Strip garbled history: remove assistant messages with < 30 chars (truncated prior responses)
  // and their paired user messages so the model doesn't try to "continue" a broken sentence.
  const cleanHistory = []
  for (let i = 0; i < history.length; i++) {
    const msg = history[i]
    if (msg.role === 'assistant' && (msg.content || '').trim().length < 30) {
      if (cleanHistory.length > 0 && cleanHistory[cleanHistory.length - 1].role === 'user') {
        cleanHistory.pop()
      }
      continue
    }
    cleanHistory.push(msg)
  }

  const messages = [
    { role: 'system', content: systemPrompt },
    ...(isPreload ? [] : cleanHistory),
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
      temperature: isPreload ? 0.2 : 0.5,
      max_tokens:  isPreload ? 600 : 2048,
    }),
  })

  if (!groqResp.ok) {
    const err = await groqResp.text()
    return new Response(
      `data: ${JSON.stringify({ error: `GROQ error (model: ${model}): ${err.slice(0, 300)}` })}\ndata: [DONE]\n\n`,
      { headers: { 'Content-Type': 'text/event-stream' } }
    )
  }

  // Stream GROQ SSE → client SSE
  const { readable, writable } = new TransformStream()
  const writer  = writable.getWriter()
  const encoder = new TextEncoder()
  let done_signaled = false

  ;(async () => {
    const reader  = groqResp.body.getReader()
    const decoder = new TextDecoder()
    try {
      outer: while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue
          const payload = line.slice(6).trim()
          if (payload === '[DONE]') {
            done_signaled = true
            break outer  // exit both loops
          }
          try {
            const parsed = JSON.parse(payload)
            const token  = parsed.choices?.[0]?.delta?.content
            if (token) await writer.write(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`))
          } catch { /* skip malformed */ }
        }
      }
    } finally {
      if (!done_signaled) {
        // Stream ended without [DONE] — still signal completion to client
      }
      await writer.write(encoder.encode('data: [DONE]\n\n'))
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
