import { useInfo } from '../context/InfoContext'

export default function InfoDrawer() {
  const { panel, hideInfo } = useInfo()
  const open = !!panel

  // Parse simple markdown: **bold**, `code`, and \n\n for paragraphs
  function renderContent(text) {
    if (!text) return null
    return text.split('\n\n').map((para, i) => {
      const parts = para.split(/(\*\*[^*]+\*\*|`[^`]+`)/)
      return (
        <p key={i} style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          {parts.map((part, j) => {
            if (part.startsWith('**') && part.endsWith('**'))
              return <strong key={j} style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{part.slice(2, -2)}</strong>
            if (part.startsWith('`') && part.endsWith('`'))
              return <code key={j} style={{ fontFamily: 'var(--font-mono)', fontSize: 12, background: 'var(--bg-input)', padding: '1px 5px', borderRadius: 3, color: 'var(--cyan)' }}>{part.slice(1, -1)}</code>
            return part
          })}
        </p>
      )
    })
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={hideInfo}
        style={{
          position: 'fixed', inset: 0, zIndex: 998,
          background: 'rgba(0,0,0,0.35)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 0.25s ease',
        }}
      />
      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 999,
        width: 420,
        background: 'var(--bg-card)',
        borderLeft: '1px solid var(--border)',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.25)',
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
        display: 'flex', flexDirection: 'column',
        overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          padding: '20px 20px 16px',
          borderBottom: '1px solid var(--border)',
          gap: 12,
          position: 'sticky', top: 0,
          background: 'var(--bg-card)',
          zIndex: 1,
        }}>
          <div>
            <div style={{ fontSize: 9, color: 'var(--cyan)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>HOW TO READ THIS</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>{panel?.title}</div>
          </div>
          <button
            onClick={hideInfo}
            style={{
              background: 'var(--bg-input)', border: '1px solid var(--border)',
              color: 'var(--text-muted)', cursor: 'pointer',
              width: 28, height: 28, borderRadius: 4, flexShrink: 0,
              fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-ui)',
            }}
          >&times;</button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px' }}>
          {renderContent(panel?.content)}
        </div>
      </div>
    </>
  )
}
