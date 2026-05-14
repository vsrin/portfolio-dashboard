import { useState } from 'react'
import { useIdentity } from '../context/IdentityContext'

const SESSION_KEY = 'portfolio_insights_unlocked'

export default function NarrativeBlur({ children }) {
  const { role } = useIdentity()
  const [authorized] = useState(() => sessionStorage.getItem(SESSION_KEY) === 'true')

  if (role === 'owner' || authorized) return <>{children}</>
  return (
    <div style={{ filter: 'blur(5px)', userSelect: 'none', pointerEvents: 'none', borderRadius: 3 }}>
      {children}
    </div>
  )
}
