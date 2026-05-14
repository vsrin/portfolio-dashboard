const SECRET = import.meta.env.VITE_INSIGHTS_SECRET || 'portfolio-insights-dev'

async function sha256hex(message) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(message))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function todayKey() {
  return new Date().toISOString().slice(0, 10)   // YYYY-MM-DD
}

export async function generateInsightsToken() {
  return sha256hex(`${SECRET}:${todayKey()}`)
}

export async function verifyInsightsToken(token) {
  if (!token) return false
  const expected = await generateInsightsToken()
  return token === expected
}

export function getInsightsTokenFromUrl() {
  return new URLSearchParams(window.location.search).get('insights')
}

export function clearInsightsTokenFromUrl() {
  const url = new URL(window.location)
  url.searchParams.delete('insights')
  window.history.replaceState({}, '', url)
}
