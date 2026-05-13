import { useAuth0 } from '@auth0/auth0-react'

export default function LoginScreen() {
  const { loginWithRedirect, isLoading, error } = useAuth0()

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-base)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        width: '100%',
        maxWidth: 400,
        padding: '0 24px',
      }}>
        {/* Logo / title */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            fontFamily: 'var(--font-ui)',
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: 'var(--cyan)',
            marginBottom: 8,
          }}>
            AllSource Advisory
          </div>
          <div style={{
            fontFamily: 'var(--font-ui)',
            fontSize: 22,
            fontWeight: 700,
            color: 'var(--text-primary)',
            marginBottom: 6,
          }}>
            Portfolio Dashboard
          </div>
          <div style={{
            fontSize: 12,
            color: 'var(--text-muted)',
          }}>
            Srinivasan Household · Private Access
          </div>
        </div>

        {/* Login card */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: '32px 28px',
        }}>
          <div style={{
            fontSize: 13,
            color: 'var(--text-secondary)',
            textAlign: 'center',
            marginBottom: 24,
            lineHeight: 1.6,
          }}>
            Sign in with your Google account to access your portfolio.
          </div>

          {error && (
            <div style={{
              padding: '10px 14px',
              borderRadius: 6,
              background: 'rgba(255,69,96,0.08)',
              border: '1px solid rgba(255,69,96,0.25)',
              fontSize: 12,
              color: 'var(--red)',
              marginBottom: 20,
              textAlign: 'center',
            }}>
              {error.message}
            </div>
          )}

          <button
            onClick={() => loginWithRedirect()}
            disabled={isLoading}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              padding: '12px 20px',
              borderRadius: 7,
              border: '1px solid var(--border)',
              background: 'var(--bg-input)',
              color: 'var(--text-primary)',
              fontSize: 13,
              fontWeight: 600,
              fontFamily: 'var(--font-ui)',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.6 : 1,
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { if (!isLoading) e.currentTarget.style.borderColor = 'var(--cyan)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
          >
            {/* Google icon */}
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
              <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
              <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
              <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
            </svg>
            {isLoading ? 'Connecting…' : 'Continue with Google'}
          </button>
        </div>

        <div style={{
          textAlign: 'center',
          marginTop: 24,
          fontSize: 11,
          color: 'var(--text-muted)',
        }}>
          Private dashboard · Authorised users only
        </div>
      </div>
    </div>
  )
}
