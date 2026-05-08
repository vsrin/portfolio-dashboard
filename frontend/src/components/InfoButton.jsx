import { useInfo } from '../context/InfoContext'

export default function InfoButton({ title, content }) {
  const { showInfo } = useInfo()
  return (
    <button
      onClick={(e) => { e.stopPropagation(); showInfo(title, content) }}
      title="What does this mean?"
      style={{
        background: 'none',
        border: '1px solid var(--border)',
        color: 'var(--text-muted)',
        cursor: 'pointer',
        width: 18, height: 18, borderRadius: '50%',
        fontSize: 10, fontWeight: 700,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        lineHeight: 1,
        padding: 0,
        fontFamily: 'var(--font-ui)',
        marginLeft: 6,
        transition: 'border-color 0.15s, color 0.15s',
        verticalAlign: 'middle',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--cyan)'; e.currentTarget.style.color = 'var(--cyan)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}
    >i</button>
  )
}
