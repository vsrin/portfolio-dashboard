export default function AccessDenied({ email, onLogout }) {
  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg-base)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-ui)',
    }}>
      <div style={{
        background: 'var(--bg-surface)', border: '1px solid var(--border)',
        borderRadius: 10, padding: '40px 48px', maxWidth: 400, textAlign: 'center',
      }}>
        <div style={{ fontSize: 32, marginBottom: 16 }}>🚫</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
          Access Not Authorized
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 24 }}>
          {email
            ? <><strong style={{ color: 'var(--text-secondary)' }}>{email}</strong> is not on the access list for this dashboard.</>
            : 'Your account is not authorized to view this dashboard.'
          }
        </div>
        <button
          onClick={onLogout}
          style={{
            background: 'var(--cyan)', color: '#000', border: 'none',
            borderRadius: 5, padding: '8px 20px', fontSize: 12, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'var(--font-ui)', letterSpacing: '0.04em',
          }}
        >
          Sign Out
        </button>
      </div>
    </div>
  )
}
