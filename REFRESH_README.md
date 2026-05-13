# Portfolio Dashboard — Data Refresh Guide

This is the single reference for keeping the dashboard current. Read top to bottom once; after that, only the **Weekly Refresh** section is needed for routine updates.

---

## What to Download from AllSource

Log in at AllSource → Reports → Position Performance.

| File | When | Where in AllSource | Required? |
|------|------|--------------------|-----------|
| **Position Performance Inception** | Every refresh | Reports → Position Performance → set dates: Inception to Today → Export CSV | **Yes — always** |
| **Activity (Transactions)** | Every refresh | Reports → Activity → Export CSV | Recommended |
| **Position Performance YTD** | When you want YTD per-class data for equity classes | Reports → Position Performance → set dates: Jan 1 to Today → Export CSV | Optional |
| **Position Performance Previous Year** | Once per year (January) | Reports → Position Performance → set dates: Jan 1 to Dec 31 of prior year → Export CSV | Optional |

> **Note on naming:** AllSource auto-names files like `Position_Performance_Inception_2026-05-13_17-54-10.csv`. The script accepts the exact path — use tab-complete or `~/Downloads/Position_Performance_Inception_*.csv`.

---

## Weekly Refresh (Standard)

Two downloads, one command.

### Step 1 — Download from AllSource

1. Position Performance → Inception → Export CSV → save to `~/Downloads/`
2. Activity → Export CSV → save to `~/Downloads/`

### Step 2 — Run the script

```bash
cd /Users/vsrin/appdev/coworker-access/portfolio-dashboard
source .venv/bin/activate

python scripts/update_portal.py \
  ~/Downloads/Position_Performance_Inception_*.csv \
  ~/Downloads/Transactions_*.csv
```

### Step 3 — Confirm period returns

The script pauses and shows computed MTD / QTD / YTD returns (via Modified Dietz). Compare them to AllSource → Account Analytics → select household → dashboard tiles. Press Enter to accept, or type the exact % value from AllSource if different.

```
MTD [0.82%]:     ← press Enter if it matches, or type e.g. 0.84
QTD [2.65%]:     ← same
YTD [0.88%]:     ← same
1Y  [13.11%]:    ← update this only if a new quarter has passed
```

### Step 4 — Verify and push

```bash
# Spot-check
python3 -c "import json; d=json.load(open('frontend/public/data/summary.json')); print('AUM:', d['total_value'], '| MTD:', d['net_irr_mtd'], '| YTD:', d['net_irr_ytd'])"

# Commit and deploy
git add data/ frontend/public/data/
git commit -m "[Portfolio] data: refresh as of $(python3 -c "import json; print(json.load(open('data/portal_snapshot.json'))['as_of'])")"
git push
```

Cloudflare Pages auto-deploys in ~90 seconds after push.

---

## With YTD Per-Class Data (Equity Classes)

Use this when you want the YTD column in the Accounts table to show values for all equity asset classes (not just alternatives).

### Step 1 — Download

In addition to the standard two files, download:
- Position Performance → set dates **Jan 1 to Today** → Export CSV

### Step 2 — Run with `--ytd` flag

```bash
python scripts/update_portal.py \
  ~/Downloads/Position_Performance_Inception_*.csv \
  ~/Downloads/Transactions_*.csv \
  --ytd ~/Downloads/Position_Performance_YTD_*.csv
```

---

## With Previous Year Per-Class Data (Annual — January Only)

Run this once in January after the prior year closes. It populates the "1 Year" column in the Accounts table with per-class breakdown.

### Step 1 — Download

- Position Performance → set dates **Jan 1 to Dec 31 of prior year** → Export CSV

### Step 2 — Run with `--prev-year` flag

```bash
python scripts/update_portal.py \
  ~/Downloads/Position_Performance_Inception_*.csv \
  ~/Downloads/Transactions_*.csv \
  --prev-year ~/Downloads/Position_Performance_Previous_Year_*.csv
```

---

## Full Refresh (All Four Files)

When you have all downloads ready — runs everything in one shot:

```bash
python scripts/update_portal.py \
  ~/Downloads/Position_Performance_Inception_*.csv \
  ~/Downloads/Transactions_*.csv \
  --ytd ~/Downloads/Position_Performance_YTD_*.csv \
  --prev-year ~/Downloads/Position_Performance_Previous_Year_*.csv
```

---

## Period Anchor Updates (Monthly — Not Part of Normal Refresh)

Period anchors store the portfolio value at the start of each period. They must be updated **manually** once per period boundary — the refresh script cannot compute them automatically.

**File:** `data/period_anchors.json`

```json
{
  "ytd":     { "date": "2025-12-31", "value": 2312000 },
  "qtd":     { "date": "2026-03-31", "value": 2349655 },
  "mtd":     { "date": "2026-04-30", "value": 2392253 },
  "prev_1y": { "date": "2026-05-13", "value": 2131687 }
}
```

| When | What to update | Value to use |
|------|---------------|--------------|
| **End of each month** | `mtd.date` → last day of completed month, `mtd.value` → portfolio MV on that date | AllSource → Account Analytics → set date to month-end → read total MV |
| **End of each quarter** (Mar 31, Jun 30, Sep 30, Dec 31) | `qtd.date` + `qtd.value` | Same — set date to quarter-end |
| **End of year** (Dec 31) | `ytd.date` + `ytd.value` | Same — set date to Dec 31 |
| **Each quarter** | `irr_1y` in the script prompt | AllSource → Account Analytics → 1Y return tile |

After editing period_anchors.json, re-run the standard refresh script to recompute period returns.

---

## What the Script Updates vs. What Stays Fixed

| Data | Updated by script | Updated manually | Frequency |
|------|-------------------|-----------------|-----------|
| Total AUM, net gain, ITD return | ✅ Inception CSV | — | Every refresh |
| Asset class values (all 19) | ✅ Inception CSV | — | Every refresh |
| Transaction ledger | ✅ Transactions CSV | — | Every refresh |
| MTD / QTD / YTD IRR % | ✅ Computed + you confirm | Can override at prompt | Every refresh |
| 1Y IRR % | — | At prompt (press Enter to keep) | Each quarter |
| Per-class YTD gains | ✅ `--ytd` flag | — | When YTD CSV downloaded |
| Per-class 1Y gains | ✅ `--prev-year` flag | — | January each year |
| Period anchors (MTD/QTD/YTD start values) | — | Edit period_anchors.json | Each month-end |
| Individual holdings data (top/worst contributors) | — | Edit backend/main.py ASSET_CLASSES | When positions change significantly |

---

## Current Data Status (as of 2026-05-13)

| Period | Portfolio total | Per-class |
|--------|----------------|-----------|
| ITD | ✅ | ✅ All 19 classes |
| YTD | ✅ | ✅ Alternatives · ⚠️ Equity classes need YTD CSV |
| 1Y (Prev Year 2025) | ✅ | ✅ All 19 classes |
| MTD | ✅ | — Not available from AllSource |
| QTD | ✅ | — Not available from AllSource |

---

## If Something Goes Wrong

**Script fails to find the CSV:**
```bash
ls ~/Downloads/Position_Performance_Inception_*.csv  # confirm file exists
```

**Virtual environment not active:**
```bash
source .venv/bin/activate
```

**Backend/generate_static.py fails:**
```bash
cd backend && pip install -r requirements.txt
cd .. && python scripts/generate_static.py
```

**Numbers don't match AllSource after refresh:**
- AUM / ITD gain mismatch → check the Inception CSV date matches what you intend
- Period returns mismatch → re-run script and enter exact values from AllSource at the prompt
- YTD per-class shows "—" → download YTD CSV and re-run with `--ytd` flag
