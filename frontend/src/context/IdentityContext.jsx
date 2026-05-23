import { createContext, useContext, useMemo } from 'react'
import { useAuth0 } from '@auth0/auth0-react'

const ALLOWLIST = {
  'vs@artifidata.ai':                       'owner',
  'vsrinivasanniatl@gmail.com':             'owner',
  'sreeraghavendradmd@gmail.com':           'owner',
  'vsrin@yahoo.com':                        'owner',
  'patrick.kennedy@allsourceinvest.com':    'advisor'
}

const IdentityContext = createContext({ email: null, role: 'owner', name: 'Vinod' })

export function IdentityProvider({ children }) {
  const { user, isAuthenticated } = useAuth0()

  const value = useMemo(() => {
    if (!isAuthenticated || !user?.email) return { email: null, role: 'owner', name: 'Vinod' }
    const email = user.email.toLowerCase()
    const role  = ALLOWLIST[email] || 'denied'
    const name  = role === 'advisor' ? 'Patrick' : 'Vinod'
    return { email, role, name }
  }, [isAuthenticated, user])

  return (
    <IdentityContext.Provider value={value}>
      {children}
    </IdentityContext.Provider>
  )
}

export const useIdentity = () => useContext(IdentityContext)
