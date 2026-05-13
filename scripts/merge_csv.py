#!/usr/bin/env python3
"""
merge_csv.py
Merge a new AllSource / Tamarac activity export into data/transactions.csv.

Usage:
    python scripts/merge_csv.py ~/Downloads/AllSource_Activity_YYYYMMDD.csv

What it does:
  1. Parses existing data/transactions.csv
  2. Parses the new export (handles Tamarac's ="..." Excel-safe quoting)
  3. Deduplicates by (date + account + activity + description + amount)
  4. Writes the merged, date-sorted result back to data/transactions.csv
     in a clean standard CSV format (no ="..." quoting)
  5. Prints a summary of rows added

After this script, run:
    python scripts/generate_static.py
"""
import csv
import io
import os
import sys
from datetime import datetime

ROOT      = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_PATH = os.path.join(ROOT, 'data', 'transactions.csv')

CLEAN_HEADERS = [
    'Trade Date', 'Account Number', 'Account Name',
    'Account Type', 'Activity', 'Description',
    'Symbol', 'Quantity', 'Price', 'Amount', 'Cash Impact', 'Cash Balance',
]


# ── Helpers (mirror backend/main.py) ──────────────────────────────────────────

def _clean(val: str) -> str:
    val = val.strip()
    if val.startswith('="') and val.endswith('"'):
        val = val[2:-1]
    return val


def _parse_amount(val: str) -> float:
    v = _clean(val).replace('$', '').replace(',', '').replace(' ', '')
    if not v or v == '-':
        return 0.0
    try:
        return float(v)
    except ValueError:
        return 0.0


def _parse_date(val: str):
    v = _clean(val)
    for fmt in ('%m/%d/%Y', '%Y-%m-%d'):
        try:
            return datetime.strptime(v, fmt)
        except ValueError:
            continue
    return None


def _normalize_desc(desc: str) -> str:
    """Strip non-ASCII so encoding variants (Â® vs ®) deduplicate correctly."""
    return desc.encode('ascii', 'ignore').decode('ascii').strip()


def _dedup_key(r: dict) -> tuple:
    return (
        r['date'].strftime('%Y-%m-%d'),
        r['account'],
        r['activity'],
        _normalize_desc(r['description']),
        f"{abs(r['amount']):.4f}",
    )


# ── Parser ─────────────────────────────────────────────────────────────────────

def _parse_file(path: str) -> list[dict]:
    with open(path, encoding='iso-8859-1') as f:
        content = f.read()

    all_rows = list(csv.reader(io.StringIO(content)))

    hdr_idx = None
    for i, row in enumerate(all_rows):
        if 'Trade Date' in [_clean(c) for c in row]:
            hdr_idx = i
            break

    if hdr_idx is None:
        return []

    headers = [_clean(c) for c in all_rows[hdr_idx]]
    records = []

    for row in all_rows[hdr_idx + 1:]:
        if len(row) < 10:
            continue
        r = {headers[j]: _clean(row[j]) for j in range(min(len(headers), len(row)))}

        dt      = _parse_date(r.get('Trade Date', ''))
        acct    = r.get('Account Number', '')
        activity = r.get('Activity', '')
        if not dt or not acct or not activity:
            continue

        records.append({
            'date':         dt,
            'account':      acct,
            'account_name': r.get('Account Name', ''),
            'account_type': r.get('Account Type', ''),
            'activity':     activity,
            'description':  r.get('Description', ''),
            'symbol':       r.get('Symbol', ''),
            'quantity':     _parse_amount(r.get('Quantity', '')),
            'price':        _parse_amount(r.get('Price', '')),
            'amount':       _parse_amount(r.get('Amount', '')),
            'cash_impact':  _parse_amount(r.get('Cash Impact', '')),
            'cash_balance': _parse_amount(r.get('Cash Balance', '')),
        })

    return records


# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    if len(sys.argv) < 2:
        print('Usage: python scripts/merge_csv.py <path-to-new-export.csv>')
        sys.exit(1)

    new_path = sys.argv[1]
    if not os.path.exists(new_path):
        print(f'Error: file not found: {new_path}')
        sys.exit(1)

    print(f'Reading existing: {DATA_PATH}')
    existing = _parse_file(DATA_PATH)
    existing_keys = {_dedup_key(r) for r in existing}
    print(f'  {len(existing):,} existing rows  ({len(existing_keys):,} unique keys)')

    print(f'Reading new export: {new_path}')
    new_rows = _parse_file(new_path)
    print(f'  {len(new_rows):,} rows in export')

    added = []
    dupes = 0
    for r in new_rows:
        k = _dedup_key(r)
        if k not in existing_keys:
            existing.append(r)
            existing_keys.add(k)
            added.append(r)
        else:
            dupes += 1

    print(f'\n  + {len(added):,} new rows added')
    print(f'  ~ {dupes:,} duplicate rows skipped')

    if not added:
        print('\nNo new data — transactions.csv unchanged.')
        return

    # Sort by date descending
    existing.sort(key=lambda r: r['date'], reverse=True)

    # Write clean CSV
    out = io.StringIO()
    writer = csv.writer(out, lineterminator='\n')
    writer.writerow(CLEAN_HEADERS)
    for r in existing:
        writer.writerow([
            r['date'].strftime('%Y-%m-%d'),
            r['account'],
            r['account_name'],
            r['account_type'],
            r['activity'],
            r['description'],
            r['symbol'],
            r['quantity'] if r['quantity'] else '',
            r['price']    if r['price']    else '',
            r['amount'],
            r['cash_impact'],
            r['cash_balance'],
        ])

    with open(DATA_PATH, 'w', newline='', encoding='utf-8') as f:
        f.write(out.getvalue())

    print(f'\n  ✓ data/transactions.csv updated — {len(existing):,} total rows')
    print('\nNext step: python scripts/generate_static.py')


if __name__ == '__main__':
    main()
