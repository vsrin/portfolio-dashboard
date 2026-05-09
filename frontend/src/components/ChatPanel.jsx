import { useState, useRef, useEffect } from 'react'

const WELCOME = {
  role: 'assistant',
  content: `Hello! I'm your Portfolio Intelligence AI, powered by LLaMA 3.3 via Groq.

I have full context on your Srinivasan household portfolio as of **May 5, 2026**, including:
- All 20 asset class values, gains, and returns
- Every KPI formula (AUM, net gain, IRR, fees, fee drag)
- The two data sources: Tamarac CSV ledger + AllSource portal snapshot
- Fee breakdown by account and month

Try asking me:
• *"How is the 20.74% return calculated?"*
• *"Why is gross gain $27K higher than net gain?"*
• *"Break down the fee drag formula"*
• *"Which equity class performed best and why?"*
• *"What's in Private Equity and what's the return?"*`,
}

function renderContent(text) {
  const lines = text.split('\n')
  const out = []
  let key = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (line === '') {
      out.push(<div key={key++} style={{ height: 8 }} />)
      continue
    }

    // Horizontal rule
    if (/^[-─]{3,}$/.test(line.trim())) {
      out.push(<hr key={key++} style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '8px 0' }} />)
      continue
    }

    // Table row (pipe-delimited)
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      const cells = line.trim().slice(1, -1).split('|').map(c => c.trim())
      const isSep = cells.every(c => /^[-:]+$/.test(c))
      if (isSep) continue
      out.push(
        <div key={key++} style={{ display: 'flex', gap: 0, fontSize: 11, marginBottom: 2 }}>
          {cells.map((cell, ci) => (
            <div key={ci} style={{
              flex: 1,
              padding: '3px 6px',
              background: ci === 0 ? 'rgba(255,255,255,0.04)' : 'transparent',
              borderBottom: '1px solid var(--border)',
              color: 'var(--text-secondary)',
              fontFamily: /^\$|%|[+\-]\d/.test(cell) ? 'var(--font-mono)' : 'var(--font-ui)',
              color: /^\+/.test(cell) ? 'var(--green)' : /^-\d/.test(cell) ? 'var(--red)' : 'var(--text-secondary)',
            }}>
              {inlineFormat(cell)}
            </div>
          ))}
        </div>
      )
      continue
    }

    // Bullet / list
    const bulletMatch = line.match(/^(\s*)[•\-\*]\s+(.+)/)
    if (bulletMatch) {
      const indent = bulletMatch[1].length
      out.push(
        <div key={key++} style={{ display: 'flex', gap: 6, marginBottom: 2, paddingLeft: indent * 8 }}>
          <span style={{ color: 'var(--cyan)', flexShrink: 0, marginTop: 1 }}>•</span>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {inlineFormat(bulletMatch[2])}
          </span>
        </div>
      )
      continue
    }

    // Heading
    const headingMatch = line.match(/^(#{1,3})\s+(.+)/)
    if (headingMatch) {
      const level = headingMatch[1].length
      out.push(
        <div key={key++} style={{
          fontSize: level === 1 ? 13 : level === 2 ? 12 : 11,
          fontWeight: 700,
          color: level === 1 ? 'var(--cyan)' : 'var(--text-primary)',
          letterSpacing: level >= 2 ? '0.06em' : 0,
          textTransform: level >= 2 ? 'uppercase' : 'none',
          marginTop: level === 1 ? 12 : 8,
          marginBottom: 4,
        }}>
          {headingMatch[2]}
        </div>
      )
      continue
    }

    // Normal line
    out.push(
      <div key={key++} style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: 1 }}>
        {inlineFormat(line)}
      </div>
    )
  }

  return out
}

function inlineFormat(text) {
  // Split on **bold**, *italic*, `code`
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={i} style={{ color: 'var(--text-secondary)' }}>{part.slice(1, -1)}</em>
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          background: 'rgba(0,212,255,0.08)',
          color: 'var(--cyan)',
          padding: '0 4px',
          borderRadius: 3,
        }}>
          {part.slice(1, -1)}
        </code>
      )
    }
    return part
  })
}

function Message({ msg, isStreaming }) {
  const isUser = msg.role === 'user'
  return (
    <div style={{
      display: 'flex',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom: 12,
    }}>
      {!isUser && (
        <div style={{
          width: 22, height: 22,
          background: 'linear-gradient(135deg, var(--cyan), var(--cyan-dim))',
          borderRadius: 4,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 9, fontWeight: 800, color: '#070b14',
          fontFamily: 'var(--font-mono)',
          flexShrink: 0, marginRight: 8, marginTop: 2,
        }}>AI</div>
      )}
      <div style={{
        maxWidth: '88%',
        background: isUser ? 'rgba(0,212,255,0.10)' : 'var(--bg-surface)',
        border: `1px solid ${isUser ? 'rgba(0,212,255,0.25)' : 'var(--border)'}`,
        borderRadius: isUser ? '10px 10px 2px 10px' : '2px 10px 10px 10px',
        padding: '10px 14px',
      }}>
        {isUser ? (
          <div style={{ fontSize: 12, color: 'var(--cyan)', lineHeight: 1.5 }}>{msg.content}</div>
        ) : (
          <div>
            {renderContent(msg.content)}
            {isStreaming && (
              <span style={{
                display: 'inline-block', width: 6, height: 12,
                background: 'var(--cyan)', borderRadius: 1,
                animation: 'blink 1s step-end infinite',
                marginLeft: 2, verticalAlign: 'middle',
              }} />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function ChatPanel() {
  const [open, setOpen]         = useState(false)
  const [messages, setMessages] = useState([WELCOME])
  const [input, setInput]       = useState('')
  const [streaming, setStreaming] = useState(false)
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150)
  }, [open])

  const send = async () => {
    const text = input.trim()
    if (!text || streaming) return

    const userMsg   = { role: 'user', content: text }
    const history   = messages.filter(m => m !== WELCOME)
    setMessages(prev => [...prev, userMsg, { role: 'assistant', content: '' }])
    setInput('')
    setStreaming(true)

    try {
      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: history.map(m => ({ role: m.role, content: m.content })),
        }),
      })

      const reader  = resp.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue
          const payload = line.slice(6)
          if (payload.trim() === '[DONE]') break
          try {
            const parsed = JSON.parse(payload)
            if (parsed.error) {
              accumulated = `⚠️ ${parsed.error}`
            } else if (parsed.token) {
              accumulated += parsed.token
            }
            setMessages(prev => {
              const updated = [...prev]
              updated[updated.length - 1] = { role: 'assistant', content: accumulated }
              return updated
            })
          } catch {}
        }
      }
    } catch (err) {
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = { role: 'assistant', content: `⚠️ Network error: ${err.message}` }
        return updated
      })
    } finally {
      setStreaming(false)
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <>
      {/* Blink animation */}
      <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>

      {/* Floating trigger button */}
      <button
        className="chat-trigger"
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'fixed',
          bottom: 28,
          right: 28,
          zIndex: 1000,
          background: open ? 'var(--bg-card)' : 'linear-gradient(135deg, var(--cyan), var(--cyan-dim))',
          border: open ? '1px solid var(--border-light)' : 'none',
          borderRadius: 12,
          color: open ? 'var(--text-muted)' : '#070b14',
          padding: '10px 18px',
          fontSize: 12,
          fontWeight: 800,
          fontFamily: 'var(--font-mono)',
          cursor: 'pointer',
          letterSpacing: '0.06em',
          boxShadow: open ? 'none' : '0 0 24px rgba(0,212,255,0.30)',
          transition: 'all 0.2s',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span style={{ fontSize: 14 }}>{open ? '✕' : '✦'}</span>
        {open ? 'CLOSE' : 'AI CHAT'}
      </button>

      {/* Panel */}
      {open && (
        <div className="chat-panel" style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 440,
          zIndex: 999,
          background: 'var(--bg-surface)',
          borderLeft: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-8px 0 40px rgba(0,0,0,0.6)',
        }}>
          {/* Header */}
          <div style={{
            padding: '14px 18px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-card)',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 28, height: 28,
                background: 'linear-gradient(135deg, var(--cyan), var(--cyan-dim))',
                borderRadius: 6,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 800, color: '#070b14',
                fontFamily: 'var(--font-mono)',
              }}>AI</div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.04em' }}>
                  PORTFOLIO AI
                </div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.06em', marginTop: 1 }}>
                  GROQ · LLAMA 3.3 70B · FULL CONTEXT
                </div>
              </div>
            </div>
            <button
              onClick={() => { setMessages([WELCOME]); setInput('') }}
              style={{
                background: 'none', border: '1px solid var(--border)',
                borderRadius: 4, color: 'var(--text-muted)',
                padding: '3px 10px', fontSize: 10, cursor: 'pointer',
                letterSpacing: '0.06em',
              }}
            >
              CLEAR
            </button>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 14px',
          }}>
            {messages.map((msg, i) => (
              <Message
                key={i}
                msg={msg}
                isStreaming={streaming && i === messages.length - 1 && msg.role === 'assistant'}
              />
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input area */}
          <div style={{
            padding: '12px 14px',
            borderTop: '1px solid var(--border)',
            background: 'var(--bg-card)',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Ask about any KPI, formula, or asset class…"
                rows={2}
                style={{
                  flex: 1,
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-ui)',
                  fontSize: 12,
                  padding: '8px 10px',
                  resize: 'none',
                  outline: 'none',
                  lineHeight: 1.5,
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--cyan)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
              <button
                onClick={send}
                disabled={!input.trim() || streaming}
                style={{
                  background: (!input.trim() || streaming) ? 'var(--bg-input)' : 'var(--cyan)',
                  border: 'none',
                  borderRadius: 6,
                  color: (!input.trim() || streaming) ? 'var(--text-muted)' : '#070b14',
                  padding: '8px 14px',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: (!input.trim() || streaming) ? 'not-allowed' : 'pointer',
                  letterSpacing: '0.06em',
                  alignSelf: 'stretch',
                  transition: 'all 0.15s',
                  fontFamily: 'var(--font-ui)',
                  whiteSpace: 'nowrap',
                }}
              >
                {streaming ? '…' : 'SEND'}
              </button>
            </div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 6, letterSpacing: '0.04em' }}>
              Enter to send · Shift+Enter for new line
            </div>
          </div>
        </div>
      )}
    </>
  )
}
