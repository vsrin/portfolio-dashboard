import { useState, useEffect } from 'react'
import { verifyInsightsToken, getInsightsTokenFromUrl, clearInsightsTokenFromUrl } from '../utils/insightsAuth'

const SESSION_KEY = 'portfolio_insights_access'

export default function InsightsAccessGate({ role, children }) {
  const [authorized, setAuthorized] = useState(
    () => sessionStorage.getItem(SESSION_KEY) === 'true'
  )

  useEffect(() => {
    const token = getInsightsTokenFromUrl()
    if (!token) return
    verifyInsightsToken(token).then(valid => {
      if (valid) {
        sessionStorage.setItem(SESSION_KEY, 'true')
        setAuthorized(true)
      }
      clearInsightsTokenFromUrl()
    })
  }, [])

  if (role === 'owner' || authorized) return children

  return (
    <div style={{ position: 'relative', minHeight: 400 }}>
      {/* blurred content beneath */}
      <div style={{ filter: 'blur(6px)', pointerEvents: 'none', userSelect: 'none', opacity: 0.5 }}>
        {children}
      </div>

      {/* overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 14,
        background: 'rgba(var(--bg-base-rgb, 15, 20, 35), 0.55)',
        backdropFilter: 'blur(2px)',
        borderRadius: 8,
      }}>
        <div style={{ fontSize: 28 }}>🔒</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', textAlign: 'center' }}>
          Client Insights — Restricted
        </div>
        <div style={{
          fontSize: 12, color: 'var(--text-muted)', textAlign: 'center',
          maxWidth: 340, lineHeight: 1.6,
        }}>
          This section contains personal financial analysis prepared for the account holder.
          Request a shareable link from Vinod to view this content.
        </div>
      </div>
    </div>
  )
}
