#!/usr/bin/env python3
"""
import_monthly_returns.py
Parse an AllSource monthly performance CSV and recompute RISK_METRICS in backend/main.py.

Usage:
    python scripts/import_monthly_returns.py ~/Downloads/AllSource_Performance_YYYYMMDD.csv

How to export from AllSource:
    Reports → Performance → Account Performance
    Date range: 2024-07-10 (inception) to today
    Frequency: Monthly
    Export as CSV

The script:
  1. Reads the monthly return column from the CSV
  2. Fetches SPY monthly returns over the same period via yfinance
  3. Computes: Sharpe, Sortino, Beta, Jensen's Alpha, Upside/Downside Capture, R-squared
  4. Rewrites the RISK_METRICS block in backend/main.py with official figures
"""
import sys
import os
import re
import json
import math
import statistics
from datetime import datetime, date

# ── Dependencies ──────────────────────────────────────────────────────────────
try:
    import pandas as pd
    import yfinance as yf
except ImportError:
    print("Missing dependencies. Run: pip install pandas yfinance")
    sys.exit(1)

RISK_FREE_ANNUAL = 0.05  # ~5% Fed funds rate during measurement period
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MAIN_PY = os.path.join(ROOT, "backend", "main.py")


# ── CSV parsing ───────────────────────────────────────────────────────────────
def parse_allsource_csv(path: str) -> pd.Series:
    """
    Parse AllSource Account Performance CSV.
    Expected columns include a date column and a monthly return column.
    Handles Tamarac =".." quoting automatically via pandas.
    Returns a pd.Series of monthly decimal returns indexed by period-end date.
    """
    df = pd.read_csv(path, thousands=",", na_values=["--", "N/A", ""])

    # Normalise column names
    df.columns = [c.strip().strip('="').lower().replace(" ", "_") for c in df.columns]

    # Find the date column
    date_col = next((c for c in df.columns if "date" in c or "period" in c or "month" in c), None)
    if date_col is None:
        print(f"Could not find date column. Columns: {list(df.columns)}")
        sys.exit(1)

    # Find the return column (monthly total return, net of fees)
    ret_col = next(
        (c for c in df.columns if "return" in c and ("monthly" in c or "net" in c or "total" in c)),
        next((c for c in df.columns if "return" in c), None),
    )
    if ret_col is None:
        print(f"Could not find return column. Columns: {list(df.columns)}")
        sys.exit(1)

    print(f"Using columns: date='{date_col}', return='{ret_col}'")

    df[date_col] = pd.to_datetime(df[date_col], errors="coerce")
    df = df.dropna(subset=[date_col, ret_col]).sort_values(date_col)

    # Convert percent strings to decimals if needed
    returns = pd.to_numeric(df[ret_col].astype(str).str.replace("%", ""), errors="coerce")
    if returns.abs().max() > 1.0:   # looks like percentages, not decimals
        returns = returns / 100.0

    result = pd.Series(returns.values, index=df[date_col].dt.to_period("M").astype(str))
    print(f"Parsed {len(result)} monthly returns from {result.index[0]} to {result.index[-1]}")
    return result


# ── Benchmark data ────────────────────────────────────────────────────────────
def fetch_spy_returns(start: str, end: str) -> pd.Series:
    """Download SPY adjusted close and compute monthly returns."""
    spy = yf.download("SPY", start=start, end=end, interval="1mo", auto_adjust=True, progress=False)
    monthly = spy["Close"].resample("ME").last().pct_change().dropna()
    monthly.index = monthly.index.to_period("M").astype(str)
    print(f"Fetched {len(monthly)} SPY monthly returns ({monthly.index[0]} → {monthly.index[-1]})")
    return monthly


# ── Risk computations ─────────────────────────────────────────────────────────
def compute_metrics(port_rets: pd.Series, spy_rets: pd.Series, rf_annual: float = RISK_FREE_ANNUAL):
    rf_monthly = (1 + rf_annual) ** (1 / 12) - 1

    # Align on common months
    common = port_rets.index.intersection(spy_rets.index)
    p = port_rets[common].values
    s = spy_rets[common].values
    n = len(p)
    months = n

    if n < 3:
        print("Too few overlapping months to compute reliable metrics.")
        sys.exit(1)

    # Annualised return
    ann_return = (math.prod(1 + r for r in p) ** (12 / months)) - 1

    # Volatility
    std_dev_monthly = statistics.stdev(p)
    std_dev_ann = std_dev_monthly * math.sqrt(12)

    # Downside deviation (below 0)
    downside = [r for r in p if r < 0]
    dd_monthly = math.sqrt(sum(r ** 2 for r in downside) / months) if downside else 0.001
    dd_ann = dd_monthly * math.sqrt(12)

    # Sharpe
    excess = [r - rf_monthly for r in p]
    sharpe = (ann_return - rf_annual) / std_dev_ann if std_dev_ann else 0

    # Sortino
    sortino = (ann_return - rf_annual) / dd_ann if dd_ann else 0

    # SPY stats
    spy_ann = (math.prod(1 + r for r in s) ** (12 / months)) - 1
    spy_std = statistics.stdev(s) * math.sqrt(12)
    spy_sharpe = (spy_ann - rf_annual) / spy_std if spy_std else 0
    spy_downside = [r for r in s if r < 0]
    spy_dd = math.sqrt(sum(r ** 2 for r in spy_downside) / months) * math.sqrt(12) if spy_downside else 0.001
    spy_sortino = (spy_ann - rf_annual) / spy_dd if spy_dd else 0

    # Beta and Alpha
    cov = sum((p[i] - sum(p) / n) * (s[i] - sum(s) / n) for i in range(n)) / (n - 1)
    var_s = statistics.variance(s)
    beta = cov / var_s if var_s else 1.0

    # Jensen's Alpha (annualised)
    jensens_alpha = ann_return - (rf_annual + beta * (spy_ann - rf_annual))

    # R-squared
    mean_p, mean_s = sum(p) / n, sum(s) / n
    ss_tot = sum((r - mean_p) ** 2 for r in p)
    ss_res = sum((p[i] - (mean_p + beta * (s[i] - mean_s))) ** 2 for i in range(n))
    r_squared = 1 - ss_res / ss_tot if ss_tot else 0

    # Capture ratios
    up_months   = [(p[i], s[i]) for i in range(n) if s[i] > 0]
    down_months = [(p[i], s[i]) for i in range(n) if s[i] < 0]
    up_cap   = (sum(pi for pi, _ in up_months) / sum(si for _, si in up_months)) if up_months else 0
    down_cap = (sum(pi for pi, _ in down_months) / sum(si for _, si in down_months)) if down_months else 0

    return {
        "n_months":          months,
        "ann_return":        round(ann_return, 4),
        "std_dev":           round(std_dev_ann, 4),
        "downside_dev":      round(dd_ann, 4),
        "sharpe":            round(sharpe, 4),
        "sortino":           round(sortino, 4),
        "beta":              round(beta, 4),
        "alpha_raw":         round(ann_return - spy_ann, 4),
        "jensens_alpha":     round(jensens_alpha, 4),
        "upside_capture":    round(up_cap, 4),
        "downside_capture":  round(down_cap, 4),
        "r_squared":         round(r_squared, 4),
        "sp500_ann_return":  round(spy_ann, 4),
        "sp500_std_dev":     round(spy_std, 4),
        "sp500_sharpe":      round(spy_sharpe, 4),
        "sp500_sortino":     round(spy_sortino, 4),
    }


# ── Write back to main.py ─────────────────────────────────────────────────────
def update_main_py(metrics: dict, as_of: str):
    with open(MAIN_PY) as f:
        src = f.read()

    new_block = f'''# Official risk metrics — sourced from AllSource/Tamarac Account Analytics export {as_of}
RISK_METRICS = {{
    "as_of":   "{as_of}",
    "source":  "Tamarac (official — computed by import_monthly_returns.py)",
    "itd": {{
        "sharpe":               {metrics["sharpe"]},
        "sortino":              {metrics["sortino"]},
        "std_dev":              {metrics["std_dev"]},
        "downside_dev":         {metrics["downside_dev"]},
        "beta":                 {metrics["beta"]},
        "alpha_raw":            {metrics["alpha_raw"]},
        "jensens_alpha":        {metrics["jensens_alpha"]},
        "upside_capture":       {metrics["upside_capture"]},
        "downside_capture":     {metrics["downside_capture"]},
        "r_squared":            {metrics["r_squared"]},
        "net_return_ann":       {metrics["ann_return"]},
    }},
    "benchmark_itd": {{
        "sp500_sharpe":         {metrics["sp500_sharpe"]},
        "sp500_sortino":        {metrics["sp500_sortino"]},
        "sp500_std_dev":        {metrics["sp500_std_dev"]},
        "sp500_net_return_ann": {metrics["sp500_ann_return"]},
    }},
}}'''

    # Replace the existing RISK_METRICS block
    pattern = r"# Official risk metrics.*?^}"
    new_src = re.sub(pattern, new_block, src, flags=re.DOTALL | re.MULTILINE)

    if new_src == src:
        print("WARNING: Could not find existing RISK_METRICS block to replace.")
        print("Add RISK_METRICS manually or check the regex pattern.")
        return

    with open(MAIN_PY, "w") as f:
        f.write(new_src)
    print(f"\n✓ Updated RISK_METRICS in backend/main.py")


# ── Main ──────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(0)

    csv_path = sys.argv[1]
    if not os.path.exists(csv_path):
        print(f"File not found: {csv_path}")
        sys.exit(1)

    print(f"\nParsing: {csv_path}")
    port_rets = parse_allsource_csv(csv_path)

    start_date = port_rets.index[0][:7] + "-01"
    end_date   = date.today().isoformat()
    spy_rets   = fetch_spy_returns(start_date, end_date)

    print("\nComputing risk metrics...")
    m = compute_metrics(port_rets, spy_rets)

    print("\n── Results ──────────────────────────────────────────────")
    for k, v in m.items():
        print(f"  {k:<24} {v}")

    as_of = date.today().isoformat()
    update_main_py(m, as_of)

    print("\nNext steps:")
    print("  python scripts/generate_static.py")
    print("  git add backend/main.py frontend/public/data/risk-metrics.json")
    print(f"  git commit -m '[Portfolio] data: refresh official risk metrics as of {as_of}'")
    print("  git push")
