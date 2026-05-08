import { createContext, useContext, useState } from 'react'

const InfoContext = createContext(null)

export function InfoProvider({ children }) {
  const [panel, setPanel] = useState(null) // null | { title, content }

  const showInfo = (title, content) => setPanel({ title, content })
  const hideInfo = () => setPanel(null)

  return (
    <InfoContext.Provider value={{ panel, showInfo, hideInfo }}>
      {children}
    </InfoContext.Provider>
  )
}

export function useInfo() {
  return useContext(InfoContext)
}
