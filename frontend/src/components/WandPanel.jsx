import { useState, useCallback } from 'react'

export default function WandPanel({ buildPrompt }) {
  const [open, setOpen]     = useState(false)
  const [status, setStatus] = useState('idle')   // idle | loading | done
  const [text, setText]     = useState('')

  const handleClick = useCallback(async (e) => {
    e.stopPropagation()
    // If already generated, just re-open the modal
    if (status === 'done' && text) { setOpen(true); return }

    const prompt = buildPrompt()
    if (!prompt) return

    setOpen(true)
    setStatus('loading')
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
      setText('⚠️ Unable to reach AI service. Check the GROQ API key in Cloudflare.')
      setStatus('idle')
    }
  }, [status, text, buildPrompt])

  const close = (e) => { e?.stopPropagation(); setOpen(false) }

  return (
    <>
      {/* ── Wand trigger — absolute, top-right corner of the card ── */}
      <button
        onClick={handleClick}
        title="AI insight"
        style={{
          position:   'absolute',
          top:        10,
          right:      10,
          width:      22,
          height:     22,
          borderRadius: '50%',
          border:     `1px solid ${status === 'done' ? 'var(--cyan)' : 'var(--border)'}`,
          background: status === 'done' ? 'rgba(125,211,252,0.12)' : 'var(--bg-input)',
          color:      status === 'done' ? 'var(--cyan)' : 'var(--text-muted)',
          cursor:     status === 'loading' ? 'wait' : 'pointer',
          fontSize:   11,
          display:    'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex:     2,
          transition: 'border-color 0.15s, color 0.15s, background 0.15s',
          padding:    0,
          lineHeight: 1,
        }}
        onMouseEnter={e => { if (status !== 'loading') { e.currentTarget.style.borderColor = 'var(--cyan)'; e.currentTarget.style.color = 'var(--cyan)' }}}
        onMouseLeave={e => { if (status !== 'done') { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}}
      >
        {status === 'loading' ? '⟳' : '✦'}
      </button>

      {/* ── Modal ── */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            onClick={close}
            style={{
              position: 'fixed', inset: 0, zIndex: 1000,
              background: 'rgba(0,0,0,0.55)',
              backdropFilter: 'blur(2px)',
            }}
          />
          {/* Modal panel */}
          <div style={{
            position:     'fixed',
            top:          '50%',
            left:         '50%',
            transform:    'translate(-50%, -50%)',
            zIndex:       1001,
            width:        580,
            maxWidth:     '92vw',
            maxHeight:    '70vh',
            background:   '#ffffff',
            borderRadius: 10,
            boxShadow:    '0 24px 64px rgba(0,0,0,0.35)',
            display:      'flex',
            flexDirection:'column',
            overflow:     'hidden',
          }}>
            {/* Header */}
            <div style={{
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'space-between',
              padding:        '16px 20px',
              borderBottom:   '1px solid #e2e8f0',
              background:     '#f8fafc',
              flexShrink:     0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#2563eb', fontSize: 13 }}>✦</span>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#64748b' }}>AI Insight</span>
              </div>
              <button
                onClick={close}
                style={{
                  background: 'none', border: '1px solid #e2e8f0',
                  borderRadius: 4, color: '#94a3b8',
                  cursor: 'pointer', width: 26, height: 26,
                  fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >×</button>
            </div>
            {/* Body */}
            <div style={{ padding: '20px 24px', overflowY: 'auto' }}>
              {status === 'loading' && !text ? (
                <div style={{ color: '#64748b', fontSize: 13, fontStyle: 'italic' }}>Generating insight…</div>
              ) : (
                <p style={{ margin: 0, fontSize: 14, color: '#1e293b', lineHeight: 1.75, fontFamily: 'system-ui, sans-serif' }}>
                  {text}
                  {status === 'loading' && <span style={{ color: '#2563eb' }}>▌</span>}
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}
