/**
 * Cloudflare Pages Function: /api/chat
 * Proxies chat requests to GROQ (llama-3.3-70b-versatile) with streaming.
 * Builds the system prompt from /data/system_context.json (pre-baked at static gen time).
 *
 * Required Cloudflare Pages environment variable: GROQ_API_KEY
 */

const GROQ_URL   = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL = 'llama-3.3-70b-versatile'

function buildSystemPrompt(ctx) {
  const fmt$ = (n) => n != null ? `$${Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '—'
  const fmtPct = (n) => n != null ? `${n > 0 ? '+' : ''}${Number(n).toFixed(2)}%` : '—'

  const acTable = (ctx.asset_classes || [])
    .map(ac => `  ${ac.label} (${ac.category}): ${fmt$(ac.value)} | ${fmtPct(ac.return_pct)} ITD | ${ac.weight_pct?.toFixed(1)}% weight`)
    .join('\n')

  return `You are a portfolio intelligence assistant for the Srinivasan household (managed by AllSource Advisory).
You have precise knowledge of every figure below. NEVER say "for illustration purposes" or guess any number.

DATA AS OF ${ctx.as_of_date || 'May 5, 2026'} (inception ${ctx.inception_date || 'Jul 10, 2024'}):

PORTFOLIO SUMMARY
  Total AUM:        ${fmt$(ctx.total_value)}
  Cost Basis:       ${fmt$(ctx.cost_basis)}
  Net Gain ITD:     ${fmt$(ctx.total_gain)}  (${fmtPct(ctx.total_gain_pct)})
  IRR 1-Year:       ${fmtPct(ctx.net_irr_1y)}
  IRR YTD:          ${fmtPct(ctx.net_irr_ytd)}

SLEEVES
  Equity:        ${fmt$(ctx.equity_value)} (${ctx.equity_pct?.toFixed(1)}%) | Return ITD ${fmtPct(ctx.equity_return_pct)} | Gain ${fmt$(ctx.equity_gain)}
  Alternatives:  ${fmt$(ctx.alternatives_value)} (${ctx.alternatives_pct?.toFixed(1)}%) | Return ITD ${fmtPct(ctx.alternatives_return_pct)} | Gain ${fmt$(ctx.alternatives_gain)}

BENCHMARKS (inception-to-date)
  S&P 500 (SPY):              ${fmtPct(ctx.spy_itd)}
  Bloomberg Aggregate (AGG):  ${fmtPct(ctx.agg_itd)}
  Blended passive benchmark:  ${fmtPct(ctx.benchmark_itd)}  (equity_wt×SPY + alt_wt×AGG + cash_wt×8.7%)
  Portfolio alpha vs benchmark: ${fmtPct(ctx.alpha_itd)}

FEES
  Advisor (AllSource ~1% ann.):  ${fmt$(ctx.total_fees)}
  Sub-manager drag (embedded):   ${fmt$(ctx.fee_gap)}
  Total fee impact:              ${fmt$((ctx.total_fees || 0) + (ctx.fee_gap || 0))}

ASSET CLASS DETAIL
${acTable}

DATA SOURCES
  1. AllSource/Tamarac CSV ledger — raw transaction history (deposits, withdrawals, fees, buys, sells)
  2. AllSource portal snapshot — market values, returns, gains (Position Performance Inception tab)

Return calculations use Modified Dietz / Time-Weighted Return (TWR) as computed by Tamarac.
Alternatives use J-Curve accounting for PE/Venture (early-stage 0% returns are expected).

Answer precisely using these figures. Be concise but complete.`
}

export async function onRequestPost(context) {
  const { env, request } = context
  const GROQ_API_KEY = env.GROQ_API_KEY

  if (!GROQ_API_KEY) {
    return new Response(
      'data: {"error":"GROQ_API_KEY not configured in Cloudflare environment"}\ndata: [DONE]\n\n',
      { headers: { 'Content-Type': 'text/event-stream' } }
    )
  }

  let body
  try {
    body = await request.json()
  } catch {
    return new Response('Bad request', { status: 400 })
  }

  const { message, history = [] } = body

  // Load portfolio context from the pre-baked static file
  let ctx = {}
  try {
    const origin = new URL(request.url).origin
    const ctxResp = await fetch(`${origin}/data/system_context.json`)
    if (ctxResp.ok) ctx = await ctxResp.json()
  } catch {
    // Proceed with empty context — system prompt will have '—' placeholders
  }

  const systemPrompt = buildSystemPrompt(ctx)

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'user', content: message },
  ]

  const groqResp = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      stream: true,
      temperature: 0.3,
      max_tokens: 1024,
    }),
  })

  if (!groqResp.ok) {
    const err = await groqResp.text()
    return new Response(
      `data: {"error":"GROQ error: ${err.slice(0, 120)}"}\ndata: [DONE]\n\n`,
      { headers: { 'Content-Type': 'text/event-stream' } }
    )
  }

  // Stream GROQ SSE → client SSE (reformat to { token } events)
  const { readable, writable } = new TransformStream()
  const writer = writable.getWriter()
  const encoder = new TextEncoder()

  ;(async () => {
    const reader = groqResp.body.getReader()
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
            const token = parsed.choices?.[0]?.delta?.content
            if (token) {
              await writer.write(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`))
            }
          } catch { /* skip malformed */ }
        }
      }
    } finally {
      await writer.close()
    }
  })()

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    },
  })
}
