#!/usr/bin/env python3
"""
generate_static.py
Pre-bake all API responses into static JSON files for Cloudflare Pages hosting.

Run this locally after:
  - updating data/transactions.csv (via merge_csv.py)
  - changing any constants in backend/main.py (PORTAL_TOTAL, ASSET_CLASSES, etc.)

Output: frontend/public/data/*.json  (committed to git)
Cloudflare builds only the React app — no Python runtime needed.

Usage:
    python scripts/generate_static.py
"""
import json
import os
import sys

# Resolve paths
ROOT       = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKEND    = os.path.join(ROOT, 'backend')
OUT_DIR    = os.path.join(ROOT, 'frontend', 'public', 'data')
os.makedirs(OUT_DIR, exist_ok=True)

sys.path.insert(0, BACKEND)

# Import the FastAPI app (loads all constants + CSV at import time)
from main import app  # noqa: E402
from fastapi.testclient import TestClient

client = TestClient(app)


def write(name, data):
    path = os.path.join(OUT_DIR, f'{name}.json')
    with open(path, 'w') as f:
        json.dump(data, f, separators=(',', ':'))
    size = os.path.getsize(path)
    print(f'  ✓  {name}.json  ({size:,} bytes)')


def get(path, params=None):
    resp = client.get(path, params=params)
    if resp.status_code != 200:
        print(f'  ✗  {path} — HTTP {resp.status_code}: {resp.text[:120]}')
        return None
    return resp.json()


print('─' * 56)
print('  Generating static JSON → frontend/public/data/')
print('─' * 56)

# ── Simple endpoints ───────────────────────────────────────────────────────────
for name, endpoint in [
    ('summary',            '/api/summary'),
    ('asset-classes',      '/api/asset-classes'),
    ('allocation',         '/api/allocation'),
    ('alternatives',       '/api/alternatives'),
    ('monthly',            '/api/monthly'),
    ('fees',               '/api/fees'),
    ('insights',           '/api/insights'),
    ('benchmarks',         '/api/benchmarks'),
    ('benchmarks-detail',  '/api/benchmarks-detail'),
    ('target-date',        '/api/target-date'),
    ('alt-commitments',    '/api/alt-commitments'),
    ('risk',               '/api/risk'),
]:
    data = get(endpoint)
    if data is not None:
        write(name, data)

# ── Transactions — paginate through all pages (frontend filters client-side) ───
all_items = []
page = 1
while True:
    txn = get('/api/transactions', params={'per_page': 200, 'page': page})
    if txn is None:
        break
    all_items.extend(txn['items'])
    if page >= txn['pages']:
        break
    page += 1
write('transactions', all_items)
print(f'       → {len(all_items):,} transaction rows')

# ── System context — used by Cloudflare chat function to build the AI prompt ──
summary   = get('/api/summary')   or {}
insights  = get('/api/insights')  or {}
ac_list   = get('/api/asset-classes') or []
td_data   = get('/api/target-date') or {}
bd_data   = get('/api/benchmarks-detail') or {}

ctx = {
    'as_of_date':             summary.get('as_of_date'),
    'inception_date':         summary.get('inception_date'),
    'total_value':            summary.get('total_value'),
    'cost_basis':             summary.get('cost_basis'),
    'total_gain':             summary.get('total_gain'),
    'total_gain_pct':         summary.get('total_gain_pct'),
    'net_irr_1y':             summary.get('net_irr_1y'),
    'net_irr_ytd':            summary.get('net_irr_ytd'),
    'equity_value':           summary.get('equity_value'),
    'equity_return_pct':      summary.get('equity_return_pct'),
    'equity_gain':            summary.get('equity_gain'),
    'equity_pct':             summary.get('equity_pct'),
    'alternatives_value':     summary.get('alternatives_value'),
    'alternatives_return_pct':summary.get('alternatives_return_pct'),
    'alternatives_gain':      summary.get('alternatives_gain'),
    'alternatives_pct':       summary.get('alternatives_pct'),
    'total_fees':             summary.get('total_fees'),
    'sub_manager_fees':       summary.get('sub_manager_fees'),
    'advisor_fee_rate_pct':   summary.get('advisor_fee_rate_pct'),
    'sub_mgr_fee_rate_pct':   summary.get('sub_mgr_fee_rate_pct'),
    'spy_itd':                insights.get('spy_itd'),
    'agg_itd':                insights.get('agg_itd'),
    'benchmark_itd':          insights.get('benchmark_itd'),
    'alpha_itd':              insights.get('alpha_itd'),
    'gross_gain':             insights.get('gross_gain'),
    'fee_gap':                insights.get('fee_gap'),
    'asset_classes': [
        {
            'label':      ac.get('label'),
            'category':   ac.get('super_category'),
            'value':      ac.get('value'),
            'net_gain':   ac.get('net_gain'),
            'return_pct': ac.get('return_pct'),
            'weight_pct': ac.get('weight_pct'),
        }
        for ac in ac_list
    ],
    'target_date_comparison': (
        f"Portfolio +{td_data.get('portfolio_return_pct', 0):.2f}% vs VTTHX "
        f"+{td_data.get('target_date', {}).get('primary', {}).get('return_pct', 17.1):.1f}% (est.)"
    ),
    'manager_scorecard_summary': 'Active equity managers vs passive ETF benchmarks — see benchmarks-detail endpoint for per-class breakdown.',
}
write('system_context', ctx)

print('─' * 56)
print('  Done. Commit frontend/public/data/ and push to deploy.')
print('─' * 56)
