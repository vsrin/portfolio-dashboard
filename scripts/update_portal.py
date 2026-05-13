#!/usr/bin/env python3
"""
update_portal.py — One-command portfolio data refresh.

Usage:
    python scripts/update_portal.py <positions_csv> [transactions_csv]

    positions_csv  — AllSource → Reports → Position Performance → Inception
                     e.g. ~/Downloads/Position_Performance_Inception_2026-05-12.csv
    transactions_csv — AllSource → Reports → Activity (optional)
                       if provided, merges into data/transactions.csv first

What it does:
  1. Parses the positions CSV → extracts total MV, net gain, ITD return,
     as-of date, and per-asset-class values/gains/returns
  2. Computes period returns (MTD/QTD/YTD) via Modified Dietz using period-start
     MVs from data/period_anchors.json + net flows from transactions CSV
  3. Writes data/portal_snapshot.json (source of truth for backend/main.py)
  4. Merges transactions CSV into data/transactions.csv (if provided)
  5. Runs scripts/generate_static.py to rebuild all frontend static JSON

After this script completes:
    git add data/ frontend/public/data/
    git commit -m "[Portfolio] data: refresh as of YYYY-MM-DD"
    git push

Updating period anchors (do this when a period boundary passes):
    Edit data/period_anchors.json:
      - At each month-end: update "mtd" → {"date": "YYYY-MM-DD", "value": <Tamarac month-end MV>}
      - At each quarter-end: update "qtd" similarly
      - At year-end: update "ytd" similarly
    Get the MV values from AllSource portal → Account Analytics → Period Returns
"""
import argparse
import csv
import json
import os
import re
import subprocess
import sys
from collections import defaultdict
from datetime import datetime, date

ROOT          = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SNAPSHOT_PATH = os.path.join(ROOT, "data", "portal_snapshot.json")
ANCHORS_PATH  = os.path.join(ROOT, "data", "period_anchors.json")
TXN_PATH      = os.path.join(ROOT, "data", "transactions.csv")

# Mapping from AllSource/Tamarac asset class names → our internal IDs
ASSET_CLASS_MAP = {
    "Large-Cap Core":              "lc_core",
    "Large-Cap Growth":            "lc_growth",
    "Large-Cap Value":             "lc_value",
    "Small-Cap Core":              "sc_core",
    "Small-Cap Growth":            "sc_growth",
    "Small-Cap Value":             "sc_value",
    "Mid-Cap Core":                "mc_core",
    "Mid-Cap Growth":              "mc_growth",
    "Mid-Cap Value":               "mc_value",
    "Foreign Large Cap Growth":    "foreign_lc_growth",
    "Foreign Small Mid Cap Growth":"foreign_sm_growth",
    "Int'l Developed Mkts":        "intl_developed",
    "Commodity":                   "commodity",
    "Hedged Equity":               "hedged_equity",
    "Managed Futures":             "managed_futures",
    "Hedge Fund":                  "hedge_fund",
    "Private Equity":              "private_equity",
    "Private Credit":              "private_credit",
    "Cash":                        "cash",
    "Unassigned":                  "venture",
}


def _strip(v: str) -> str:
    v = v.strip()
    m = re.match(r'^="(.*)"$', v)
    return m.group(1) if m else v


def _num(v: str) -> float:
    """Parse number: handles commas, parentheses for negatives, % signs."""
    v = _strip(v).replace(",", "").replace("%", "").strip()
    if not v or v in ("-", ""):
        return 0.0
    if v.startswith("(") and v.endswith(")"):
        v = "-" + v[1:-1]
    try:
        return float(v)
    except ValueError:
        return 0.0


def _parse_date(v: str):
    v = _strip(v).strip()
    for fmt in ("%m/%d/%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(v, fmt).date()
        except ValueError:
            continue
    return None


def parse_positions_csv(path: str) -> dict:
    """Parse AllSource Position_Performance_Inception CSV."""
    with open(path, encoding="utf-8", errors="replace") as f:
        rows = list(csv.reader(f))

    if not rows:
        print("  ERROR: empty file")
        sys.exit(1)

    header = [_strip(c) for c in rows[0]]

    # Detect the value column (contains date + "Value")
    value_col = next(
        (i for i, h in enumerate(header) if "Value" in h and "/" in h),
        next((i for i, h in enumerate(header) if h.strip().lower() == "value"), 11)
    )

    # Extract as-of date from value column header
    as_of = None
    vh = header[value_col] if value_col < len(header) else ""
    date_part = re.sub(r'\s*(Value|Accrued Income).*', '', vh).strip()
    as_of = _parse_date(date_part)

    # Standard column indices for AllSource inception report
    COL_END_DATE    = 1
    COL_DATA_FOR    = 2
    COL_ASSET_CLASS = 4
    COL_SYMBOL      = 6
    COL_DESC        = 7
    COL_WEIGHT      = 8
    COL_DIVIDEND    = 9
    COL_INTEREST    = 10
    COL_VALUE       = value_col
    COL_GAIN        = 13
    COL_RETURN      = 14

    # Fallback: get as_of from first data row end date
    if as_of is None and len(rows) > 1:
        as_of = _parse_date(rows[1][COL_END_DATE] if len(rows[1]) > COL_END_DATE else "")

    grand_total = None
    class_totals = {}   # ac_name → {value, net_gain, return_pct, weight, income}
    data_for_name = None

    for row in rows[1:]:
        if len(row) < 12:
            continue
        c = [_strip(x) for x in row]

        def g(i):
            return c[i] if i < len(c) else ""

        symbol      = g(COL_SYMBOL)
        desc        = g(COL_DESC)
        asset_class = g(COL_ASSET_CLASS)
        data_for    = g(COL_DATA_FOR)

        # Skip individual position rows (they have a symbol)
        if symbol:
            if data_for_name is None and data_for:
                data_for_name = data_for
            continue

        value    = _num(g(COL_VALUE))
        gain     = _num(g(COL_GAIN))
        ret_pct  = _num(g(COL_RETURN))
        weight   = _num(g(COL_WEIGHT))
        income   = _num(g(COL_DIVIDEND)) + _num(g(COL_INTEREST))

        # Grand total row: data_for == desc (investor name row, no asset class)
        if desc == data_for and not asset_class:
            grand_total = {
                "total_value":    value,
                "net_gain":       gain,
                "return_pct_itd": ret_pct,
                "total_income":   income,
                "as_of":          as_of.isoformat() if as_of else date.today().isoformat(),
            }
            continue

        # Class total row: description ends with " Total"
        if desc.endswith(" Total") and asset_class:
            ac_name = desc[: -len(" Total")].strip()
            # For duplicate class names (managed vs total), keep the non-zero / larger value
            if ac_name not in class_totals or value > class_totals[ac_name]["value"]:
                class_totals[ac_name] = {
                    "value":      value,
                    "net_gain":   gain,
                    "return_pct": ret_pct,
                    "weight":     weight,
                    "income":     income,
                }

    # Map names → IDs
    ac_by_id = {}
    unmapped = []
    for name, data in class_totals.items():
        ac_id = ASSET_CLASS_MAP.get(name)
        if ac_id:
            ac_by_id[ac_id] = data
        elif data["value"] > 0:
            unmapped.append(f"{name} (${data['value']:,.0f})")

    if unmapped:
        print(f"  ⚠️  Unmapped asset classes (will be ignored): {', '.join(unmapped)}")

    return {**(grand_total or {}), "asset_classes": ac_by_id}


def period_flows(txn_path: str, start_dt: date, end_dt: date) -> float:
    """Net external cash flow (Deposit + Withdrawal) for a period from transactions CSV."""
    if not os.path.exists(txn_path):
        return 0.0
    total = 0.0
    with open(txn_path, encoding="iso-8859-1") as f:
        reader = csv.DictReader(f)
        for row in reader:
            d = _parse_date(row.get("Trade Date", ""))
            if d is None or not (start_dt < d <= end_dt):
                continue
            if row.get("Activity", "").strip() in ("Deposit", "Withdrawal"):
                try:
                    total += float(row.get("Cash Impact", "0") or "0")
                except ValueError:
                    pass
    return total


def modified_dietz(mv_start: float, mv_end: float, net_cf: float) -> float:
    """
    Modified Dietz with mid-period weighting.
    Returns percentage (e.g. 0.82 for 0.82%).

    For periods dominated by intra-household transfers (large offsetting deposits/
    withdrawals that are internal rebalancing), set net_cf=0 to use simple period return.
    """
    if mv_start <= 0:
        return 0.0
    denom = mv_start + net_cf * 0.5
    if denom == 0:
        return 0.0
    r = (mv_end - mv_start - net_cf) / denom
    return round(r * 100, 2)


def compute_period_returns(mv_end: float, anchors: dict, txn_path: str, as_of_dt: date) -> dict:
    """
    Compute MTD, QTD, YTD returns.

    MTD/QTD: large intra-HH sweeps dominate gross flows, so we use net_cf=0
             (equivalent to simple period return: (V_end - V_start) / V_start).
    YTD:     net external flow is material (-$175.8K), so we use full Dietz.
    """
    results = {}

    for key, label, use_flows in [("mtd", "MTD", False), ("qtd", "QTD", False), ("ytd", "YTD", True)]:
        anchor = anchors.get(key, {})
        mv_start = anchor.get("value", 0)
        start_date_str = anchor.get("date", "")
        if not mv_start or not start_date_str:
            results[key] = None
            print(f"  {label}: ⚠️  no anchor — skipping")
            continue

        start_dt = date.fromisoformat(start_date_str)
        if use_flows:
            net_cf = period_flows(txn_path, start_dt, as_of_dt)
            r = modified_dietz(mv_start, mv_end, net_cf)
            print(f"  {label}: {r:+.2f}%  (start ${mv_start:>12,.0f} | end ${mv_end:>12,.0f} | net CF ${net_cf:>+12,.0f})")
        else:
            # Simple period return (ignores intra-HH transfers)
            r = round((mv_end - mv_start) / mv_start * 100, 2)
            print(f"  {label}: {r:+.2f}%  (start ${mv_start:>12,.0f} | end ${mv_end:>12,.0f} | CF ignored)")
        results[key] = r

    return results


def update_value_series(existing_snap: dict, as_of: str, mv: float) -> list:
    """Append or update the current month in the value series."""
    series = existing_snap.get("value_series", [])
    month = as_of[:7]  # "YYYY-MM"
    updated = [s for s in series if s["month"] != month]
    updated.append({"month": month, "value": round(mv)})
    updated.sort(key=lambda x: x["month"])
    return updated


def parse_period_csv(path: str) -> dict:
    """Parse a Position Performance YTD or Previous-Year CSV into per-class {gain, return_pct}.

    Handles exited positions (end_val=0) by back-computing start value from the row's return %.
    Returns dict keyed by our internal asset-class IDs.
    """
    gains   = defaultdict(float)
    start_v = defaultdict(float)

    with open(path, encoding="iso-8859-1") as f:
        reader = csv.DictReader(f)
        for row in reader:
            r = {re.sub(r'^="|"$', '', k).strip(): re.sub(r'^="|"$', '', str(v)).strip()
                 for k, v in row.items()}
            ac_name = r.get("Morningstar/IDC Asset Class", "").strip()
            if not ac_name or ac_name not in ASSET_CLASS_MAP:
                continue
            gain    = _num(r.get("Net Investment Gain", ""))
            end_val = _num(r.get(next((k for k in r if "Value" in k and "Accrued" not in k
                                       and k not in ("Net Investment Gain",)), ""), ""))
            ret_pct = _num(r.get("Return", ""))
            if gain is None:
                continue
            ac_id = ASSET_CLASS_MAP[ac_name]
            gains[ac_id] += gain
            if end_val is not None and end_val != 0.0:
                start_v[ac_id] += end_val - gain
            elif ret_pct is not None and ret_pct != 0.0:
                start_v[ac_id] += gain / (ret_pct / 100.0)

    result = {}
    for ac_id, total_gain in gains.items():
        sv  = start_v[ac_id]
        ret = round(total_gain / sv * 100, 2) if sv > 0 else None
        result[ac_id] = {"gain": round(total_gain, 2), "return_pct": ret}
    return result


def main():
    parser = argparse.ArgumentParser(
        description="One-command portfolio data refresh.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("positions_csv",
        help="Position Performance Inception CSV (required every refresh)")
    parser.add_argument("transactions_csv", nargs="?", default=None,
        help="Activity/Transactions CSV (recommended every refresh)")
    parser.add_argument("--ytd",
        metavar="YTD_CSV",
        help="Position Performance YTD CSV — updates per-class YTD gains")
    parser.add_argument("--prev-year",
        metavar="PREV_YEAR_CSV",
        help="Position Performance Previous Year CSV — updates per-class 1Y gains (annual)")
    args = parser.parse_args()

    positions_path = args.positions_csv
    txn_path       = args.transactions_csv or TXN_PATH

    if not os.path.exists(positions_path):
        print(f"Error: file not found: {positions_path}")
        sys.exit(1)

    # ── 1. Parse positions CSV ────────────────────────────────────────────────
    print(f"\n{'─'*60}")
    print(f"  Parsing: {os.path.basename(positions_path)}")
    snap = parse_positions_csv(positions_path)

    as_of = snap.get("as_of", date.today().isoformat())
    mv    = snap.get("total_value", 0)
    print(f"  Total AUM:      ${mv:>14,.2f}")
    print(f"  Net gain ITD:   ${snap.get('net_gain', 0):>14,.2f}")
    print(f"  Return ITD:      {snap.get('return_pct_itd', 0):.2f}%")
    print(f"  As of:           {as_of}")
    print(f"  Asset classes:   {len(snap.get('asset_classes', {}))} parsed")

    # ── 2. Load period anchors ────────────────────────────────────────────────
    print(f"\n  Computing period returns (Modified Dietz)...")
    try:
        with open(ANCHORS_PATH) as f:
            anchors = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        anchors = {}
        print("  ⚠️  data/period_anchors.json not found — period returns not computed")

    try:
        with open(SNAPSHOT_PATH) as f:
            existing = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        existing = {}

    as_of_dt = date.fromisoformat(as_of)
    period_rets = compute_period_returns(mv, anchors, txn_path, as_of_dt)

    irr_1y = existing.get("irr_1y", 13.11)  # kept until prev_1y anchor is updated
    print(f"  1Y:  {irr_1y:+.2f}%  (kept — update irr_1y manually each quarter in period_anchors.json)")

    # ── 3. Prompt for confirmation / overrides ────────────────────────────────
    print(f"\n  Computed returns (press Enter to accept, or type the correct % value):")
    final_irr = {}
    for key, label, default in [
        ("mtd", "MTD", period_rets.get("mtd")),
        ("qtd", "QTD", period_rets.get("qtd")),
        ("ytd", "YTD", period_rets.get("ytd")),
        ("1y",  "1Y",  irr_1y),
    ]:
        if default is None:
            default = existing.get(f"irr_{key}", 0.0)
        try:
            user_in = input(f"    {label} [{default:.2f}%]: ").strip()
            final_irr[key] = float(user_in) if user_in else default
        except (EOFError, ValueError):
            final_irr[key] = default
    print()

    # ── 4a. Parse optional YTD / Previous-Year CSVs ──────────────────────────
    ytd_class_gains = existing.get("ytd_class_gains", {})
    one_year_class_gains = existing.get("one_year_class_gains", {})

    if args.ytd:
        if os.path.exists(args.ytd):
            parsed_ytd = parse_period_csv(args.ytd)
            ytd_note = ytd_class_gains.get("_note", "")
            ytd_class_gains = {"_note": ytd_note, **parsed_ytd}
            print(f"  ✅ YTD class gains parsed: {len(parsed_ytd)} classes from {os.path.basename(args.ytd)}")
        else:
            print(f"  ⚠️  --ytd file not found: {args.ytd}")

    if args.prev_year:
        if os.path.exists(args.prev_year):
            parsed_1y = parse_period_csv(args.prev_year)
            ony_note = one_year_class_gains.get("_note", "")
            one_year_class_gains = {"_note": ony_note, **parsed_1y}
            print(f"  ✅ Previous-year class gains parsed: {len(parsed_1y)} classes from {os.path.basename(args.prev_year)}")
        else:
            print(f"  ⚠️  --prev-year file not found: {args.prev_year}")

    # ── 4b. Build and write portal_snapshot.json ─────────────────────────────
    value_series = update_value_series(existing, as_of, mv)

    new_snap = {
        "_note":          "Auto-generated by scripts/update_portal.py — do not edit by hand",
        "as_of":          as_of,
        "total_value":    snap.get("total_value",    existing.get("total_value")),
        "net_gain":       snap.get("net_gain",       existing.get("net_gain")),
        "return_pct_itd": snap.get("return_pct_itd", existing.get("return_pct_itd")),
        "total_income":   snap.get("total_income",   existing.get("total_income")),
        "irr_mtd":        final_irr["mtd"],
        "irr_qtd":        final_irr["qtd"],
        "irr_ytd":        final_irr["ytd"],
        "irr_1y":         final_irr["1y"],
        "value_series":   value_series,
        "one_year_class_gains": one_year_class_gains,   # preserved / updated
        "ytd_class_gains":      ytd_class_gains,         # preserved / updated
        "asset_classes":  {
            **existing.get("asset_classes", {}),
            **snap.get("asset_classes", {}),
        },
    }

    with open(SNAPSHOT_PATH, "w") as f:
        json.dump(new_snap, f, indent=2)
    print(f"  ✅ portal_snapshot.json written")

    # ── 5. Merge transactions (if provided) ──────────────────────────────────
    if args.transactions_csv:
        txn_file = args.transactions_csv
        print(f"\n  Merging transactions: {os.path.basename(txn_file)}")
        r = subprocess.run(
            [sys.executable, os.path.join(ROOT, "scripts", "merge_csv.py"), txn_file],
            cwd=ROOT,
        )
        if r.returncode != 0:
            print("  ⚠️  merge_csv.py failed — continuing")

    # ── 6. Regenerate static JSON ─────────────────────────────────────────────
    print(f"\n  Regenerating static JSON...")
    r = subprocess.run(
        [sys.executable, os.path.join(ROOT, "scripts", "generate_static.py")],
        cwd=ROOT,
    )
    if r.returncode != 0:
        print("  ⚠️  generate_static.py failed — check backend/main.py")
    else:
        print("  ✅ Static JSON rebuilt")

    print(f"\n{'─'*60}")
    print(f"  Done! Now push:")
    print(f"    git add data/ frontend/public/data/")
    print(f"    git commit -m '[Portfolio] data: refresh as of {as_of}'")
    print(f"    git push")
    print(f"\n  Next period anchor updates needed when:")
    mtd_anchor = anchors.get("mtd", {})
    qtd_anchor = anchors.get("qtd", {})
    ytd_anchor = anchors.get("ytd", {})
    print(f"    MTD anchor (currently {mtd_anchor.get('date','?')}): update at next month-end")
    print(f"    QTD anchor (currently {qtd_anchor.get('date','?')}): update at next quarter-end (2026-06-30)")
    print(f"    YTD anchor (currently {ytd_anchor.get('date','?')}): update at 2026-12-31")


if __name__ == "__main__":
    main()
