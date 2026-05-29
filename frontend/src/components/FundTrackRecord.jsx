/**
 * FundTrackRecord — side-by-side verification of your position returns vs
 * advisor-provided fund track records (SSPF / RA Capital).
 */
import { useMemo } from 'react'
import { useApi } from '../hooks/useApi'
import '../styles/FundTrackRecord.css'

// ── Hardcoded advisor track records ──────────────────────────────────────────

const SSPF_YEARS  = ['2016','2017','2018','2019','2020','2021','2022','2023','2024','2025']
const SSPF_FUND   = [14.4,  17.6,  16.7,  14.7,  10.2,  14.3,   4.6,   3.1,  20.3,  12.8]
const SP500_ANNUAL= [11.96, 21.83,-4.38,  31.49, 18.40, 28.71,-18.11, 26.29, 25.02, 23.31]
const SSPF_META   = { itd: 12.8, vol_itd: 7.9, beta_itd: 0.07, max_dd: -16.3, win_pct: 81 }

const RA_PERIODS  = ['Jan 2026','5-Year','10-Year','ITD (2004)']
const RA_FUND     = [-0.1, 10.5, 19.8, 20.4]
const RA_IBB      = [ 2.2,  1.7,  7.1, 10.0]
const RA_SP500    = [ 1.4, 15.0, 15.6, 11.1]
const RA_RUS2K    = [ 5.4,  6.1, 11.2,  8.8]

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtRet(v, suffix = '%') {
  if (v == null) return '—'
  const sign = v > 0 ? '+' : ''
  return `${sign}${v.toFixed(2)}${suffix}`
}

function retClass(v) {
  if (v == null) return ''
  return v > 0 ? 'pos' : v < 0 ? 'neg' : 'flat'
}

function Cell({ v, bold }) {
  return (
    <td className={`ftr-num ${retClass(v)}${bold ? ' ftr-bold' : ''}`}>
      {fmtRet(v)}
    </td>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SSPFTable({ yourYtd, yourItd }) {
  const cur2026Ytd = yourYtd != null ? yourYtd : null

  return (
    <div className="ftr-card">
      <div className="ftr-card-header">
        <div>
          <span className="ftr-fund-name">CAIS SSA Strategic Partners</span>
          <span className="ftr-fund-sub"> — SSPF · Hedge Fund</span>
        </div>
        <div className="ftr-your-badge">
          Your position: <strong>{fmtRet(yourItd)}</strong> ITD &nbsp;·&nbsp;
          <strong>{fmtRet(cur2026Ytd)}</strong> YTD 2026
        </div>
      </div>

      <p className="ftr-note">
        Annual net returns as reported by advisor. Your ITD is higher than fund ITD
        because you entered in 2024 — the fund's best year on record.
      </p>

      <div className="ftr-scroll">
        <table className="ftr-table">
          <thead>
            <tr>
              <th>Metric</th>
              {SSPF_YEARS.map(y => <th key={y}>{y}</th>)}
              <th className="ftr-itd-col">ITD</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="ftr-label">SSPF Net Return</td>
              {SSPF_FUND.map((v, i) => <Cell key={i} v={v} />)}
              <Cell v={SSPF_META.itd} bold />
            </tr>
            <tr className="ftr-bench-row">
              <td className="ftr-label">S&amp;P 500</td>
              {SP500_ANNUAL.map((v, i) => <Cell key={i} v={v} />)}
              <td className="ftr-num">—</td>
            </tr>
            <tr>
              <td className="ftr-label">Excess vs S&amp;P</td>
              {SSPF_FUND.map((v, i) => <Cell key={i} v={v - SP500_ANNUAL[i]} />)}
              <td className="ftr-num">—</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="ftr-stats-row">
        <div className="ftr-stat"><span>Volatility ITD</span><strong>{SSPF_META.vol_itd}%</strong></div>
        <div className="ftr-stat"><span>Beta to S&amp;P</span><strong>{SSPF_META.beta_itd}</strong></div>
        <div className="ftr-stat"><span>Max Drawdown</span><strong className="neg">{SSPF_META.max_dd}%</strong></div>
        <div className="ftr-stat"><span>Monthly Win %</span><strong>{SSPF_META.win_pct}%</strong></div>
        <div className="ftr-stat ftr-stat-your"><span>Your 2026 YTD</span><strong className={retClass(cur2026Ytd)}>{fmtRet(cur2026Ytd)}</strong></div>
        <div className="ftr-stat ftr-stat-your"><span>Your ITD</span><strong className={retClass(yourItd)}>{fmtRet(yourItd)}</strong></div>
      </div>
    </div>
  )
}

function RACapitalTable({ yourYtd, yourItd }) {
  return (
    <div className="ftr-card">
      <div className="ftr-card-header">
        <div>
          <span className="ftr-fund-name">RA Capital Healthcare Fund</span>
          <span className="ftr-fund-sub"> — Hedge Fund · Biotech/Healthcare</span>
        </div>
        <div className="ftr-your-badge">
          Your position: <strong>{fmtRet(yourItd)}</strong> ITD &nbsp;·&nbsp;
          <strong>{fmtRet(yourYtd)}</strong> YTD 2026
        </div>
      </div>

      <p className="ftr-note">
        Period returns as reported by RA Capital. "Jan 2026" is the fund's reported
        single-month return; your YTD 2026 covers Jan–May and will differ.
      </p>

      <div className="ftr-scroll">
        <table className="ftr-table">
          <thead>
            <tr>
              <th>Fund / Index</th>
              {RA_PERIODS.map(p => <th key={p}>{p}</th>)}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="ftr-label">RA Capital (FPI)</td>
              {RA_FUND.map((v, i)  => <Cell key={i} v={v} bold={i === RA_PERIODS.length - 1} />)}
            </tr>
            <tr className="ftr-bench-row">
              <td className="ftr-label">IBB Biotech ETF</td>
              {RA_IBB.map((v, i)   => <Cell key={i} v={v} />)}
            </tr>
            <tr className="ftr-bench-row">
              <td className="ftr-label">Russell 2000</td>
              {RA_RUS2K.map((v, i) => <Cell key={i} v={v} />)}
            </tr>
            <tr className="ftr-bench-row">
              <td className="ftr-label">S&amp;P 500</td>
              {RA_SP500.map((v, i) => <Cell key={i} v={v} />)}
            </tr>
            <tr className="ftr-your-row">
              <td className="ftr-label">Your position</td>
              <td className={`ftr-num ${retClass(yourYtd)}`}>{fmtRet(yourYtd)} <span className="ftr-aside">(Jan–May)</span></td>
              <td className="ftr-num">—</td>
              <td className="ftr-num">—</td>
              <td className={`ftr-num ftr-bold ${retClass(yourItd)}`}>{fmtRet(yourItd)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="ftr-note ftr-note-warn">
        5-year trailing return (10.5%) is significantly below the 10-year average (19.8%) and ITD (20.4%).
        The fund has underperformed its own long-run rate for the past 5 years.
      </p>
    </div>
  )
}

function AllFundsTable({ holdings }) {
  const rows = [
    { symbol: 'CXSCHONPTLTD', label: 'CAIS SSA (SSPF)',          type: 'Hedge Fund',      freq: 'Quarterly' },
    { symbol: 'RACAPINTL',    label: 'RA Capital Healthcare',     type: 'Hedge Fund',      freq: 'Quarterly' },
    { symbol: 'VISTAONETELP', label: 'VistaOne (TE)',             type: 'Private Equity',  freq: 'Quarterly' },
    { symbol: '48130F306',    label: 'JPMorgan Private Markets',  type: 'Private Equity',  freq: 'Quarterly' },
    { symbol: 'PRFDIILP',     label: 'PRF Fund II LP',            type: 'Private Credit',  freq: 'Quarterly' },
    { symbol: 'MARSFXLP',     label: 'MARS FX LP',               type: 'Managed Futures', freq: 'Quarterly' },
    { symbol: 'CAZGPOCFTEL',  label: 'Caz GP Ownership F',        type: 'Private Equity',  freq: 'Quarterly' },
    { symbol: 'NORTHHAVIII',  label: 'North Haven Co-Invest',     type: 'Private Equity',  freq: 'Quarterly' },
    { symbol: 'CAZPSOFIIITT', label: 'Caz Pro Sports Fund III',   type: 'Private Equity',  freq: 'Quarterly' },
    { symbol: 'HAMLANVENCAP', label: 'Hamilton Lane VCGF',        type: 'Venture',         freq: 'Quarterly' },
    { symbol: '21256C407',    label: 'StepStone Private Venture', type: 'Venture',         freq: 'Quarterly' },
    { symbol: 'BIVIX',        label: 'Invenomic (Hedged Equity)', type: 'Hedged Equity',   freq: 'Daily'     },
    { symbol: 'GLDM',         label: 'SPDR Gold MiniShares',      type: 'Commodity',       freq: 'Daily'     },
  ]

  return (
    <div className="ftr-card">
      <div className="ftr-card-header">
        <span className="ftr-fund-name">All Alternative Holdings — YTD 2026 Snapshot</span>
        <span className="ftr-fund-sub"> as of {holdings.asOf}</span>
      </div>
      <div className="ftr-scroll">
        <table className="ftr-table ftr-all-table">
          <thead>
            <tr>
              <th>Fund</th>
              <th>Type</th>
              <th>YTD 2026</th>
              <th>ITD (your entry)</th>
              <th>Current Value</th>
              <th>Reporting</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => {
              const h = holdings.bySymbol[r.symbol] || {}
              return (
                <tr key={r.symbol}>
                  <td className="ftr-label">{r.label}</td>
                  <td className="ftr-type">{r.type}</td>
                  <td className={`ftr-num ${retClass(h.ytd)}`}>
                    {h.ytd != null ? fmtRet(h.ytd) : <span className="ftr-stale">—</span>}
                  </td>
                  <td className={`ftr-num ${retClass(h.itd)}`}>
                    {h.itd != null ? fmtRet(h.itd) : '—'}
                  </td>
                  <td className="ftr-num ftr-value">
                    {h.value != null ? `$${Math.round(h.value).toLocaleString()}` : '—'}
                  </td>
                  <td className={`ftr-freq ${r.freq === 'Daily' ? 'ftr-live' : 'ftr-qtr'}`}>
                    {r.freq}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function FundTrackRecord() {
  const { data: acData } = useApi('/asset-classes')

  const { bySymbol, asOf } = useMemo(() => {
    if (!acData) return { bySymbol: {}, asOf: '—' }
    const map = {}
    let latest = ''
    for (const ac of acData) {
      if (ac.last_reported && ac.last_reported > latest) latest = ac.last_reported
      for (const h of (ac.holdings || [])) {
        map[h.symbol] = {
          ytd:   h.ytd_return_pct,
          itd:   h.return_pct,
          value: h.value,
          gain:  h.gain,
        }
      }
    }
    return { bySymbol: map, asOf: latest || '—' }
  }, [acData])

  const sspf = bySymbol['CXSCHONPTLTD'] || {}
  const ra   = bySymbol['RACAPINTL']    || {}

  return (
    <div className="ftr-root">
      <div className="ftr-header">
        <h2>Fund Track Record Verify</h2>
        <p>Compare your position returns against advisor-provided fund documentation.
           Use this during advisor meetings to cross-check stated fund performance.</p>
      </div>

      <SSPFTable   yourYtd={sspf.ytd} yourItd={sspf.itd} />
      <RACapitalTable yourYtd={ra.ytd} yourItd={ra.itd} />
      <AllFundsTable holdings={{ bySymbol, asOf }} />
    </div>
  )
}
