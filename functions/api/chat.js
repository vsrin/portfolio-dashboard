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
const PORTFOLIO_CTX = {"as_of_date":"2026-10-29","inception_date":"2024-07-10","total_value":2744495.32,"cost_basis":2147436.0,"total_gain":597059.32,"total_gain_pct":32.89,"net_irr_1y":13.32,"net_irr_ytd":9.29,"net_irr_qtd":-0.68,"equity_value":1043559.85,"equity_return_pct":60.65,"equity_return_pct_1y":14.64,"equity_gain":393976.08,"equity_pct":38.02,"alternatives_value":1553802.13,"alternatives_return_pct":19.12,"alternatives_return_pct_1y":11.54,"alternatives_gain":249379.99,"alternatives_pct":56.62,"cash_value":113855.39,"cash_pct":4.15,"advisor_fees_itd":59537.7,"advisor_fees_1y":42064.89,"advisor_fees_ytd":25967.16,"advisor_fee_rate_pct":1.18,"sub_manager_fees":60305.99,"total_fee_impact":119843.69,"spy_itd":38.16,"agg_itd":7.81,"benchmark_itd":19.28,"alpha_itd":13.61,"spy_1y":12.36,"gross_gain":657365.31,"fee_gap":60305.99,"risk":{"sharpe_itd":0.84,"sortino_itd":1.26,"beta_itd":0.43,"upside_capture_itd":0.26,"downside_capture_itd":0.65,"r_squared_itd":0.7331,"sp500_sharpe":0.7,"source":"Tamarac official as of 2026-05-09"},"alternatives_detail":[{"category":"Private Equity","value":812750.94,"return_pct":26.99,"net_gain":96765.94,"weight_pct":29.61,"holdings":[{"name":"Jpmorgan Private Markets Fund Class I","value":126822.26,"return_pct":26.82},{"name":"VistaOne (TE), L.P.","value":267865.67,"return_pct":8.11},{"name":"Hamilton Lane Venture Capital & Growth Fund (HLVCG)","value":89232.13,"return_pct":18.98},{"name":"STEPSTONE PRV VTRE AD GRW CL I MF","value":86757.29,"return_pct":15.68},{"name":"Caz Gp Ownership Class F Fund - Te L","value":113256.42,"return_pct":14.12},{"name":"North Haven Private Equity Co-Investment Opportuni","value":83460.0,"return_pct":22.62},{"name":"Caz Professional Sports Ownership Fund III - Touch","value":45357.17,"return_pct":35.37}]},{"category":"Hedge Funds","value":278406.73,"return_pct":39.81,"net_gain":78406.73,"weight_pct":10.14,"holdings":[{"name":"RA Capital International","value":152845.0,"return_pct":52.85},{"name":"CAIS SSA Strategic Partners Offshore Ltd.","value":125561.73,"return_pct":25.56}]},{"category":"Commodity (Gold)","value":191895.16,"return_pct":70.22,"net_gain":33880.03,"weight_pct":6.99,"holdings":[{"name":"SCLLH1 Series (Statar Capital Partners, LP) GLAS","value":125383.0,"return_pct":24.39},{"name":"WORLD GOLD TRUST SPDR GLD MINI S ETF","value":66512.16,"return_pct":28.9}]},{"category":"Private Credit","value":145536.65,"return_pct":38.61,"net_gain":40536.65,"weight_pct":5.3,"holdings":[{"name":"Prf Fund II Lp","value":145536.65,"return_pct":38.61}]},{"category":"Managed Futures","value":107568.18,"return_pct":7.57,"net_gain":7568.18,"weight_pct":3.92,"holdings":[{"name":"MARS FX LP","value":107568.18,"return_pct":7.57}]},{"category":"Hedged Equity (Invenomic)","value":17644.47,"return_pct":-5.25,"net_gain":-7777.54,"weight_pct":0.64,"holdings":[{"name":"Global X NASDAQ 100 Covered Call ETF","value":0.0,"return_pct":-0.45},{"name":"Invenomic Institutional","value":17644.47,"return_pct":-5.08}]}],"asset_classes":[{"label":"Large-Cap Core","category":"equity","value":233571.33,"net_gain":59477.89,"return_pct":45.81,"weight_pct":8.51},{"label":"Large-Cap Growth","category":"equity","value":357215.31,"net_gain":255957.36,"return_pct":165.67,"weight_pct":13.02},{"label":"Large-Cap Value","category":"equity","value":158413.4,"net_gain":46094.16,"return_pct":70.06,"weight_pct":5.77},{"label":"Small-Cap Core","category":"equity","value":20900.42,"net_gain":-15230.13,"return_pct":-43.4,"weight_pct":0.76},{"label":"Small-Cap Growth","category":"equity","value":3348.66,"net_gain":-17999.25,"return_pct":-62.01,"weight_pct":0.12},{"label":"Small-Cap Value","category":"equity","value":29942.08,"net_gain":-22509.56,"return_pct":-46.71,"weight_pct":1.09},{"label":"Mid-Cap Core","category":"equity","value":61909.4,"net_gain":7703.45,"return_pct":13.64,"weight_pct":2.26},{"label":"Mid-Cap Growth","category":"equity","value":16815.24,"net_gain":21341.82,"return_pct":162.78,"weight_pct":0.61},{"label":"Mid-Cap Value","category":"equity","value":60322.5,"net_gain":13394.33,"return_pct":16.5,"weight_pct":2.2},{"label":"Foreign Large-Cap Growth","category":"equity","value":87451.41,"net_gain":34724.95,"return_pct":55.31,"weight_pct":3.19},{"label":"Foreign Small/Mid-Cap Growth","category":"equity","value":0.0,"net_gain":477.38,"return_pct":10.48,"weight_pct":0.0},{"label":"Int'l Developed Markets","category":"equity","value":13670.1,"net_gain":10543.68,"return_pct":42.05,"weight_pct":0.5},{"label":"Commodity (Gold)","category":"alternatives","value":191895.16,"net_gain":33880.03,"return_pct":70.22,"weight_pct":6.99},{"label":"Hedged Equity (Invenomic)","category":"alternatives","value":17644.47,"net_gain":-7777.54,"return_pct":-5.25,"weight_pct":0.64},{"label":"Managed Futures","category":"alternatives","value":107568.18,"net_gain":7568.18,"return_pct":7.57,"weight_pct":3.92},{"label":"Hedge Funds","category":"alternatives","value":278406.73,"net_gain":78406.73,"return_pct":39.81,"weight_pct":10.14},{"label":"Private Equity","category":"alternatives","value":812750.94,"net_gain":96765.94,"return_pct":26.99,"weight_pct":29.61},{"label":"Private Credit","category":"alternatives","value":145536.65,"net_gain":40536.65,"return_pct":38.61,"weight_pct":5.3},{"label":"Cash & Equivalents","category":"cash","value":113855.39,"net_gain":14009.24,"return_pct":9.99,"weight_pct":4.15},{"label":"Venture Capital","category":"alternatives","value":0.0,"net_gain":0.0,"return_pct":0.0,"weight_pct":0.0}],"pre_computed":{"ex_commodity_alt_return_pct":18.5,"ex_commodity_alt_value":1362276,"commodity_return_pct":81.04,"commodity_value":191526,"vistaone_value":268268,"vistaone_return_pct":8.35,"pe_avg_return_pct":28.06,"small_cap_underperformance":"Small-Cap Value \u201344.0%, Small-Cap Core \u201345.3%, Small-Cap Growth \u201360.8% ITD vs broadly flat small-cap market","small_cap_combined_value":55147,"capture_story":"26% upside / 65% downside \u2014 captures <1/3 of market gains but >2/3 of losses","fee_as_pct_of_net_gain":20.1,"spy_gap_itd":5.27}}
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
