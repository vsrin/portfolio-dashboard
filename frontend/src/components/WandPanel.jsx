import { useState, useCallback } from 'react'

export default function WandPanel({ buildPrompt }) {
  const [status, setStatus] = useState('idle')   // idle | loading | done
  const [text, setText]     = useState('')
  const [open, setOpen]     = useState(false)

  const generate = useCallback(async (e) => {
    e.stopPropagation()
    if (status === 'loading') return
    if (status === 'done') { setOpen(o => !o); return }

    const prompt = buildPrompt()
    if (!prompt) return

    setStatus('loading')
    setOpen(true)
    setText('')

    try {
      const resp = await fetch('/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ message: prompt, history: [] }),
      })

      const reader  = resp.body.getReader()
      const decoder = new TextDecoder()
      let   acc     = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue
          const payload = line.slice(6).trim()
          if (payload === '[DONE]') break
          try {
            const parsed = JSON.parse(payload)
            if (parsed.token) { acc += parsed.token; setText(acc) }
            if (parsed.error) { acc = `⚠️ ${parsed.error}`; setText(acc) }
          } catch {}
        }
      }
      setStatus('done')
    } catch {
      setText('⚠️ Unable to reach AI service.')
      setStatus('idle')
    }
  }, [status, buildPrompt])

  const dismiss = (e) => { e.stopPropagation(); setOpen(false); setStatus('idle'); setText('') }

  return (
    <div style={{ marginTop: 12, borderTop: '1px solid var(--border)' }}>
      {/* Trigger row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10 }}>
        <button
          onClick={generate}
          disabled={status === 'loading'}
          title="Generate AI insight for this widget"
          style={{
            background:    'none',
            border:        '1px solid var(--border)',
            borderRadius:  4,
            color:         status === 'done' ? 'var(--cyan)' : 'var(--text-muted)',
            cursor:        status === 'loading' ? 'wait' : 'pointer',
            padding:       '4px 10px',
            fontSize:      11,
            fontFamily:    'var(--font-ui)',
            display:       'flex',
            alignItems:    'center',
            gap:           5,
            letterSpacing: '0.03em',
            transition:    'border-color 0.15s, color 0.15s',
          }}
          onMouseEnter={e => { if (status !== 'loading') { e.currentTarget.style.borderColor = 'var(--cyan)'; e.currentTarget.style.color = 'var(--cyan)' }}}
          onMouseLeave={e => { if (status !== 'done') { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}}
        >
          <span style={{ fontSize: 12 }}>{status === 'loading' ? '⟳' : '✦'}</span>
          {status === 'loading' ? 'Thinking…' : status === 'done' ? (open ? 'Hide insight' : 'Show insight') : 'Explain this'}
        </button>
        {status === 'done' && open && (
          <button onClick={dismiss} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14, padding: '2px 4px', fontFamily: 'var(--font-ui)' }}>×</button>
        )}
      </div>

      {/* Narrative panel */}
      {open && (status === 'loading' || text) && (
        <div style={{
          marginTop:    10,
          padding:      '12px 14px',
          background:   'rgba(125,211,252,0.05)',
          border:       '1px solid rgba(125,211,252,0.15)',
          borderRadius: 6,
        }}>
          <div style={{ fontSize: 9, color: 'var(--cyan)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>✦ AI INSIGHT</div>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7, fontFamily: 'var(--font-ui)' }}>
            {text || ' '}
            {status === 'loading' && <span style={{ color: 'var(--cyan)', animation: 'pulse 1s infinite' }}>▌</span>}
          </p>
        </div>
      )}
    </div>
  )
}
