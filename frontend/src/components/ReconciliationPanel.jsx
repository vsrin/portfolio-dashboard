import { useApi } from '../hooks/useApi'
import { fmt$ } from '../utils/formatters'

const PERIODS = ['mtd', 'qtd', 'ytd']
const PERIOD_LABELS = { mtd: 'MTD', qtd: 'QTD', ytd: 'YTD' }

const TOLERANCE = 1.0

function isMatch(a, b) {
  if (a == null || b == null) return true
  return Math.abs(a - b) <= TOLERANCE
}

function fmtPct(v) {
  if (v == null) return '—'
  return `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`
}

function allReconciled(data) {
  return PERIODS.every((p) => {
    const evMatch  = isMatch(data.allsource[p]['Ending Value'], data.dashboard[p]['Ending Value'])
    const irrMatch = isMatch(data.allsource[p]['Net IRR'], data.dashboard[p]['Net IRR'])
    return evMatch && irrMatch
  })
}

function ValCell({ value, color, bold }) {
  return (
    <td style={{
      fontFamily: 'var(--font-mono)',
      fontSize: 12,
      fontWeight: bold ? 700 : 500,
      color: color || 'var(--text-primary)',
      textAlign: 'right',
      padding: '5px 10px',
      whiteSpace: 'nowrap',
    }}>
      {value}
    </td>
  )
}

function StatusCell({ match }) {
  return (
    <td style={{
      textAlign: 'center',
      padding: '5px 10px',
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      fontWeight: 700,
      color: match ? 'var(--green)' : 'var(--red)',
    }}>
      {match ? '✓ MATCH' : '⚠ GAP'}
    </td>
  )
}

export default function ReconciliationPanel() {
  const { data, loading, error } = useApi('/reconciliation')

  if (loading) return (
    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
      Loading reconciliation…
    </div>
  )
  if (error || !data) return null

  const as = data.allsource
  const db = data.dashboard
  const fullyReconciled = allReconciled(data)

  const rows = [
    {
      label: 'Start Value',
      key: 'Start Value',
      fmt: (v) => fmt$(v, 0),
      color: 'var(--text-secondary)',
    },
    {
      label: '+ Net Contributions & Withdrawals',
      key: 'Net Contributions & Withdrawals',
      fmt: (v) => v === 0 ? '—' : fmt$(v, 0),
      color: (v) => v > 0 ? 'var(--green)' : v < 0 ? 'var(--red)' : 'var(--text-muted)',
    },
    {
      label: '+ Transfers',
      key: 'Transfers',
      fmt: (v) => v === 0 ? '—' : fmt$(v, 0),
      color: (v) => v !== 0 ? 'var(--text-secondary)' : 'var(--text-muted)',
    },
    {
      label: '+ Change in Securities',
      key: '__change_in_securities',
      fmt: (v) => fmt$(v, 0),
      color: (v) => v >= 0 ? 'var(--green)' : 'var(--red)',
    },
    {
      label: '+ Dividend Income',
      key: 'Dividend Income',
      fmt: (v) => v === 0 ? '—' : fmt$(v, 0),
      color: (v) => v > 0 ? 'var(--cyan)' : 'var(--text-muted)',
    },
    {
      label: '+ Interest Income',
      key: 'Interest Income',
      fmt: (v) => v === 0 ? '—' : fmt$(v, 0),
      color: (v) => v > 0 ? 'var(--cyan)' : 'var(--text-muted)',
    },
    {
      label: '− Management Fees',
      key: 'Management Fees',
      fmt: (v) => v === 0 ? '—' : fmt$(v, 0),
      color: 'var(--red)',
    },
    {
      label: '− Other Expenses',
      key: 'Other Expenses',
      fmt: (v) => v === 0 ? '—' : fmt$(v, 0),
      color: 'var(--red)',
    },
    {
      label: '= Ending Value',
      key: 'Ending Value',
      fmt: (v) => fmt$(v, 0),
      color: 'var(--text-primary)',
      bold: true,
      separator: true,
    },
    {
      label: 'Investment Gain',
      key: 'Investment Gain',
      fmt: (v) => v == null ? '—' : fmt$(v, 0),
      color: (v) => v >= 0 ? 'var(--green)' : 'var(--red)',
      bold: true,
    },
    {
      label: 'Net IRR',
      key: 'Net IRR',
      fmt: (v) => fmtPct(v),
      color: 'var(--cyan)',
      bold: true,
    },
  ]

  function getValue(period, key) {
    if (key === '__change_in_securities') {
      const held = as[period]['Change in Value of Securities Held'] ?? 0
      const sold = as[period]['Change in Value of Securities Sold'] ?? 0
      return held + sold
    }
    return as[period][key]
  }

  function resolveColor(colorDef, value) {
    return typeof colorDef === 'function' ? colorDef(value) : colorDef
  }

  return (
    <div className="card">
      <style>{`
        .recon-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }
        .recon-table th {
          text-align: right;
          padding: 6px 10px;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.07em;
          color: var(--text-muted);
          border-bottom: 1px solid var(--border);
        }
        .recon-table th:first-child {
          text-align: left;
        }
        .recon-table td:first-child {
          text-align: left;
          padding: 5px 10px;
          color: var(--text-secondary);
          font-size: 12px;
        }
        .recon-table tr.recon-separator td {
          border-top: 1px solid var(--border);
        }
        .recon-table tr:hover td {
          background: var(--bg-card-hover);
        }
        .recon-status-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
          margin-top: 16px;
        }
        .recon-status-table th {
          text-align: right;
          padding: 6px 10px;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.07em;
          color: var(--text-muted);
          border-bottom: 1px solid var(--border);
        }
        .recon-status-table th:first-child {
          text-align: left;
        }
        .recon-status-table td {
          padding: 6px 10px;
          border-bottom: 1px solid var(--border);
        }
        .recon-status-table td:first-child {
          font-size: 11px;
          color: var(--text-muted);
        }
        .recon-status-table tr.status-row td:first-child {
          font-weight: 700;
          font-size: 11px;
          color: var(--text-secondary);
        }
      `}</style>

      {/* Header */}
      <div className="card-header" style={{ marginBottom: 16 }}>
        <span className="card-title">AllSource Reconciliation</span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
          As of {data.as_of}
        </span>
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          padding: '3px 10px',
          borderRadius: 4,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.05em',
          background: fullyReconciled ? 'rgba(0,230,118,0.12)' : 'rgba(255,82,82,0.12)',
          border: `1px solid ${fullyReconciled ? 'rgba(0,230,118,0.3)' : 'rgba(255,82,82,0.3)'}`,
          color: fullyReconciled ? 'var(--green)' : 'var(--red)',
          marginLeft: 4,
        }}>
          {fullyReconciled ? '✓ Fully Reconciled' : '⚠ Gaps Found'}
        </span>
      </div>

      {/* Waterfall table */}
      <div style={{ overflowX: 'auto' }}>
        <table className="recon-table">
          <thead>
            <tr>
              <th style={{ textAlign: 'left', width: '40%' }}>Line Item</th>
              {PERIODS.map((p) => (
                <th key={p}>{PERIOD_LABELS[p]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const values = PERIODS.map((p) => getValue(p, row.key))
              return (
                <tr key={row.key} className={row.separator ? 'recon-separator' : ''}>
                  <td style={{
                    fontWeight: row.bold ? 700 : 400,
                    color: row.bold ? 'var(--text-primary)' : undefined,
                  }}>
                    {row.label}
                  </td>
                  {values.map((v, i) => (
                    <ValCell
                      key={PERIODS[i]}
                      value={row.fmt(v)}
                      color={resolveColor(row.color, v)}
                      bold={row.bold}
                    />
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Reconciliation status */}
      <table className="recon-status-table">
        <thead>
          <tr>
            <th style={{ textAlign: 'left' }}>Field</th>
            <th style={{ textAlign: 'left' }}>Source</th>
            {PERIODS.map((p) => (
              <th key={p} style={{ textAlign: 'center' }}>{PERIOD_LABELS[p]}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[
            {
              field: 'Ending Value',
              key: 'Ending Value',
              fmt: (v) => fmt$(v, 0),
              irrKey: false,
            },
            {
              field: 'Net IRR',
              key: 'Net IRR',
              fmt: (v) => fmtPct(v),
              irrKey: true,
            },
          ].map(({ field, key, fmt: fmtFn }) => {
            const asValues = PERIODS.map((p) => as[p][key])
            const dbValues = PERIODS.map((p) => db[p][key])
            const matches  = PERIODS.map((_, i) => isMatch(asValues[i], dbValues[i]))

            return [
              <tr key={`${field}-dash`}>
                <td rowSpan={3} style={{ fontWeight: 600, color: 'var(--text-secondary)', verticalAlign: 'middle', borderBottom: '2px solid var(--border)' }}>
                  {field}
                </td>
                <td style={{ color: 'var(--text-muted)' }}>Dashboard</td>
                {dbValues.map((v, i) => (
                  <td key={i} style={{ fontFamily: 'var(--font-mono)', fontSize: 12, textAlign: 'right', padding: '5px 10px', color: 'var(--text-secondary)' }}>
                    {fmtFn(v)}
                  </td>
                ))}
              </tr>,
              <tr key={`${field}-as`}>
                <td style={{ color: 'var(--text-muted)' }}>AllSource</td>
                {asValues.map((v, i) => (
                  <td key={i} style={{ fontFamily: 'var(--font-mono)', fontSize: 12, textAlign: 'right', padding: '5px 10px', color: 'var(--text-secondary)' }}>
                    {fmtFn(v)}
                  </td>
                ))}
              </tr>,
              <tr key={`${field}-status`} className="status-row" style={{ borderBottom: '2px solid var(--border)' }}>
                <td style={{ color: 'var(--text-secondary)', fontWeight: 700 }}>Status</td>
                {matches.map((m, i) => (
                  <StatusCell key={i} match={m} />
                ))}
              </tr>,
            ]
          })}
        </tbody>
      </table>
    </div>
  )
}
