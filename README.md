# Portfolio Intelligence Dashboard

Bloomberg-style dark terminal dashboard for the Srinivasan household Tamarac advisory portfolio.

## Quick Start

```bash
cd portfolio-dashboard
chmod +x start.sh
./start.sh
```

Open **http://localhost:5173** in your browser.

## Architecture

```
portfolio-dashboard/
├── backend/
│   ├── main.py           FastAPI app — all endpoints
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/   KPIBar, PerformanceChart, SleeveGrid, etc.
│   │   ├── hooks/        useApi()
│   │   ├── utils/        formatters
│   │   └── styles/       global CSS + Bloomberg dark theme
│   ├── package.json
│   └── vite.config.js    (proxies /api → :8765)
├── data/
│   └── transactions.csv  AllSource Tamarac export
└── start.sh
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/summary` | Total value, gain, fees, income, transaction count |
| `GET /api/accounts` | Per-account breakdown with allocation % |
| `GET /api/monthly` | Monthly cash flows + cumulative invested capital |
| `GET /api/fees` | Fee analysis — monthly series, by account |
| `GET /api/sleeves` | Equity + alternatives sleeve breakdown |
| `GET /api/income` | Dividend/interest income analysis |
| `GET /api/allocation` | Portfolio allocation by category |
| `GET /api/benchmarks` | Live S&P 500 (SPY) + Bloomberg Agg (AGG) via yfinance |
| `GET /api/transactions` | Paginated, filterable transaction ledger |

API docs: **http://localhost:8765/docs**

## Data Source

`data/transactions.csv` — AllSource/Tamarac portal export.
To refresh: log in to AllSource → Export Data → replace this file.

## MongoDB Atlas Migration Path

When ready to move off CSV:

1. Run the ETL script (TODO: `scripts/seed_mongo.py`) to ingest CSV into Atlas
2. Replace `_load_transactions()` in `backend/main.py` with a MongoDB query
3. Store portal snapshot values in a `snapshots` collection with timestamps
4. Add a webhook or cron to auto-pull fresh data from Tamarac API

## Portfolio Reference (as of 2026-05-05)

| Account | Value |
|---------|-------|
| Vinod IRA | $1,005,588 |
| Vinod Individual TOD | $171,726 |
| Vinod Joint TOD | $146,324 |
| Sree IRA | $140,550 |
| Weather Mark (Equity Sleeve) | $362,158 |
| Putnam Large Cap (Equity Sleeve) | $271,437 |
| LEIA (Equity Sleeve) | $224,944 |
| Invenomic (Equity Sleeve) | $91,022 |
| Gold SPDR (Alternatives) | $45,516 |
| Untracked Sleeve | $27,204 |
| **TOTAL** | **$2,486,469** |
