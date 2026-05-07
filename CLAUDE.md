# CLAUDE.md — Portfolio Intelligence Dashboard

This file is the single source of truth for how this project works and how to
keep it up to date. Read it before making any changes.

---

## What This Is

A personal portfolio intelligence dashboard for the Srinivasan household, managed by
AllSource Advisory. It displays portfolio performance, asset class detail, fee analysis,
transaction history, and an AI chat interface powered by GROQ (LLaMA 3.3 70B).

**Hosted on:** Cloudflare Pages (static hosting — no backend server in production)
**Dev environment:** FastAPI backend + Vite dev server

---

## Project Structure

```
portfolio-dashboard/
├── backend/
│   └── main.py              ← FastAPI backend (dev only). Contains ALL constants.
├── data/
│   └── transactions.csv     ← AllSource/Tamarac transaction ledger. SOURCE OF TRUTH.
├── frontend/
│   ├── public/
│   │   └── data/            ← Pre-baked static JSON (committed to git, served by CF)
│   │       ├── summary.json
│   │       ├── asset-classes.json
│   │       ├── allocation.json
│   │       ├── alternatives.json
│   │       ├── monthly.json
│   │       ├── fees.json
│   │       ├── insights.json
│   │       ├── benchmarks.json
│   │       ├── transactions.json
│   │       └── system_context.json
│   └── src/
│       ├── App.jsx
│       ├── components/      ← React components
│       ├── hooks/useApi.js  ← In production: reads /data/*.json instead of /api/*
│       └── styles/
├── functions/
│   └── api/
│       └── chat.js          ← Cloudflare Pages Function — proxies AI chat to GROQ
├── scripts/
│   ├── generate_static.py   ← Regenerates frontend/public/data/ from current data
│   └── merge_csv.py         ← Merges a new AllSource export into data/transactions.csv
└── CLAUDE.md                ← This file
```

---

## Two Data Sources

### Source 1 — Tamarac CSV Ledger (`data/transactions.csv`)
Raw transaction history exported from AllSource (powered by Tamarac).
Contains every deposit, withdrawal, buy, sell, fee, dividend from July 10, 2024 onward.
Used to compute: fees paid, monthly cash flows, transaction ledger.

### Source 2 — AllSource Portal Snapshot (hardcoded in `backend/main.py`)
Point-in-time values from the "Position Performance Inception" tab of the AllSource portal.
Contains: total AUM, net gain, return %, cost basis, and per-asset-class market values/gains.

**These must be updated manually** when you download new data (see workflow below).
The relevant constants are at the top of `backend/main.py`:

```python
PORTAL_TOTAL        = 2_392_970.34   # Total managed market value as of AS_OF date
PORTAL_NET_GAIN     = 359_599.34     # Net Investment Gain since inception
PORTAL_RETURN_PCT   = 20.74          # Since-inception net return %
PORTFOLIO_AS_OF     = "2026-05-05"   # Date of the snapshot
PORTFOLIO_INCEPTION = "2024-07-10"   # Portfolio inception date (do not change)
```

And the per-asset-class data in the `ASSET_CLASSES` list (each entry has `value`,
`net_gain`, `return_pct`, `income`, `top`/`worst` stock contributors).

---

## Data Update Workflow

**When to run:** After AllSource generates a new activity statement or when you
want to refresh market values from the portal.

### Step 1 — Download new activity from AllSource

1. Log into AllSource portal
2. Go to **Reports → Activity** (or **Transaction Detail**)
3. Set date range: from the day after the last export to today
4. Export as **CSV** (Tamarac format with `="..."` Excel-safe quoting)
5. Save the file — e.g., `~/Downloads/AllSource_Activity_20260601.csv`

### Step 2 — Merge into the ledger

```bash
python scripts/merge_csv.py ~/Downloads/AllSource_Activity_20260601.csv
```

The script will:
- Parse both files
- Deduplicate by (date + account + activity + description + amount)
- Report how many rows are new vs. duplicate
- Overwrite `data/transactions.csv` with the merged, date-sorted result

### Step 3 — Update portal snapshot constants (if values changed)

Open `backend/main.py` and update these values from the AllSource portal
**Position Performance Inception** tab (All Accounts, inception-to-today):

```python
PORTAL_TOTAL      = <new total value>
PORTAL_NET_GAIN   = <new net gain>
PORTAL_RETURN_PCT = <new return %>
PORTFOLIO_AS_OF   = "<YYYY-MM-DD>"    # today's date
```

Also update the `ASSET_CLASSES` list if individual position values have changed
significantly (each entry has `value`, `net_gain`, `return_pct`).

Update `ALT_META` last_reported dates if quarterly alternatives have new values:
```python
"managed_futures": { "last_reported": "2026-06-30", ... }
```

### Step 4 — Regenerate static JSON

```bash
python scripts/generate_static.py
```

This calls every API endpoint via FastAPI's test client and writes the responses
to `frontend/public/data/*.json`. These files are what Cloudflare serves.

### Step 5 — Commit and push

```bash
git add data/transactions.csv frontend/public/data/
git commit -m "[Portfolio] data: refresh as of YYYY-MM-DD"
git push
```

Cloudflare Pages auto-deploys on push to `main`. Build takes ~30 seconds.

---

## Cloudflare Pages Setup

| Setting | Value |
|---------|-------|
| Build command | `cd frontend && npm install && npm run build` |
| Build output directory | `frontend/dist` |
| Root directory | `/` |
| Node.js version | 20 |

**Environment variables to set in Cloudflare Pages dashboard:**

| Variable | Value |
|----------|-------|
| `GROQ_API_KEY` | Your GROQ API key (for AI chat via Pages Function) |

The AI chat uses the `functions/api/chat.js` Cloudflare Pages Function, which
reads `GROQ_API_KEY` from the CF environment and loads portfolio context from
`/data/system_context.json` at runtime.

---

## Local Development

Requires Python 3.11+ and Node 20+.

### Install dependencies

```bash
# Python (from project root)
pip install -r backend/requirements.txt

# Node (from frontend/)
cd frontend && npm install
```

### Start the dev environment

```bash
# Terminal 1 — FastAPI backend (localhost:8765)
cd backend && uvicorn main:app --reload --port 8765

# Terminal 2 — Vite dev server (localhost:5173)
cd frontend && npm run dev
```

The Vite proxy forwards all `/api/*` requests to `localhost:8765`.
The `useApi` hook auto-detects dev vs. production via `import.meta.env.PROD`.

### Or use the start script

```bash
./start.sh
```

---

## How the Build Works (dev vs. production)

| Behavior | Dev (`npm run dev`) | Production (Cloudflare) |
|----------|---------------------|------------------------|
| Data source | FastAPI on :8765 | Static JSON in `/data/` |
| `/api/chat` | FastAPI streaming | CF Pages Function |
| Transaction filtering | Server-side | Client-side (all rows loaded) |
| useApi fetch target | `/api/{endpoint}` | `/data/{endpoint}.json` |
| Benchmarks | Live yfinance | Baked at static gen time |

---

## Key Files to Know

| File | Purpose |
|------|---------|
| `backend/main.py` | FastAPI API. Edit this to change constants or computation logic. |
| `data/transactions.csv` | Never edit by hand. Always use `merge_csv.py`. |
| `frontend/public/data/` | Committed static JSON. Regenerate via `generate_static.py`. |
| `frontend/src/App.jsx` | Tab structure, theme toggle, routing. |
| `frontend/src/styles/global.css` | CSS variables for light/dark themes. |
| `functions/api/chat.js` | CF Pages Function for GROQ chat proxy. |

---

## CSV Format Reference

AllSource exports Tamarac CSV with these columns:

```
="Data For",="Trade Date",="Account",="Account Name",="Account Number",
="Account Type",="Asset Location Preference",="Objective",="Activity",
="Description",="Symbol",="Quantity",="Price",="Amount",="Cash Impact",="Cash Balance"
```

Values are wrapped in `="..."` (Excel-safe quoting). The `merge_csv.py` script
handles this format and converts to a clean standard CSV automatically.

**Dedup key used during merge:** (Trade Date, Account Number, Activity, Description, Amount)

---

## IRR / Return Methodology

- **Portfolio return (20.74%)** — computed by Tamarac using Modified Dietz / TWR
- **IRR figures** — hardcoded from AllSource portal (annualised IRR for 1Y, QTD, MTD, YTD)
- **Alpha** — portfolio return minus blended passive benchmark (equity_wt × SPY + alt_wt × AGG + cash_wt × 8.7%)
- **Sub-manager fee drag** — `sum(asset_class net_gains) − PORTAL_NET_GAIN` (gross vs. net diff)
- **Advisor fees** — Management Fee rows from CSV (~1% ann. of AUM)

---

## AI Chat Notes

- Model: `llama-3.3-70b-versatile` via GROQ API
- In dev: system prompt built by `_build_system_prompt()` in `backend/main.py`
- In production: system prompt built from `/data/system_context.json` in `functions/api/chat.js`
- The system prompt contains all portfolio figures and instructs the model to never guess
- Streaming uses SSE (`text/event-stream`) with `data: {"token": "..."}` events

---

*Last updated: 2026-05-06*
