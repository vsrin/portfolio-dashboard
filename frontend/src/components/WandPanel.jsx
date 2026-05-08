import { useState, useCallback } from 'react'

function renderMarkdown(text) {
  if (!text) return null
  const lines = text.split('\n')
  const out = []
  let key = 0

  const inline = (str) => {
    const parts = str.split(/(\*\*[^*]+\*\*)/)
    return parts.map((p, j) =>
      p.startsWith('**') && p.endsWith('**')
        ? <strong key={j} style={{ color: '#0f172a', fontWeight: 700 }}>{p.slice(2, -2)}</strong>
        : p
    )
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line === '') { out.push(<div key={key++} style={{ height: 10 }} />); continue }

    if (line.startsWith('### ')) {
      out.push(<p key={key++} style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#64748b', margin: '14px 0 4px' }}>{line.slice(4)}</p>)
      continue
    }
    if (line.startsWith('**') && line.endsWith('**') && !line.slice(2, -2).includes('**')) {
      out.push(<p key={key++} style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#2563eb', margin: '14px 0 4px' }}>{line.slice(2, -2)}</p>)
      continue
    }
    if (line.startsWith('- ') || line.startsWith('• ')) {
      out.push(
        <div key={key++} style={{ display: 'flex', gap: 8, margin: '3px 0' }}>
          <span style={{ color: '#2563eb', flexShrink: 0, marginTop: 1 }}>•</span>
          <span style={{ fontSize: 13, color: '#334155', lineHeight: 1.65 }}>{inline(line.slice(2))}</span>
        </div>
      )
      continue
    }
    out.push(<p key={key++} style={{ margin: '4px 0', fontSize: 13.5, color: '#1e293b', lineHeight: 1.75 }}>{inline(line)}</p>)
  }
  return out
}

export default function WandPanel({ buildPrompt }) {
  const [open, setOpen]     = useState(false)
  const [status, setStatus] = useState('idle')
  const [text, setText]     = useState('')

  const handleClick = useCallback(async (e) => {
    e.stopPropagation()
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
            if (parsed.error) { acc = `**Error:** ${parsed.error}`; setText(acc); break }
          } catch {}
        }
      }
      setStatus('done')
    } catch {
      setText('**Error:** Unable to reach AI service. Check the GROQ API key in Cloudflare settings.')
      setStatus('idle')
    }
  }, [status, text, buildPrompt])

  const close = (e) => { e?.stopPropagation(); setOpen(false) }

  return (
    <>
      {/* Wand trigger — absolute top-right corner */}
      <button
        onClick={handleClick}
        title="AI Advisory Insight"
        style={{
          position:   'absolute', top: 10, right: 10,
          width: 22, height: 22, borderRadius: '50%',
          border:     `1px solid ${status === 'done' ? '#2563eb' : 'var(--border)'}`,
          background: status === 'done' ? 'rgba(37,99,235,0.08)' : 'var(--bg-input)',
          color:      status === 'done' ? '#2563eb' : 'var(--text-muted)',
          cursor:     status === 'loading' ? 'wait' : 'pointer',
          fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 2, padding: 0, lineHeight: 1,
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => { if (status !== 'loading') { e.currentTarget.style.borderColor = '#2563eb'; e.currentTarget.style.color = '#2563eb' }}}
        onMouseLeave={e => { if (status !== 'done') { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}}
      >
        {status === 'loading' ? '⟳' : '✦'}
      </button>

      {/* Modal */}
      {open && (
        <>
          <div onClick={close} style={{ position: 'fixed', inset: 0, zIndex: 1000 }} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 1001, width: 620, maxWidth: '94vw', maxHeight: '75vh',
            background: '#ffffff', borderRadius: 12,
            boxShadow: '0 32px 80px rgba(0,0,0,0.4)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 20px', borderBottom: '1px solid #e2e8f0',
              background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%)',
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#93c5fd', fontSize: 14 }}>✦</span>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#bfdbfe' }}>Advisory Insight</span>
              </div>
              <button onClick={close} style={{
                background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)',
                borderRadius: 4, color: '#e2e8f0', cursor: 'pointer',
                width: 26, height: 26, fontSize: 15,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>×</button>
            </div>

            {/* Body */}
            <div style={{ padding: '20px 24px 24px', overflowY: 'auto', flex: 1 }}>
              {status === 'loading' && !text ? (
                <div style={{ color: '#94a3b8', fontSize: 13, fontStyle: 'italic', paddingTop: 4 }}>
                  Generating advisory insight…
                </div>
              ) : (
                <div>
                  {renderMarkdown(text)}
                  {status === 'loading' && <span style={{ color: '#2563eb', fontSize: 14 }}>▌</span>}
                </div>
              )}
            </div>

            {/* Footer */}
            {status === 'done' && (
              <div style={{
                padding: '10px 20px', borderTop: '1px solid #f1f5f9',
                background: '#f8fafc', flexShrink: 0,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{ fontSize: 10, color: '#94a3b8', letterSpacing: '0.05em' }}>
                  AI-generated · verify figures against the dashboard before acting
                </span>
                <button onClick={close} style={{
                  background: '#1d4ed8', border: 'none', borderRadius: 5,
                  color: '#fff', cursor: 'pointer', padding: '6px 16px',
                  fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-ui)',
                }}>Done</button>
              </div>
            )}
          </div>
        </>
      )}
    </>
  )
}
