import { useState, useEffect } from 'react'

// In production (Cloudflare Pages), fetch pre-baked JSON from /data/*.json.
// In dev, proxy through Vite to the FastAPI backend on localhost:8765.
const IS_STATIC = import.meta.env.PROD

function resolveUrl(endpoint) {
  if (IS_STATIC) {
    // /summary → /data/summary.json
    const name = endpoint.replace(/^\//, '').replace(/\//g, '-')
    return `/data/${name}.json`
  }
  return `/api${endpoint}`
}

export function useApi(endpoint, deps = []) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch(resolveUrl(endpoint))
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((d) => { setData(d); setLoading(false) })
      .catch((e) => { setError(e.message); setLoading(false) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { data, loading, error }
}
