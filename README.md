# Portfolio Intelligence Dashboard

A Bloomberg-terminal-grade personal portfolio monitoring system for the Srinivasan household.
Built for precision: every number on screen is reconciled to the AllSource custodian to ±$1
before each session. Hosted statically on Cloudflare Pages — no server, no latency, no cost.

**Live dashboard →** deployed via Cloudflare Pages (auto-deploys on `git push`)

---

## What This Is

Most portfolio dashboards show you whatever your brokerage decides to surface. This one shows you
exactly what you need to make informed decisions and have accountable conversations with your advisor.

It was built to solve a specific problem: arriving at advisor meetings with independently verified,
current data so that every conversation is about interpretation and forward decisions — not data
discovery.

**AUM under management:** $2,807,577 (as of October 9, 2026)
**Portfolio since inception (May 2022):** +35.81% net (+$646,613)

---

## Feature Map

### KPI Bar — Always Visible
Real-time period selector (MTD / QTD / YTD / ITD) driving the entire dashboard simultaneously.
Displays total value, net dollar gain, net IRR, cost basis, and total fees — all reconciled to
AllSource. One source of truth, not three different numbers from three different screens.

### Overview Tab
- **Performance Chart** — cumulative portfolio return vs. SPY/AGG benchmark blend, monthly granularity
- **Allocation Donut** — live asset class weights with click-to-filter: tap any segment to narrow the
  sleeve grid to that category
- **Sleeve Grid** — every asset class in one scannable table: value, ITD gain, return %, weight,
  top/worst individual contributor

### My Insights Tab (Role-Aware)
Advisor-facing label: "Portfolio Insights". Client-facing: "My Insights". Four sub-tabs:

**Portfolio sub-tab**
- **InsightsPanel** — alpha vs. blended benchmark, fee gap analysis, gross vs. net gain comparison,
  equity vs. alternatives vs. passive-equivalent breakdown
- **TargetDatePanel** — comparison vs. VTTHX (Vanguard Target 2025 Fund), the passive alternative
  to this actively managed allocation
- **ReconciliationPanel** — full AllSource waterfall (Start Value → Net Contributions → Transfers →
  Securities Change → Dividend Income → Fees → Ending Value) for MTD/QTD/YTD, side by side with
  dashboard values. Green "✓ Fully Reconciled" or red "⚠ Gaps Found" badge at ±$1 tolerance

**Equity sub-tab**
- **ManagerScorecard** — each equity manager scored vs. their passive ETF benchmark: excess return,
  win rate, Sharpe comparison. Instantly shows which active managers are earning their fees
- **PerformanceMatrix** — raw return grid: every manager × every time period (MTD/QTD/YTD/1Y/ITD)

**Alternatives sub-tab**
- **AlternativesPanel** — all 10 alternative fund positions with reported NAV, ITD return, last
  reported date, strategy type, and commitment details. Handles quarterly-lag PE/credit valuations
  correctly (date-stamped, not treated as current)

**Risk & Planning sub-tab**
- **RiskPanel** — Sharpe ratio (0.84 ITD), Sortino (1.26), Beta (0.43), Upside Capture (26%),
  Downside Capture (65%), R-squared, Jensen's Alpha. Compared to S&P 500 benchmarks. Calendar-year
  breakdown for 2025 and 2026 YTD. Educational drawers on every metric

### Accounts Tab
Full position-level detail: every account, every holding, with ITD return, weight, gain/loss.
Filterable by asset class — click a sleeve in the Overview allocation chart and land here pre-filtered.

### Fees & Costs Tab
- **FeePanel** — advisor fee history (monthly series from transaction ledger), sub-manager fee drag
  (inferred from gross vs. net gain gap), total fee impact ITD, fee rate vs. AUM trend

### Transactions Tab
- **TransactionTable** — complete AllSource transaction ledger (7,500+ rows), client-side filtered
  by account, type, date range, and keyword. Zero server round-trips after initial load.

### AI Chat (Always Mounted)
Floating chat panel powered by Llama 3.3 70B via GROQ. System prompt is auto-assembled from the
current portfolio data — the AI knows your AUM, returns, fee structure, and asset class breakdown.
Ask it anything: "What's my equity alpha?", "How do my fees compare to a passive allocation?",
"What's my biggest drag position?"

---

## Architecture

```
portfolio-dashboard/
├── backend/
│   ├── main.py                  FastAPI — all API endpoints + data logic
│   ├── portal_snapshot.json     Single source of truth: current holdings, values, returns
│   └── requirements.txt
├── data/
│   ├── transactions.csv         AllSource/Tamarac ledger (7,500+ rows)
│   ├── period_anchors.json      Period-start MVs for MTD/QTD/YTD gain computation (Modified Dietz)
│   ├── reconciliation.json      AllSource waterfall vs. dashboard comparison (written by update_portal.py)
│   └── monthly_returns.csv      Monthly return history for PerformanceChart + ManagerScorecard
├── frontend/
│   ├── src/
│   │   ├── App.jsx              Root shell — tab state, auth gates, theme, period selector
│   │   ├── components/          25 components (see Component Map below)
│   │   ├── context/
│   │   │   ├── IdentityContext  Auth0 role resolution (client / advisor / denied)
│   │   │   └── InfoContext      Global info drawer state for educational content
│   │   └── utils/
│   │       ├── formatters.js    Currency, percent, date formatters
│   │       └── insightsAuth.js  Time-based HMAC token for Insights section gating
│   └── public/data/             Baked static JSON (output of generate_static.py)
├── scripts/
│   ├── update_portal.py         One-command weekly refresh: CSV + IRR + snapshot + reconciliation
│   ├── generate_static.py       Bakes all API responses to static JSON for Cloudflare Pages
│   ├── merge_csv.py             Merges AllSource activity export into transactions.csv
│   └── import_monthly_returns.py Imports monthly return series
└── functions/
    └── api/chat.js              Cloudflare Pages Function: GROQ streaming chat
```

### Dev vs. Production Data Flow

| Layer | Dev (`npm run dev` + uvicorn) | Production (Cloudflare Pages) |
|-------|-------------------------------|-------------------------------|
| Data source | FastAPI on :8765 | Static JSON in `/public/data/` |
| Chat | FastAPI streaming | CF Pages Function (GROQ) |
| Transaction filtering | Server-side paginated | Client-side (all rows preloaded) |
| Benchmarks | Live yfinance | Baked at static gen time |
| Auth | Auth0 JWT | Auth0 JWT |

`useApi()` auto-detects via `import.meta.env.PROD`. In production, `/summary` → `/data/summary.json`.

### Auth & Access Control

Three roles resolved at login via Auth0 and `IdentityContext`:
- `client` — full dashboard, "My Insights" label
- `advisor` — full dashboard, "Portfolio Insights" label
- `denied` — blocked at login with `AccessDenied` screen

The Insights section has an additional time-based HMAC token gate (`insightsAuth.js`) — a daily
rotating token is required to unlock it via URL parameter, preventing casual URL-share access.

---

## Data Reconciliation Pipeline

The dashboard does not trust its own calculations until they match AllSource. The reconciliation
pipeline runs as part of every weekly refresh:

```
AllSource Summary CSV (download)
  → update_portal.py --summary <file>
    → parse_summary_csv(): extracts MTD/QTD/YTD waterfall + IRR from AllSource format
    → writes data/reconciliation.json (AllSource waterfall + dashboard comparison)
    → writes backend/portal_snapshot.json (all constants, returns, holdings)
  → generate_static.py
    → bakes all JSON including reconciliation.json → frontend/public/data/
  → ReconciliationPanel (frontend)
    → displays waterfall side-by-side with dashboard values
    → reports match status at ±$1 tolerance
```

**AllSource waterfall fields reconciled:** Start Value, Net Contributions, Transfers (internal),
Change in Securities (Held + Sold), Dividend Income, Interest Income, Management Fees,
Other Expenses, Ending Value, Net IRR — for MTD, QTD, and YTD simultaneously.

---

## Component Map

| Component | Tab | What It Does |
|-----------|-----|--------------|
| `KPIBar` | Always | Period-linked AUM, gain, IRR, cost basis, fees |
| `BenchmarkBar` | Always | Live SPY/AGG benchmark strip |
| `Header` | Always | Auth, theme toggle, user identity |
| `ChatPanel` | Always | Floating AI chat (GROQ/Llama 3.3 70B) |
| `InfoDrawer` | Always | Slide-in educational content drawer |
| `PerformanceChart` | Overview | Monthly cumulative return vs. benchmark |
| `AllocationChart` | Overview | Donut by asset class, click-to-filter |
| `SleeveGrid` | Overview | Asset class scan: value, gain, return, weight |
| `InsightsPanel` | Insights/Portfolio | Alpha, fee gap, benchmark comparison |
| `TargetDatePanel` | Insights/Portfolio | vs. VTTHX passive alternative |
| `ReconciliationPanel` | Insights/Portfolio | AllSource waterfall reconciliation exhibit |
| `ManagerScorecard` | Insights/Equity | Active manager vs. ETF benchmark scorecard |
| `PerformanceMatrix` | Insights/Equity | Return grid: manager × period |
| `AlternativesPanel` | Insights/Alts | 10 alt fund positions with NAV and returns |
| `RiskPanel` | Insights/Risk | Sharpe, Sortino, Beta, Capture ratios, Alpha |
| `AccountsTable` | Accounts | Position-level detail, asset-class filterable |
| `FeePanel` | Fees | Advisor fee series, sub-mgr drag, total impact |
| `TransactionTable` | Transactions | Full ledger, client-side filtered |

---

## Weekly Refresh Workflow

```bash
# 1. Download from AllSource:
#    - Position Performance (Inception) → CSV
#    - Summary (MTD/QTD/YTD) → CSV

# 2. Run the one-command refresh
cd portfolio-dashboard
source .venv/bin/activate
python scripts/update_portal.py \
  --inception ~/Downloads/Position_Performance_Inception_YYYY-MM-DD.csv \
  --ytd       ~/Downloads/Position_Performance_YTD_YYYY-MM-DD.csv \
  --summary   ~/Downloads/Summary_YYYY-MM-DD.csv

# 3. Regenerate static JSON
python scripts/generate_static.py

# 4. Verify reconciliation
cat frontend/public/data/reconciliation.json | python3 -m json.tool | head -40

# 5. Commit and deploy
git add frontend/public/data/ backend/portal_snapshot.json data/
git commit -m "[Portfolio] data: refresh as of YYYY-MM-DD"
git push   # Cloudflare Pages auto-deploys in ~60 seconds
```

The `--summary` flag auto-extracts MTD/QTD/YTD/1Y Net IRR from the AllSource Summary CSV,
eliminating the manual IRR entry step.

---

## Development Commands

```bash
# Activate Python virtualenv
source .venv/bin/activate

# Start backend (localhost:8765) + frontend (localhost:5173)
./start.sh
# Or separately:
cd backend && uvicorn main:app --reload --port 8765
cd frontend && npm run dev

# Build frontend (what Cloudflare runs)
cd frontend && npm run build

# Generate static JSON after any backend/data change
python scripts/generate_static.py
```

---

## API Endpoints (Dev)

| Endpoint | Description |
|----------|-------------|
| `GET /api/summary` | AUM, total gain, IRR (MTD/QTD/YTD/1Y/ITD), fees, cost basis |
| `GET /api/asset-classes` | Per-asset-class: value, gain, return %, weight, holdings |
| `GET /api/allocation` | Allocation by category (equity / alternatives / cash) |
| `GET /api/alternatives` | Alt fund detail: NAV, ITD return, strategy, last reported |
| `GET /api/monthly` | Monthly return series (for PerformanceChart) |
| `GET /api/fees` | Fee series: advisor (monthly), sub-mgr drag, total ITD |
| `GET /api/insights` | Alpha, benchmark comparison, fee gap, gross vs. net |
| `GET /api/benchmarks` | Live SPY + AGG returns via yfinance |
| `GET /api/benchmarks-detail` | Per-manager benchmark comparison (ManagerScorecard) |
| `GET /api/target-date` | Portfolio vs. VTTHX (Vanguard Target Date 2025) |
| `GET /api/alt-commitments` | Alternative fund commitment details |
| `GET /api/risk` | Risk metrics: Sharpe, Sortino, Beta, Capture ratios, Alpha |
| `GET /api/risk-metrics` | Extended risk metrics with calendar-year breakdown |
| `GET /api/transactions` | Paginated transaction ledger (7,500+ rows) |

API docs: **http://localhost:8765/docs**

---

## Key Design Decisions

**Static-first architecture.** No server in production. All data is baked to JSON at refresh time
and served as static files. This means zero latency, zero cost, zero maintenance, and the dashboard
works even if the Python environment is gone. The trade-off: data requires a manual refresh cycle.

**AllSource as the single source of truth.** Dashboard values are not computed independently and
then compared — they are reconciled against AllSource at generation time. The ReconciliationPanel
makes this accountability visible.

**Modified Dietz for period gains.** Period gains (MTD/QTD/YTD) use Modified Dietz: `gain = ending_MV - start_MV - net_contributions`. Period-start MVs are stored in `data/period_anchors.json` and updated each refresh. This matches AllSource's "Investment Gain" definition exactly.

**Sub-manager fee inference.** Alternative fund managers embed their fees in reported NAVs — they
are not billed separately. The dashboard infers total sub-manager drag as: `sum(gross asset class gains) - portfolio net gain`. This makes invisible fees visible.

**Role-aware UI.** Auth0 roles drive component labeling and access gates. An advisor sharing the
same URL sees "Portfolio Insights" where the client sees "My Insights." Access-denied users see
a clean gate screen, not an error.

---

## Portfolio Reference (as of October 9, 2026)

| Metric | Value |
|--------|-------|
| Total AUM | $2,807,577 |
| Net gain ITD | +$646,613 |
| ITD return | +35.81% |
| 1Y Net IRR | +13.32% |
| YTD Net IRR | +11.31% |
| Equity sleeve | $1,114,128 (+65.19% ITD) |
| Alternatives sleeve | $1,549,742 (+19.19% ITD) |
| Sharpe ratio (ITD) | 0.84 |
| Upside capture | 26% |
| Downside capture | 65% |
| Total fee impact (ITD) | ~$116,221 |

---

## Infrastructure

| Service | Detail |
|---------|--------|
| Hosting | Cloudflare Pages (auto-deploy from `main`) |
| Build command | `cd frontend && npm install && npm run build` |
| Output directory | `frontend/dist` |
| Node.js version | 20 |
| Chat API | Cloudflare Pages Function → GROQ (Llama 3.3 70B) |
| Auth | Auth0 (`dev-y34ckcr0xp2b4064.us.auth0.com`) |
| Env vars required | `GROQ_API_KEY`, `VITE_AUTH0_DOMAIN`, `VITE_AUTH0_CLIENT_ID` |

---

*Built for the Srinivasan household. Not a commercial product.*
