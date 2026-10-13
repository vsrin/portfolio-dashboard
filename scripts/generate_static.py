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
    ('risk-metrics',       '/api/risk-metrics'),
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
summary      = get('/api/summary')       or {}
insights     = get('/api/insights')      or {}
ac_list      = get('/api/asset-classes') or []
td_data      = get('/api/target-date')   or {}
risk_metrics = get('/api/risk-metrics')  or {}
alts_data    = get('/api/alternatives')  or {}

# Build alternatives detail: each category with its holdings
def _alt_detail(alts):
    out = []
    for item in alts.get('items', []):
        if not item.get('label') or item.get('value', 0) == 0:
            continue
        holdings = []
        for h in item.get('holdings', []):
            if h.get('value', 0) > 0 or h.get('gain', 0) != 0:
                holdings.append({
                    'name':       h.get('name', ''),
                    'value':      h.get('value', 0),
                    'return_pct': h.get('return_pct', 0),
                })
        out.append({
            'category':   item.get('label'),
            'value':      item.get('value', 0),
            'return_pct': item.get('return_pct', 0),
            'net_gain':   item.get('net_gain', 0),
            'weight_pct': item.get('weight_pct', 0),
            'holdings':   holdings,
        })
    return out

# Pre-compute key analytical insights
alt_total   = summary.get('alternatives_value', 0)
commodity_v = 191526.03   # Statar + Gold ETF (from alternatives data)
commodity_g = 36614.52    # commodity net gain
ex_comm_v   = alt_total - commodity_v                  # ~$1.36M
ex_comm_g   = summary.get('alternatives_gain', 0) - commodity_g
ex_comm_ret = (ex_comm_g / (ex_comm_v - ex_comm_g) * 100) if ex_comm_v > ex_comm_g else 0

rm_itd = risk_metrics.get('itd', {})

ctx = {
    # ── Portfolio summary ──────────────────────────────────────
    'as_of_date':             summary.get('as_of_date'),
    'inception_date':         summary.get('inception_date'),
    'total_value':            summary.get('total_value'),
    'cost_basis':             summary.get('cost_basis'),
    'total_gain':             summary.get('total_gain'),
    'total_gain_pct':         summary.get('total_gain_pct'),
    'net_irr_1y':             summary.get('net_irr_1y'),
    'net_irr_ytd':            summary.get('net_irr_ytd'),
    'net_irr_qtd':            summary.get('net_irr_qtd'),

    # ── Sleeves ────────────────────────────────────────────────
    'equity_value':            summary.get('equity_value'),
    'equity_return_pct':       summary.get('equity_return_pct'),
    'equity_return_pct_1y':    summary.get('equity_return_pct_1y'),
    'equity_gain':             summary.get('equity_gain'),
    'equity_pct':              summary.get('equity_pct'),
    'alternatives_value':      summary.get('alternatives_value'),
    'alternatives_return_pct': summary.get('alternatives_return_pct'),
    'alternatives_return_pct_1y': summary.get('alternatives_return_pct_1y'),
    'alternatives_gain':       summary.get('alternatives_gain'),
    'alternatives_pct':        summary.get('alternatives_pct'),
    'cash_value':              summary.get('cash_value'),
    'cash_pct':                summary.get('cash_pct'),

    # ── Fees ────────────────────────────────────────────────────
    'advisor_fees_itd':        summary.get('advisor_fees_itd'),
    'advisor_fees_1y':         summary.get('advisor_fees_1y'),
    'advisor_fees_ytd':        summary.get('advisor_fees_ytd'),
    'advisor_fee_rate_pct':    summary.get('advisor_fee_rate_pct'),
    'sub_manager_fees':        summary.get('sub_manager_fees'),
    'total_fee_impact':        summary.get('total_fee_impact'),

    # ── Benchmarks ──────────────────────────────────────────────
    'spy_itd':                 insights.get('spy_itd'),
    'agg_itd':                 insights.get('agg_itd'),
    'benchmark_itd':           insights.get('benchmark_itd'),
    'alpha_itd':               insights.get('alpha_itd'),
    'spy_1y':                  insights.get('spy_1y'),
    'gross_gain':              insights.get('gross_gain'),
    'fee_gap':                 insights.get('fee_gap'),

    # ── Risk metrics (Tamarac official, May 2026) ──────────────
    'risk': {
        'sharpe_itd':           rm_itd.get('sharpe'),
        'sortino_itd':          rm_itd.get('sortino'),
        'beta_itd':             rm_itd.get('beta'),
        'upside_capture_itd':   rm_itd.get('upside_capture'),
        'downside_capture_itd': rm_itd.get('downside_capture'),
        'r_squared_itd':        rm_itd.get('r_squared'),
        'sp500_sharpe':         risk_metrics.get('benchmark_itd', {}).get('sp500_sharpe'),
        'source':               f"Tamarac official as of {risk_metrics.get('as_of', 'May 2026')}",
    },

    # ── Alternatives detail ──────────────────────────────────────
    'alternatives_detail': _alt_detail(alts_data),

    # ── Asset class table ────────────────────────────────────────
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

    # ── Pre-computed analytical insights ─────────────────────────
    'pre_computed': {
        'ex_commodity_alt_return_pct': round(ex_comm_ret, 1),
        'ex_commodity_alt_value':      round(ex_comm_v),
        'commodity_return_pct':        81.04,
        'commodity_value':             round(commodity_v),
        'vistaone_value':              268268,
        'vistaone_return_pct':         8.35,
        'pe_avg_return_pct':           28.06,
        'small_cap_underperformance':  'Small-Cap Value –44.0%, Small-Cap Core –45.3%, Small-Cap Growth –60.8% ITD vs broadly flat small-cap market',
        'small_cap_combined_value':    55147,
        'capture_story':               '26% upside / 65% downside — captures <1/3 of market gains but >2/3 of losses',
        'fee_as_pct_of_net_gain':      round(summary.get('total_fee_impact', 0) / summary.get('total_gain', 1) * 100, 1),
        'spy_gap_itd':                 round(insights.get('spy_itd', 0) - summary.get('total_gain_pct', 0), 2),
    },
}
write('system_context', ctx)

# ── Embed portfolio context directly into functions/api/chat.js ────────────────
# The Cloudflare Pages Function can't reliably self-fetch static assets at runtime,
# so we bake the context directly into the function file as PORTFOLIO_CTX.
import re as _re
chat_fn = os.path.join(ROOT, 'functions', 'api', 'chat.js')
if os.path.exists(chat_fn):
    with open(chat_fn, 'r') as f:
        chat_src = f.read()
    new_block = (
        '// === PORTFOLIO_CTX_START (auto-updated by generate_static.py — do not edit manually) ===\n'
        f'const PORTFOLIO_CTX = {json.dumps(ctx, separators=(",", ":"))}\n'
        '// === PORTFOLIO_CTX_END ==='
    )
    updated = _re.sub(
        r'// === PORTFOLIO_CTX_START.*?// === PORTFOLIO_CTX_END ===',
        lambda _: new_block,
        chat_src,
        flags=_re.DOTALL,
    )
    if updated != chat_src:
        with open(chat_fn, 'w') as f:
            f.write(updated)
        print(f'  ✓  functions/api/chat.js PORTFOLIO_CTX updated')
    else:
        print(f'  ⚠  functions/api/chat.js — PORTFOLIO_CTX marker not found, skipping embed')

# Copy reconciliation.json from data/ if it exists
import shutil
recon_src = os.path.join(ROOT, 'data', 'reconciliation.json')
if os.path.exists(recon_src):
    recon_dst = os.path.join(OUT_DIR, 'reconciliation.json')
    shutil.copy2(recon_src, recon_dst)
    print(f'  ✓  reconciliation.json  ({os.path.getsize(recon_dst):,} bytes)')

print('─' * 56)
print('  Done. Commit frontend/public/data/ and push to deploy.')
print('─' * 56)
