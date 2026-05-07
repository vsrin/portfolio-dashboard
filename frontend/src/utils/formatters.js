export const fmt$ = (v, decimals = 0) =>
  v == null
    ? '—'
    : new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(v)

export const fmtPct = (v, decimals = 2) =>
  v == null ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(decimals)}%`

export const fmtNum = (v, decimals = 0) =>
  v == null
    ? '—'
    : new Intl.NumberFormat('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(v)

export const fmtDate = (iso) => {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${m}/${d}/${y}`
}

export const fmtShortDate = (ym) => {
  if (!ym) return ''
  const [y, m] = ym.split('-')
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${months[parseInt(m) - 1]} '${y.slice(2)}`
}

export const sign = (v) => (v > 0 ? '+' : '')

export const colorClass = (v) => (v > 0 ? 'positive' : v < 0 ? 'negative' : 'neutral')
