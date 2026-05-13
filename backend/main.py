"""
Portfolio Dashboard API — FastAPI backend
All figures sourced directly from AllSource/Tamarac portal, Position Performance Inception
tab, as of 5/5/2026 (Jul 10 2024 → May 05 2026 inception period).
"""
import csv
import io
import json
import os
from collections import defaultdict
from datetime import datetime
from functools import lru_cache
from typing import List, Optional

import httpx
import yfinance as yf
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL   = "llama-3.3-70b-versatile"
GROQ_URL     = "https://api.groq.com/openai/v1/chat/completions"

app = FastAPI(title="Portfolio Dashboard API", version="1.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5200", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_PATH = os.path.join(os.path.dirname(__file__), "../data/transactions.csv")

# ─────────────────────────────────────────────────────────────────────────────
# GROUND TRUTH — loaded from data/portal_snapshot.json (written by update_portal.py)
# Hardcoded values below are fallbacks only; JSON takes precedence when present.
# To refresh: python scripts/update_portal.py <positions_csv> [transactions_csv]
# ─────────────────────────────────────────────────────────────────────────────

_SNAP_PATH = os.path.join(os.path.dirname(__file__), "../data/portal_snapshot.json")
try:
    with open(_SNAP_PATH) as _f:
        _SNAP = json.load(_f)
except (FileNotFoundError, json.JSONDecodeError):
    _SNAP = {}

PORTAL_TOTAL      = _SNAP.get("total_value",      2_411_418.76)
PORTAL_NET_GAIN   = _SNAP.get("net_gain",          378_047.76)
PORTAL_RETURN_PCT = _SNAP.get("return_pct_itd",    21.78)
PORTAL_COST_BASIS = PORTAL_TOTAL - PORTAL_NET_GAIN
PORTFOLIO_AS_OF   = _SNAP.get("as_of",             "2026-05-11")
PORTFOLIO_INCEPTION = "2024-07-10"

_IRR_MTD = _SNAP.get("irr_mtd", 0.82)
_IRR_QTD = _SNAP.get("irr_qtd", 2.65)
_IRR_YTD = _SNAP.get("irr_ytd", 0.88)
_IRR_1Y  = _SNAP.get("irr_1y",  13.11)

_ANC_PATH = os.path.join(os.path.dirname(__file__), "../data/period_anchors.json")
try:
    with open(_ANC_PATH) as _f:
        _ANC = json.load(_f)
except (FileNotFoundError, json.JSONDecodeError):
    _ANC = {}

def _period_gain(mv_end: float, anchor_key: str, net_cf: float = 0.0) -> float:
    start = _ANC.get(anchor_key, {}).get("value", mv_end)
    return round(mv_end - start - net_cf, 2)

_YTD_CLASS = _SNAP.get("ytd_class_gains", {})

# ─────────────────────────────────────────────────────────────────────────────
# Asset class data — each entry is a category group from Position Perf Inception
# ─────────────────────────────────────────────────────────────────────────────

ASSET_CLASSES = [
    # ── Equity ────────────────────────────────────────────────────────────────
    {
        "id": "lc_core",
        "label": "Large-Cap Core",
        "super_category": "equity",
        "value": 193_547.64,
        "net_gain": 53_817.58,
        "return_pct": 33.92,
        "weight": 8.03,
        "income": 2_858.13,
        "top": [("GOOGL",173.21),("KLAC",111.93),("AMZN",93.31),("META",30.99)],
        "worst": [("NKE",-31.27),("ADBE",-27.71),("SCHW",-6.92)],
    },
    {
        "id": "lc_growth",
        "label": "Large-Cap Growth",
        "super_category": "equity",
        "value": 304_446.39,
        "net_gain": 137_842.81,
        "return_pct": 96.70,
        "weight": 12.63,
        "income": 26.74,
        "top": [("TSLA",234.03),("PLTR",167.10),("NVDA",113.34),("CRWD",100.96)],
        "worst": [("COIN",-10.62)],
    },
    {
        "id": "lc_value",
        "label": "Large-Cap Value",
        "super_category": "equity",
        "value": 118_327.13,
        "net_gain": 27_900.26,
        "return_pct": 56.63,
        "weight": 4.91,
        "income": 3_015.73,
        "top": [("BAC",255.90),("QCOM",83.64),("WFC",55.05),("T",45.79)],
        "worst": [("MCK",-23.59),("NOC",-23.06),("TMUS",-9.70)],
    },
    {
        "id": "sc_core",
        "label": "Small-Cap Core",
        "super_category": "equity",
        "value": 6_215.61,
        "net_gain": -12_945.02,
        "return_pct": -47.29,
        "weight": 0.26,
        "income": 627.36,
        "top": [("QS",47.54)],
        "worst": [("BF.B",-25.94),("BJ",-6.91)],
    },
    {
        "id": "sc_growth",
        "label": "Small-Cap Growth",
        "super_category": "equity",
        "value": 14_479.92,
        "net_gain": 7_270.16,
        "return_pct": 115.63,
        "weight": 0.60,
        "income": 0.0,
        "top": [("BE",346.12)],
        "worst": [("TMDX",-44.33),("ELF",-32.78),("MP",-10.41)],
    },
    {
        "id": "sc_value",
        "label": "Small-Cap Value",
        "super_category": "equity",
        "value": 37_121.84,
        "net_gain": -27_129.30,
        "return_pct": -49.09,
        "weight": 1.54,
        "income": 989.20,
        "top": [("LUMN",19.50),("IEP",1.42),("HTGC",1.13)],
        "worst": [("BAX",-55.13),("KMX",-47.47),("CPB",-37.10)],
    },
    {
        "id": "mc_core",
        "label": "Mid-Cap Core",
        "super_category": "equity",
        "value": 59_537.59,
        "net_gain": -2_312.85,
        "return_pct": -4.62,
        "weight": 2.47,
        "income": 1_051.34,
        "top": [("URI",25.46),("CTVA",5.37),("ALL",2.38)],
        "worst": [("ZTS",-38.69),("IFF",-24.52),("IR",-11.52)],
    },
    {
        "id": "mc_growth",
        "label": "Mid-Cap Growth",
        "super_category": "equity",
        "value": 55_071.38,
        "net_gain": -9_911.65,
        "return_pct": -17.02,
        "weight": 2.28,
        "income": 584.34,
        "top": [("EL",25.93),("FCX",16.97),("HLT",6.24)],
        "worst": [("EFX",-43.25),("SMCI",-29.13),("IDXX",-22.86)],
    },
    {
        "id": "mc_value",
        "label": "Mid-Cap Value",
        "super_category": "equity",
        "value": 47_856.83,
        "net_gain": 26_759.42,
        "return_pct": 43.53,
        "weight": 1.98,
        "income": 1_892.71,
        "top": [("WBD",451.95),("DD",22.69),("EL",25.93)],
        "worst": [("CHTR",-31.81),("KHC",-28.91),("ZBH",-14.80)],
    },
    {
        "id": "foreign_lc_growth",
        "label": "Foreign Large-Cap Growth",
        "super_category": "equity",
        "value": 104_654.38,
        "net_gain": 36_663.89,
        "return_pct": 57.52,
        "weight": 4.34,
        "income": 1_162.42,
        "top": [("ASML",143.59),("RYCEY",64.10),("BAESY",58.75)],
        "worst": [("RNMBY",-34.06),("AZN",-4.04)],
    },
    {
        "id": "foreign_sm_growth",
        "label": "Foreign Small/Mid-Cap Growth",
        "super_category": "equity",
        "value": 11_676.14,
        "net_gain": 6_170.83,
        "return_pct": 105.11,
        "weight": 0.48,
        "income": 11.84,
        "top": [("STX",105.11)],
        "worst": [],
    },
    {
        "id": "intl_developed",
        "label": "Int'l Developed Markets",
        "super_category": "equity",
        "value": 17_964.46,
        "net_gain": 12_453.72,
        "return_pct": 40.88,
        "weight": 0.74,
        "income": 1_504.99,
        "top": [("GSK",61.80),("NVO",25.01),("JCI",7.32)],
        "worst": [("LVMUY",-20.12),("SNY",-3.26)],
    },
    # ── Alternatives ──────────────────────────────────────────────────────────
    {
        "id": "commodity",
        "label": "Commodity (Gold)",
        "super_category": "alternatives",
        "value": 47_313.45,
        "net_gain": 18_497.40,
        "return_pct": 69.41,
        "weight": 1.96,
        "income": 0.0,
        "top": [("GLDM",69.41)],
        "worst": [],
        "holdings": [{"symbol":"GLDM","name":"SPDR Gold MiniShares","value":47126.60,"gain":18310.55,"return_pct":68.67,"ytd_gain":6842.34,"ytd_return_pct":14.06}],
    },
    {
        "id": "hedged_equity",
        "label": "Hedged Equity (Invenomic)",
        "super_category": "alternatives",
        "value": 77_029.49,
        "net_gain": -9_953.46,
        "return_pct": -5.56,
        "weight": 3.19,
        "income": 12_620.14,
        "top": [],
        "worst": [("BIVIX",-5.35)],
        "holdings": [{"symbol":"BIVIX","name":"Invenomic Institutional","value":77029.49,"gain":-9931.36,"return_pct":-5.35,"ytd_gain":-16488.48,"ytd_return_pct":-12.11}],
    },
    {
        "id": "managed_futures",
        "label": "Managed Futures",
        "super_category": "alternatives",
        "value": 107_568.18,
        "net_gain": 7_568.18,
        "return_pct": 7.57,
        "weight": 4.46,
        "income": 0.0,
        "top": [("MARS FX",7.57)],
        "worst": [],
        "holdings": [{"symbol":"MARSFXLP","name":"MARS FX LP","value":107568.18,"gain":7568.18,"return_pct":7.57,"ytd_gain":0.0,"ytd_return_pct":0.0}],
    },
    {
        "id": "hedge_fund",
        "label": "Hedge Funds",
        "super_category": "alternatives",
        "value": 249_531.64,
        "net_gain": 49_531.64,
        "return_pct": 25.22,
        "weight": 10.35,
        "income": 0.0,
        "top": [("RA Capital",30.39),("CAIS SSA",19.14)],
        "worst": [],
        "holdings": [
            {"symbol":"RACAPINTL","name":"RA Capital International","value":130388.00,"gain":30388.00,"return_pct":30.39,"ytd_gain":1451.00,"ytd_return_pct":1.13},
            {"symbol":"CXSCHONPTLTD","name":"CAIS SSA Strategic Partners Offshore","value":119143.64,"gain":19143.64,"return_pct":19.14,"ytd_gain":851.67,"ytd_return_pct":0.72},
        ],
    },
    {
        "id": "private_equity",
        "label": "Private Equity",
        "super_category": "alternatives",
        "value": 630_827.96,
        "net_gain": 41_895.96,
        "return_pct": 15.62,
        "weight": 26.15,
        "income": 0.0,
        "top": [("JPMorgan PM",18.95),("CAZ GP",13.69),("NorthHaven PE",11.39)],
        "worst": [("Vista",-1.25),("CAZ Sports",0.0)],
        "holdings": [
            {"symbol":"VISTAONETELP","name":"VistaOne (TE), L.P.-A-I","value":259679.44,"gain":9679.44,"return_pct":4.81,"ytd_gain":-3278.57,"ytd_return_pct":-1.25},
            {"symbol":"CAZGPOCFTEL","name":"CAZ GP Ownership Class F Fund","value":111884.71,"gain":9384.71,"return_pct":13.69,"ytd_gain":0.0,"ytd_return_pct":0.0},
            {"symbol":"48130F306","name":"JPMorgan Private Markets Fund Cl I","value":118945.51,"gain":18945.51,"return_pct":18.95,"ytd_gain":3164.59,"ytd_return_pct":2.73},
            {"symbol":"STEPSTONE","name":"StepStone Private Venture & Growth","value":75968.30,"gain":968.30,"return_pct":1.29,"ytd_gain":968.30,"ytd_return_pct":1.29},
            {"symbol":"NORTHHAVIII","name":"North Haven PE Co-Investment","value":36850.00,"gain":2918.00,"return_pct":11.39,"ytd_gain":0.0,"ytd_return_pct":0.0},
            {"symbol":"CAZPSOFIIITT","name":"CAZ Professional Sports Fund III","value":27500.00,"gain":0.0,"return_pct":0.0,"ytd_gain":0.0,"ytd_return_pct":0.0},
        ],
    },
    {
        "id": "private_credit",
        "label": "Private Credit",
        "super_category": "alternatives",
        "value": 136_615.37,
        "net_gain": 31_615.37,
        "return_pct": 30.11,
        "weight": 5.66,
        "income": 0.0,
        "top": [("PRF Fund II",30.11)],
        "worst": [],
        "holdings": [{"symbol":"PRFDIILP","name":"PRF Fund II LP","value":136615.37,"gain":31615.37,"return_pct":30.11,"ytd_gain":4612.83,"ytd_return_pct":3.49}],
    },
    # ── Cash & Other ──────────────────────────────────────────────────────────
    {
        "id": "cash",
        "label": "Cash & Equivalents",
        "super_category": "cash",
        "value": 117_375.00,
        "net_gain": 12_492.71,
        "return_pct": 8.22,
        "weight": 4.87,
        "income": 13_162.79,
        "top": [("FDRXX",8.35)],
        "worst": [],
        "holdings": [
            {"symbol":"FDRXX","name":"Fidelity Cash Reserves","value":117382.80,"gain":12492.71,"return_pct":8.35,"ytd_gain":1464.31,"ytd_return_pct":None},
            {"symbol":"FCASH","name":"Cash","value":-7.81,"gain":0.0,"return_pct":0.0,"ytd_gain":0.0,"ytd_return_pct":0.0},
        ],
    },
    {
        "id": "venture",
        "label": "Venture Capital",
        "super_category": "alternatives",
        "value": 75_000.00,
        "net_gain": 0.0,
        "return_pct": 0.0,
        "weight": 3.11,
        "income": 0.0,
        "top": [],
        "worst": [],
        "holdings": [{"symbol":"HAMLANVENCAP","name":"Hamilton Lane Venture Capital & Growth Fund","value":75000.00,"gain":0.0,"return_pct":0.0,"ytd_gain":None,"ytd_return_pct":None}],
    },
]

# Overlay live numeric values from portal_snapshot.json
_AC_SNAP = _SNAP.get("asset_classes", {})
if _AC_SNAP:
    for _ac in ASSET_CLASSES:
        _upd = _AC_SNAP.get(_ac["id"], {})
        if _upd:
            for _k in ("value", "net_gain", "return_pct", "weight", "income"):
                if _k in _upd:
                    _ac[_k] = _upd[_k]

# Quick lookup map
AC_BY_ID = {ac["id"]: ac for ac in ASSET_CLASSES}

# Super-category aggregates
def _super_totals():
    out = defaultdict(lambda: {"value": 0.0, "gain": 0.0, "income": 0.0})
    for ac in ASSET_CLASSES:
        sc = ac["super_category"]
        out[sc]["value"]  += ac["value"]
        out[sc]["gain"]   += ac["net_gain"]
        out[sc]["income"] += ac.get("income", 0)
    return dict(out)

SUPER_TOTALS = _super_totals()

# ── Alt vehicle metadata — reporting frequency, J-Curve flags, bond-proxy role ─
ALT_META = {
    "commodity": {
        "reporting_freq": "daily",
        "last_reported":  "2026-05-05",
        "j_curve":        False,
        "j_curve_note":   None,
        "benchmark_label": "Gold spot price",
        "bond_proxy":     False,
        "group":          "live",
    },
    "hedged_equity": {
        "reporting_freq": "daily",
        "last_reported":  "2026-05-05",
        "j_curve":        False,
        "j_curve_note":   None,
        "benchmark_label": "HFRI Equity Hedge Index",
        "bond_proxy":     True,
        "group":          "live",
    },
    "managed_futures": {
        "reporting_freq": "quarterly",
        "last_reported":  "2026-03-31",
        "j_curve":        False,
        "j_curve_note":   None,
        "benchmark_label": "SG Trend Index",
        "bond_proxy":     True,
        "group":          "quarterly",
    },
    "hedge_fund": {
        "reporting_freq": "quarterly",
        "last_reported":  "2026-03-31",
        "j_curve":        False,
        "j_curve_note":   None,
        "benchmark_label": "HFRI Fund Weighted Composite",
        "bond_proxy":     True,
        "group":          "quarterly",
    },
    "private_credit": {
        "reporting_freq": "quarterly",
        "last_reported":  "2025-12-31",
        "j_curve":        False,
        "j_curve_note":   None,
        "benchmark_label": "Bloomberg US Corp High Yield",
        "bond_proxy":     True,
        "group":          "quarterly",
    },
    "private_equity": {
        "reporting_freq": "quarterly",
        "last_reported":  "2025-12-31",
        "j_curve":        True,
        "j_curve_note":   "Most sub-funds are <2 years old and still calling capital. Returns accelerate as capital is deployed (typically years 3–7). Early reported figures understate long-term IRR.",
        "benchmark_label": "Burgiss PE Index (10-year)",
        "bond_proxy":     False,
        "group":          "j_curve",
    },
    "venture": {
        "reporting_freq": "annual",
        "last_reported":  "2025-12-31",
        "j_curve":        True,
        "j_curve_note":   "No capital has been called yet. 0% return is expected and correct — the fund clock hasn't started. Returns begin once capital is drawn down and deployed into companies.",
        "benchmark_label": "Cambridge Venture Capital Index",
        "bond_proxy":     False,
        "group":          "j_curve",
    },
}

# ── Equity ETF benchmarks — passive proxy for each active equity manager ──────
EQUITY_ETF_MAP = {
    "lc_core":           ("IVV",  "S&P 500 Core"),
    "lc_growth":         ("IVW",  "S&P 500 Growth"),
    "lc_value":          ("IVE",  "S&P 500 Value"),
    "mc_core":           ("IJH",  "S&P MidCap 400"),
    "mc_growth":         ("IJK",  "S&P MidCap 400 Growth"),
    "mc_value":          ("IJJ",  "S&P MidCap 400 Value"),
    "sc_core":           ("IJR",  "S&P SmallCap 600"),
    "sc_growth":         ("IJT",  "S&P SmallCap 600 Growth"),
    "sc_value":          ("IJS",  "S&P SmallCap 600 Value"),
    "foreign_lc_growth": ("EFG",  "MSCI EAFE Growth"),
    "foreign_sm_growth": ("VSS",  "FTSE All-World ex-US Small-Cap"),
    "intl_developed":    ("EFA",  "MSCI EAFE"),
    "commodity":         ("GLDM", "Gold MiniShares"),
}

TARGET_DATE_FUNDS = {
    "VTTHX": "Vanguard Target Retirement 2035",
    "VFORX": "Vanguard Target Retirement 2040",
}

BOND_PROXIES = {
    "HYG": "iShares High Yield Corporate Bond",
    "BND": "Vanguard Total Bond Market",
}

ALT_COMMITMENTS = {
    "private_equity": {
        "label": "Private Equity",
        "committed":  750_000,
        "called":     629_688,
        "uncalled":   120_312,
        "est_vintage_end": "2027",
    },
    "venture": {
        "label": "Venture Capital",
        "committed":  75_000,
        "called":     75_000,
        "uncalled":   0,
        "est_vintage_end": "2026",
    },
}

# ── Fallback benchmark ─────────────────────────────────────────────────────────
BENCHMARK_FALLBACK = {
    "sp500": {
        "ticker": "SPY", "label": "S&P 500 (Price Only)",
        "price": 558.70, "as_of": "2026-05-05",
        "1d": 0.70, "mtd": 0.70, "ytd": -3.40, "1y": 11.20, "source": "fallback",
    },
    "bloomberg_agg": {
        "ticker": "AGG", "label": "Bloomberg US Aggregate",
        "price": 97.32, "as_of": "2026-05-05",
        "1d": -0.02, "mtd": -0.02, "ytd": 1.80, "1y": 4.10, "source": "fallback",
    },
}

# ── CSV helpers ────────────────────────────────────────────────────────────────
DATA_PATH = os.path.join(os.path.dirname(__file__), "../data/transactions.csv")

def _clean(val: str) -> str:
    val = val.strip()
    if val.startswith('="') and val.endswith('"'):
        val = val[2:-1]
    return val

def _parse_amount(val: str) -> float:
    v = _clean(val).replace("$", "").replace(",", "").replace(" ", "")
    if not v or v in ("-", ""):
        return 0.0
    try:
        return float(v)
    except ValueError:
        return 0.0

def _parse_date(val: str) -> Optional[datetime]:
    v = _clean(val)
    for fmt in ("%m/%d/%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(v, fmt)
        except ValueError:
            continue
    return None

@lru_cache(maxsize=1)
def _load_transactions() -> list[dict]:
    with open(DATA_PATH, encoding="iso-8859-1") as f:
        text = f.read()
    reader = csv.reader(io.StringIO(text))
    all_rows = list(reader)

    hdr_idx = None
    for i, row in enumerate(all_rows):
        if "Trade Date" in [_clean(c) for c in row]:
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
        dt = _parse_date(r.get("Trade Date", ""))
        acct = r.get("Account Number", "")
        activity = r.get("Activity", "")
        if not dt or not acct or not activity:
            continue
        records.append({
            "date": dt,
            "year_month": dt.strftime("%Y-%m"),
            "account": acct,
            "acct_name": r.get("Account Name", ""),
            "activity": activity,
            "description": r.get("Description", ""),
            "symbol": r.get("Symbol", ""),
            "quantity": _parse_amount(r.get("Quantity", "")),
            "price": _parse_amount(r.get("Price", "")),
            "amount": _parse_amount(r.get("Amount", "")),
            "cash_impact": _parse_amount(r.get("Cash Impact", "")),
            "cash_balance": _parse_amount(r.get("Cash Balance", "")),
        })
    return records

def _classify(activity: str) -> str:
    if "Deposit" in activity:        return "deposit"
    if "Withdrawal" in activity:     return "withdrawal"
    if "Management Fee" in activity: return "fee"
    if "Other Expense" in activity:  return "other_expense"
    if "Dividend" in activity or "Interest" in activity: return "income"
    if activity == "Buy":            return "buy"
    if activity == "Sell":           return "sell"
    if "Money Transfer" in activity: return "transfer"
    if "Receipt of Securities" in activity or "Credit Security" in activity: return "security_in"
    if "Transfer of Securities" in activity or "Debit Security" in activity: return "security_out"
    if "Foreign Tax" in activity:    return "tax"
    return "other"

# ── Endpoints ──────────────────────────────────────────────────────────────────

@app.get("/api/health")
def health():
    return {"status": "ok", "total_value": PORTAL_TOTAL, "as_of": PORTFOLIO_AS_OF}


@app.get("/api/summary")
def summary():
    txns = _load_transactions()

    total_fees = 0.0
    total_income = 0.0
    total_other_exp = 0.0

    for t in txns:
        cat = _classify(t["activity"])
        amt = abs(t["amount"])
        if cat == "fee":           total_fees += amt
        elif cat == "income":      total_income += amt
        elif cat == "other_expense": total_other_exp += amt

    # Sleeve totals from portal snapshot
    eq   = SUPER_TOTALS["equity"]
    alt  = SUPER_TOTALS["alternatives"]
    csh  = SUPER_TOTALS["cash"]

    eq_gain      = eq["gain"]
    eq_cost      = eq["value"] - eq_gain
    eq_return    = round(eq_gain / eq_cost * 100, 2) if eq_cost > 0 else 0

    alt_gain     = alt["gain"]
    alt_cost     = alt["value"] - alt_gain
    alt_return   = round(alt_gain / alt_cost * 100, 2) if alt_cost > 0 else 0

    # Fee breakdown
    # advisor_fees  = directly billed management fees from CSV (Tamarac ~1% advisory)
    # sub_mgr_fees  = fee drag embedded in managed NAVs (gross gain − portal net gain)
    gross_gain   = sum(ac["net_gain"] for ac in ASSET_CLASSES)
    sub_mgr_fees = gross_gain - PORTAL_NET_GAIN   # ~$27,446
    months       = 22
    advisor_rate = round((total_fees    / PORTAL_TOTAL) / (months / 12) * 100, 2)
    sub_mgr_rate = round((sub_mgr_fees / PORTAL_TOTAL) / (months / 12) * 100, 2)

    return {
        "total_value":       PORTAL_TOTAL,
        "as_of_date":        PORTFOLIO_AS_OF,
        "inception_date":    PORTFOLIO_INCEPTION,
        "cost_basis":        PORTAL_COST_BASIS,
        "total_gain":        PORTAL_NET_GAIN,
        "total_gain_pct":    PORTAL_RETURN_PCT,
        "total_income":      round(total_income, 2),
        "total_other_exp":   round(total_other_exp, 2),
        "net_irr_mtd":       _IRR_MTD,
        "net_irr_qtd":       _IRR_QTD,
        "net_irr_ytd":       _IRR_YTD,
        "net_irr_1y":        _IRR_1Y,
        # Period dollar gains (mv_end − mv_start − net_cf)
        # MTD/QTD: intra-HH transfers net ~$0, so CF=0
        # YTD: net external outflow = −$175,800
        "gain_mtd":  _period_gain(PORTAL_TOTAL, "mtd"),
        "gain_qtd":  _period_gain(PORTAL_TOTAL, "qtd"),
        "gain_ytd":  _period_gain(PORTAL_TOTAL, "ytd", net_cf=-175_800),
        "gain_1y":   round(_IRR_1Y / 100 * _ANC.get("prev_1y", {}).get("value", PORTAL_TOTAL), 2),
        # Equity sleeve
        "equity_value":      round(eq["value"], 2),
        "equity_pct":        round(eq["value"] / PORTAL_TOTAL * 100, 2),
        "equity_gain":       round(eq_gain, 2),
        "equity_return_pct": eq_return,
        # Alternatives sleeve
        "alternatives_value":      round(alt["value"], 2),
        "alternatives_pct":        round(alt["value"] / PORTAL_TOTAL * 100, 2),
        "alternatives_gain":       round(alt_gain, 2),
        "alternatives_return_pct": alt_return,
        # Cash
        "cash_value":        round(csh["value"], 2),
        "cash_pct":          round(csh["value"] / PORTAL_TOTAL * 100, 2),
        # Fees — advisor (directly billed) vs sub-manager (embedded NAV drag)
        "total_fees":           round(total_fees, 2),
        "sub_manager_fees":     round(sub_mgr_fees, 2),
        "total_fee_impact":     round(total_fees + sub_mgr_fees, 2),
        "advisor_fee_rate_pct": advisor_rate,
        "sub_mgr_fee_rate_pct": sub_mgr_rate,
        "transaction_count": len(txns),
    }


def _build_holdings(ac: dict) -> list:
    """Return explicit holdings if available; otherwise synthesize from top/worst contributors."""
    if ac.get("holdings"):
        return ac["holdings"]
    rows = []
    for sym, gain in ac.get("top", []):
        rows.append({"symbol": sym, "name": sym, "value": None, "gain": gain,
                     "return_pct": None, "ytd_gain": None, "ytd_return_pct": None,
                     "contributor_type": "winner"})
    for sym, gain in ac.get("worst", []):
        rows.append({"symbol": sym, "name": sym, "value": None, "gain": gain,
                     "return_pct": None, "ytd_gain": None, "ytd_return_pct": None,
                     "contributor_type": "loser"})
    return rows


@app.get("/api/asset-classes")
def asset_classes(super_category: Optional[str] = None):
    """Return all asset class groups, optionally filtered by super_category."""
    data = ASSET_CLASSES
    if super_category:
        data = [ac for ac in data if ac["super_category"] == super_category]

    result = []
    for ac in data:
        cost = ac["value"] - ac["net_gain"]
        ytd  = _YTD_CLASS.get(ac["id"], {})
        result.append({
            "id":             ac["id"],
            "label":          ac["label"],
            "super_category": ac["super_category"],
            "value":          round(ac["value"], 2),
            "cost_basis":     round(cost, 2),
            "net_gain":       round(ac["net_gain"], 2),
            "return_pct":     ac["return_pct"],
            "weight_pct":     ac["weight"],
            "income":         round(ac.get("income", 0), 2),
            "top_winners":    ac.get("top", []),
            "top_losers":     ac.get("worst", []),
            "holdings":       _build_holdings(ac),
            "ytd_gain":       ytd.get("gain"),       # null if not available
            "ytd_return_pct": ytd.get("return_pct"), # null if not available
        })
    return result


@app.get("/api/allocation")
def allocation():
    """Portfolio allocation by super-category, with performance."""
    labels = {
        "equity":       "Public Equities",
        "alternatives": "Alternatives",
        "cash":         "Cash & Equivalents",
    }
    colors = {
        "equity":       "#00d4ff",
        "alternatives": "#00e676",
        "cash":         "#ffb300",
    }
    result = []
    for sc, totals in sorted(SUPER_TOTALS.items(), key=lambda x: -x[1]["value"]):
        v = totals["value"]
        g = totals["gain"]
        cost = v - g
        ret = (g / cost * 100) if cost > 0 else 0
        result.append({
            "category":  sc,
            "label":     labels.get(sc, sc),
            "value":     round(v, 2),
            "pct":       round(v / PORTAL_TOTAL * 100, 2),
            "net_gain":  round(g, 2),
            "return_pct": round(ret, 2),
            "color":     colors.get(sc, "#4a5a7a"),
        })
    return result


@app.get("/api/performance-matrix")
def performance_matrix():
    """
    All asset classes with return_pct and value — used for the equity vs alternatives
    performance scatter / bar comparison view.
    Portfolio benchmark: +20.74% since inception.
    """
    rows = []
    for ac in ASSET_CLASSES:
        rows.append({
            "id":          ac["id"],
            "label":       ac["label"],
            "category":    ac["super_category"],
            "value":       round(ac["value"], 2),
            "return_pct":  ac["return_pct"],
            "weight_pct":  ac["weight"],
            "vs_portfolio": round(ac["return_pct"] - PORTAL_RETURN_PCT, 2),
            "net_gain":    round(ac["net_gain"], 2),
        })
    rows.sort(key=lambda x: x["return_pct"], reverse=True)
    return {
        "portfolio_return": PORTAL_RETURN_PCT,
        "portfolio_value":  PORTAL_TOTAL,
        "rows": rows,
    }


@app.get("/api/alternatives")
def alternatives():
    """Alternatives detail — one card per vehicle."""
    alts = [ac for ac in ASSET_CLASSES if ac["super_category"] == "alternatives"]
    total_alt_value = sum(a["value"] for a in alts)
    total_alt_gain  = sum(a["net_gain"] for a in alts)
    cost = total_alt_value - total_alt_gain
    total_ret = (total_alt_gain / cost * 100) if cost > 0 else 0

    items = []
    for ac in sorted(alts, key=lambda x: -x["value"]):
        meta = ALT_META.get(ac["id"], {})
        items.append({
            "id":             ac["id"],
            "label":          ac["label"],
            "value":          round(ac["value"], 2),
            "net_gain":       round(ac["net_gain"], 2),
            "return_pct":     ac["return_pct"],
            "weight_pct":     ac["weight"],
            "alt_alloc_pct":  round(ac["value"] / total_alt_value * 100, 2),
            "income":         round(ac.get("income", 0), 2),
            "holdings":       ac.get("holdings", []),
            # ALT_META fields
            "reporting_freq": meta.get("reporting_freq", "quarterly"),
            "last_reported":  meta.get("last_reported"),
            "j_curve":        meta.get("j_curve", False),
            "j_curve_note":   meta.get("j_curve_note"),
            "benchmark_label": meta.get("benchmark_label"),
            "bond_proxy":     meta.get("bond_proxy", False),
            "group":          meta.get("group", "quarterly"),
        })
    return {
        "total_value":   round(total_alt_value, 2),
        "total_gain":    round(total_alt_gain, 2),
        "total_return_pct": round(total_ret, 2),
        "portfolio_pct": round(total_alt_value / PORTAL_TOTAL * 100, 2),
        "items":         items,
    }


@app.get("/api/monthly")
def monthly():
    txns = _load_transactions()
    monthly: dict[str, dict] = defaultdict(
        lambda: {"deposits":0.0,"withdrawals":0.0,"fees":0.0,"income":0.0,"other_exp":0.0}
    )
    for t in txns:
        ym  = t["year_month"]
        cat = _classify(t["activity"])
        amt = abs(t["amount"])
        m   = monthly[ym]
        if cat == "deposit":       m["deposits"]   += amt
        elif cat == "withdrawal":  m["withdrawals"] += amt
        elif cat == "fee":         m["fees"]        += amt
        elif cat == "income":      m["income"]      += amt
        elif cat == "other_expense": m["other_exp"] += amt

    result = []
    cumulative = 0.0
    for ym in sorted(monthly.keys()):
        m   = monthly[ym]
        net = m["deposits"] - m["withdrawals"]
        cumulative += net
        result.append({
            "month":               ym,
            "deposits":            round(m["deposits"], 2),
            "withdrawals":         round(m["withdrawals"], 2),
            "fees":                round(m["fees"], 2),
            "income":              round(m["income"], 2),
            "other_expenses":      round(m["other_exp"], 2),
            "net_flow":            round(net, 2),
            "cumulative_invested": round(cumulative, 2),
        })
    return result


@app.get("/api/fees")
def fees():
    txns     = _load_transactions()
    fee_txns = [t for t in txns if _classify(t["activity"]) == "fee"]

    monthly_fees: dict[str, float] = defaultdict(float)
    acct_fees:    dict[str, float] = defaultdict(float)
    fee_list = []

    ACCT_SHORT = {
        "637263814": "Vinod IRA", "637311192": "Individual TOD",
        "637263812": "Joint TOD", "637268133": "Sree IRA",
        "637762659-117": "Weather Mark", "637762659-185": "Putnam",
        "637762659-2": "LEIA", "637762659-53": "Invenomic",
        "637762659-21": "Gold SPDR", "637762659-0": "Untracked",
        "652645659": "401K (Closed)",
    }

    for t in fee_txns:
        ym  = t["year_month"]
        amt = abs(t["amount"])
        monthly_fees[ym] += amt
        acct_fees[t["account"]] += amt
        fee_list.append({
            "date":         t["date"].strftime("%Y-%m-%d"),
            "account":      t["account"],
            "account_name": ACCT_SHORT.get(t["account"], t["account"]),
            "description":  t["description"],
            "amount":       amt,
        })

    monthly_series = [{"month": k, "fees": round(v,2)} for k,v in sorted(monthly_fees.items())]
    total_fees     = sum(acct_fees.values())
    ann_rate       = (total_fees / PORTAL_TOTAL) / (22 / 12) * 100

    by_account = [
        {"account": a, "name": ACCT_SHORT.get(a, a), "total_fees": round(v, 2)}
        for a, v in sorted(acct_fees.items(), key=lambda x: -x[1])
    ]

    return {
        "total_fees":             round(total_fees, 2),
        "fee_count":              len(fee_txns),
        "annualized_fee_rate_pct": round(ann_rate, 4),
        "monthly_series":         monthly_series,
        "by_account":             by_account,
        "recent_fees":            sorted(fee_list, key=lambda x: x["date"], reverse=True)[:20],
    }


@app.get("/api/transactions")
def transactions(
    page:      int           = Query(1, ge=1),
    per_page:  int           = Query(50, ge=10, le=200),
    account:   Optional[str] = None,
    activity:  Optional[str] = None,
    date_from: Optional[str] = None,
    date_to:   Optional[str] = None,
    search:    Optional[str] = None,
):
    ACCT_SHORT = {
        "637263814": "Vinod IRA", "637311192": "Individual TOD",
        "637263812": "Joint TOD", "637268133": "Sree IRA",
        "637762659-117": "Weather Mark", "637762659-185": "Putnam",
        "637762659-2": "LEIA", "637762659-53": "Invenomic",
        "637762659-21": "Gold SPDR", "637762659-0": "Untracked",
        "652645659": "401K (Closed)",
    }
    txns = _load_transactions()
    filtered = txns
    if account:
        filtered = [t for t in filtered if t["account"] == account]
    if activity:
        filtered = [t for t in filtered if activity.lower() in t["activity"].lower()]
    if date_from:
        try:
            df = datetime.strptime(date_from, "%Y-%m-%d")
            filtered = [t for t in filtered if t["date"] >= df]
        except ValueError:
            pass
    if date_to:
        try:
            dt = datetime.strptime(date_to, "%Y-%m-%d")
            filtered = [t for t in filtered if t["date"] <= dt]
        except ValueError:
            pass
    if search:
        s = search.lower()
        filtered = [t for t in filtered if s in t["description"].lower()
                    or s in t["symbol"].lower() or s in t["activity"].lower()]

    filtered.sort(key=lambda x: x["date"], reverse=True)
    total  = len(filtered)
    start  = (page - 1) * per_page
    items  = []
    for t in filtered[start: start + per_page]:
        items.append({
            "date":         t["date"].strftime("%Y-%m-%d"),
            "account":      t["account"],
            "account_name": ACCT_SHORT.get(t["account"], t["account"]),
            "activity":     t["activity"],
            "type":         _classify(t["activity"]),
            "description":  t["description"],
            "symbol":       t["symbol"],
            "quantity":     t["quantity"],
            "price":        t["price"],
            "amount":       t["amount"],
            "cash_impact":  t["cash_impact"],
        })
    return {"items": items, "total": total, "page": page,
            "per_page": per_page, "pages": (total + per_page - 1) // per_page}


@app.get("/api/benchmarks")
def benchmarks():
    try:
        results = {}
        for ticker, label in [("SPY", "sp500"), ("AGG", "bloomberg_agg")]:
            obj  = yf.Ticker(ticker)
            hist = obj.history(period="2y")
            if hist.empty:
                results[label] = BENCHMARK_FALLBACK[label]
                continue
            latest = hist["Close"].iloc[-1]
            latest_date = hist.index[-1].strftime("%Y-%m-%d")

            def pct(days_back):
                if len(hist) <= days_back: return None
                old = hist["Close"].iloc[-days_back - 1]
                return round((latest - old) / old * 100, 2)

            today = hist.index[-1]
            month_rows = hist[hist.index.month == today.month]
            mtd = round((latest - month_rows["Close"].iloc[0]) / month_rows["Close"].iloc[0] * 100, 2) if not month_rows.empty else None
            year_rows  = hist[hist.index.year == today.year]
            ytd = round((latest - year_rows["Close"].iloc[0])  / year_rows["Close"].iloc[0]  * 100, 2) if not year_rows.empty  else None

            results[label] = {
                "ticker": ticker,
                "label":  "S&P 500 (Price Only)" if ticker == "SPY" else "Bloomberg US Aggregate",
                "price":  round(float(latest), 2),
                "as_of":  latest_date,
                "1d": pct(1), "mtd": mtd, "ytd": ytd, "1y": pct(252),
            }
        return results
    except Exception:
        return BENCHMARK_FALLBACK


@app.get("/api/insights")
def insights():
    """
    Portfolio vs blended passive benchmark (inception-to-date).
    Blended benchmark mirrors actual allocation: SPY at equity weight,
    AGG at alternatives weight (the bond-substitute thesis), cash yield at cash weight.
    """
    inception = PORTFOLIO_INCEPTION  # "2024-07-10"
    as_of     = PORTFOLIO_AS_OF      # "2026-05-05"

    eq_weight   = round(SUPER_TOTALS["equity"]["value"]       / PORTAL_TOTAL * 100, 1)
    alt_weight  = round(SUPER_TOTALS["alternatives"]["value"] / PORTAL_TOTAL * 100, 1)
    cash_weight = round(SUPER_TOTALS["cash"]["value"]         / PORTAL_TOTAL * 100, 1)

    bm      = _get_benchmark_itd()
    spy_itd = bm["spy_itd"]
    agg_itd = bm["agg_itd"]
    spy_1y  = bm["spy_1y"]
    agg_1y  = bm["agg_1y"]

    # Cash: approx. 4.75% annualised × 22 months ≈ 8.7%
    cash_itd = 8.7

    benchmark_itd = round(
        (eq_weight  / 100) * spy_itd +
        (alt_weight / 100) * agg_itd +
        (cash_weight / 100) * cash_itd,
        2
    )

    alpha_itd = round(PORTAL_RETURN_PCT - benchmark_itd, 2)

    # Fee efficiency
    gross_gain     = sum(ac["net_gain"] for ac in ASSET_CLASSES)
    fee_gap        = gross_gain - PORTAL_NET_GAIN
    fee_efficiency = round((PORTAL_NET_GAIN / gross_gain * 100) if gross_gain > 0 else 0, 1)

    # Alt bond-substitute metrics
    alts_itd = round(
        (SUPER_TOTALS["alternatives"]["gain"] /
         (SUPER_TOTALS["alternatives"]["value"] - SUPER_TOTALS["alternatives"]["gain"]) * 100)
        if (SUPER_TOTALS["alternatives"]["value"] - SUPER_TOTALS["alternatives"]["gain"]) > 0
        else 0, 2
    )
    alts_vs_bonds = round(alts_itd - agg_itd, 2)

    return {
        # Portfolio
        "portfolio_return":   PORTAL_RETURN_PCT,
        "irr_1y":             13.11,
        "inception_date":     inception,
        "as_of_date":         as_of,
        # Blended benchmark
        "benchmark_itd":      benchmark_itd,
        "spy_itd":            spy_itd,
        "agg_itd":            agg_itd,
        "cash_itd":           cash_itd,
        "spy_1y":             spy_1y,
        "agg_1y":             agg_1y,
        "spy_weight":         eq_weight,
        "agg_weight":         alt_weight,
        "cash_weight":        cash_weight,
        # Alpha
        "alpha_itd":          alpha_itd,
        "irr_vs_agg_1y":      round(13.11 - agg_1y, 2),
        # Fee efficiency
        "gross_gain":         round(gross_gain, 2),
        "net_gain":           PORTAL_NET_GAIN,
        "fee_gap":            round(fee_gap, 2),
        "fee_efficiency_pct": fee_efficiency,
        # Alts as bond substitute
        "alts_itd":           alts_itd,
        "alts_vs_bonds":      alts_vs_bonds,
        "alts_income":        round(sum(ac.get("income", 0) for ac in ASSET_CLASSES
                                       if ac["super_category"] == "alternatives"), 2),
    }


@app.get("/api/benchmarks-detail")
def benchmarks_detail():
    bm = _get_benchmark_itd()
    etf = _get_all_etf_returns()

    # Per-equity-class ETF benchmarks
    etf_returns = {}
    for asset_id, (ticker, name) in EQUITY_ETF_MAP.items():
        etf_returns[ticker] = {
            "return_pct": etf.get(ticker),
            "ticker": ticker,
            "name": name,
            "asset_id": asset_id,
        }
    # Add SPY and AGG from the main benchmark fetch (more reliable)
    etf_returns["SPY"] = {"return_pct": bm["spy_itd"], "ticker": "SPY", "name": "S&P 500 (SPY)", "asset_id": None}
    etf_returns["AGG"] = {"return_pct": bm["agg_itd"], "ticker": "AGG", "name": "US Agg Bonds (AGG)", "asset_id": None}

    # Target-date funds
    td_returns = {}
    for ticker, name in TARGET_DATE_FUNDS.items():
        td_returns[ticker] = {"return_pct": etf.get(ticker), "ticker": ticker, "name": name}

    # Bond proxies
    bond_returns = {}
    for ticker, name in BOND_PROXIES.items():
        bond_returns[ticker] = {"return_pct": etf.get(ticker), "ticker": ticker, "name": name}
    bond_returns["AGG"] = {"return_pct": bm["agg_itd"], "ticker": "AGG", "name": "Bloomberg US Aggregate (AGG)"}

    return {
        "as_of": PORTFOLIO_AS_OF,
        "inception": PORTFOLIO_INCEPTION,
        "etf_returns": etf_returns,
        "target_date_returns": td_returns,
        "bond_proxy_returns": bond_returns,
    }


@app.get("/api/target-date")
def target_date_comparison():
    etf = _get_all_etf_returns()
    vtthx_ret = etf.get("VTTHX") or 17.1
    vforx_ret = etf.get("VFORX") or 18.9

    def hypo(ret_pct):
        return round(PORTAL_COST_BASIS * (1 + ret_pct / 100), 2)

    return {
        "as_of": PORTFOLIO_AS_OF,
        "inception": PORTFOLIO_INCEPTION,
        "user_age": 52,
        "portfolio_return_pct": PORTAL_RETURN_PCT,
        "portfolio_value": PORTAL_TOTAL,
        "portfolio_cost_basis": PORTAL_COST_BASIS,
        "target_date": {
            "primary": {
                "ticker": "VTTHX",
                "name": "Vanguard Target 2035",
                "return_pct": vtthx_ret,
                "hypothetical_value": hypo(vtthx_ret),
                "dollar_difference": round(PORTAL_TOTAL - hypo(vtthx_ret), 2),
                "allocation": "~65% global equity / 35% bonds",
            },
            "secondary": {
                "ticker": "VFORX",
                "name": "Vanguard Target 2040",
                "return_pct": vforx_ret,
                "hypothetical_value": hypo(vforx_ret),
                "dollar_difference": round(PORTAL_TOTAL - hypo(vforx_ret), 2),
                "allocation": "~75% global equity / 25% bonds",
            },
        },
        "caveat": "Alternatives sleeve (~57%) carries illiquidity premium not captured by VTTHX. PE/VC J-curve funds show 0% return during capital call phase — understating true portfolio momentum.",
    }


@app.get("/api/alt-commitments")
def alt_commitments_endpoint():
    result = []
    for ac_id, d in ALT_COMMITMENTS.items():
        called_pct = round(d["called"] / d["committed"] * 100, 1) if d["committed"] > 0 else 0
        result.append({
            "id": ac_id,
            "label": d["label"],
            "committed": d["committed"],
            "called": d["called"],
            "uncalled": d["uncalled"],
            "called_pct": called_pct,
            "est_vintage_end": d["est_vintage_end"],
        })
    return {"commitments": result}


# ── Risk & Planning constants ──────────────────────────────────────────────────

# Estimated month-end portfolio values (market value, all accounts).
# Anchor: 2026-05 = $2,392,970 (actual from AllSource portal).
# All prior months are estimates — update from AllSource monthly statements for exact risk metrics.
_VALUE_SERIES_RAW = _SNAP.get("value_series") or [
    {"month": "2024-07", "value": 695000},
    {"month": "2024-08", "value": 862000},
    {"month": "2024-09", "value": 1628000},
    {"month": "2024-10", "value": 1682000},
    {"month": "2024-11", "value": 1762000},
    {"month": "2024-12", "value": 1728000},
    {"month": "2025-01", "value": 1718000},
    {"month": "2025-02", "value": 1685000},
    {"month": "2025-03", "value": 1638000},
    {"month": "2025-04", "value": 1508000},
    {"month": "2025-05", "value": 1598000},
    {"month": "2025-06", "value": 1652000},
    {"month": "2025-07", "value": 1706000},
    {"month": "2025-08", "value": 2162000},
    {"month": "2025-09", "value": 2118000},
    {"month": "2025-10", "value": 2222000},
    {"month": "2025-11", "value": 2255000},
    {"month": "2025-12", "value": 2312000},
    {"month": "2026-01", "value": 2270000},
    {"month": "2026-02", "value": 2245000},
    {"month": "2026-03", "value": 2358000},
    {"month": "2026-04", "value": 2358000},
    {"month": "2026-05", "value": 2411419},
]
PORTFOLIO_VALUE_SERIES = [(s["month"], s["value"]) for s in _VALUE_SERIES_RAW]

# Liquidity classification by asset class id
LIQUIDITY_MAP = {
    # Liquid — public market, T+2 settlement
    "lc_core":           "liquid",
    "lc_growth":         "liquid",
    "lc_value":          "liquid",
    "mc_core":           "liquid",
    "mc_growth":         "liquid",
    "mc_value":          "liquid",
    "sc_core":           "liquid",
    "sc_growth":         "liquid",
    "sc_value":          "liquid",
    "foreign_lc_growth": "liquid",
    "foreign_sm_growth": "liquid",
    "intl_developed":    "liquid",
    "commodity":         "liquid",   # GLDM — exchange-traded gold
    # Semi-liquid — quarterly redemption windows, 45-90 days notice
    "hedged_equity":     "semi_liquid",
    "managed_futures":   "semi_liquid",
    "hedge_fund":        "semi_liquid",
    # Illiquid — 5-10 year lock-up, no redemption
    "private_credit":    "illiquid",
    "private_equity":    "illiquid",
    "venture":           "illiquid",
}

LIQUIDITY_LABELS = {
    "liquid":      ("Liquid (T+2)", "Public market securities — sellable within 2 business days"),
    "semi_liquid": ("Semi-Liquid (30–90 days)", "Hedge/managed funds with quarterly redemption windows; notice period required"),
    "illiquid":    ("Illiquid (locked)", "Private market assets — PE, VC, Private Credit with 5–10 year fund lives"),
}

# Retirement planning config
RETIREMENT_CONFIG = {
    "current_age":       52,
    "retirement_age":    65,
    "target_portfolio":  5_000_000,   # $5M (supports ~$200K/yr at 4% withdrawal rate)
    "risk_free_rate":    5.0,         # Approximate Fed funds rate during the period
}

# Official risk metrics — sourced from AllSource/Tamarac Account Analytics export 2026-05-09
RISK_METRICS = {
    "as_of":   "2026-05-09",
    "source":  "Tamarac (official)",
    "itd": {
        "sharpe":               0.84,
        "sortino":              1.26,
        "std_dev":              0.0845,
        "downside_dev":         0.0565,
        "beta":                 0.43,
        "alpha_raw":           -0.0614,
        "jensens_alpha":        0.0143,
        "upside_capture":       0.26,
        "downside_capture":     0.65,
        "r_squared":            0.7331,
        "net_return_ann":       0.1143,
    },
    "ytd_2026": {
        "sharpe":               None,
        "beta":                 0.41,
        "alpha_raw":           -0.0753,
        "jensens_alpha":       -0.0326,
        "upside_capture":       0.22,
        "downside_capture":     0.70,
        "r_squared":            0.6694,
    },
    "fy_2025": {
        "sharpe":               0.89,
        "sortino":              1.35,
        "std_dev":              0.0995,
        "downside_dev":         0.0657,
        "net_return":           0.1307,
    },
    "benchmark_itd": {
        "sp500_sharpe":         0.70,
        "sp500_sortino":        1.02,
        "sp500_std_dev":        0.1688,
        "sp500_net_return_ann": 0.1610,
    },
}


def _compute_risk_metrics() -> dict:
    import statistics, math

    series = PORTFOLIO_VALUE_SERIES
    months_total = 22

    # Annualized return from ITD return
    ann_return = ((1 + PORTAL_RETURN_PCT / 100) ** (12 / months_total) - 1) * 100

    # Monthly returns — skip months with large net capital additions (>$100K)
    large_flow_months = {"2024-07", "2024-08", "2024-09", "2025-08", "2025-10",
                         "2025-12", "2026-01", "2026-02", "2026-03", "2026-04"}
    vals = {m: v for m, v in series}
    ordered = [m for m, _ in series]
    clean_rets = []
    for i in range(1, len(ordered)):
        m = ordered[i]
        if m in large_flow_months:
            continue
        prev = vals[ordered[i - 1]]
        if prev > 0:
            clean_rets.append((vals[m] - prev) / prev)

    vol_monthly = statistics.stdev(clean_rets) if len(clean_rets) > 1 else 0.031
    vol_annual  = vol_monthly * math.sqrt(12) * 100
    rf          = RETIREMENT_CONFIG["risk_free_rate"]
    sharpe      = round((ann_return - rf) / vol_annual, 2) if vol_annual else 0

    # Max drawdown
    peak = 0
    max_dd = 0.0
    dd_start = dd_trough = None
    cur_peak_m = None
    for m, v in series:
        if v > peak:
            peak = v
            cur_peak_m = m
        if peak > 0:
            dd = (v - peak) / peak * 100
            if dd < max_dd:
                max_dd = dd
                dd_start  = cur_peak_m
                dd_trough = m

    return {
        "annualized_return_pct": round(ann_return, 2),
        "volatility_pct":        round(vol_annual, 1),
        "sharpe_ratio":          sharpe,
        "risk_free_rate_pct":    rf,
        "max_drawdown_pct":      round(max_dd, 1),
        "max_drawdown_start":    dd_start,
        "max_drawdown_trough":   dd_trough,
        "data_note": "Volatility & drawdown derived from estimated monthly valuations. Update PORTFOLIO_VALUE_SERIES in backend/main.py with actual AllSource monthly statements for exact figures.",
    }


def _compute_liquidity() -> dict:
    tiers: dict = {"liquid": [], "semi_liquid": [], "illiquid": []}
    # Cash super_category → liquid
    for ac in ASSET_CLASSES:
        if ac["super_category"] == "cash":
            tiers["liquid"].append({"id": ac["id"], "label": ac["label"], "value": ac["value"]})
        else:
            t = LIQUIDITY_MAP.get(ac["id"], "semi_liquid")
            tiers[t].append({"id": ac["id"], "label": ac["label"], "value": ac["value"]})

    result = []
    for tier_id, assets in tiers.items():
        total = sum(a["value"] for a in assets)
        label, desc = LIQUIDITY_LABELS[tier_id]
        result.append({
            "tier":   tier_id,
            "label":  label,
            "description": desc,
            "value":  round(total, 2),
            "pct":    round(total / PORTAL_TOTAL * 100, 1),
            "assets": [a["label"] for a in assets],
        })

    liquid_val    = next((t["value"] for t in result if t["tier"] == "liquid"), 0)
    semi_val      = next((t["value"] for t in result if t["tier"] == "semi_liquid"), 0)
    illiquid_val  = next((t["value"] for t in result if t["tier"] == "illiquid"), 0)
    return {
        "tiers":        result,
        "liquid_30d":   round(liquid_val, 0),
        "liquid_90d":   round(liquid_val + semi_val, 0),
        "locked":       round(illiquid_val, 0),
        "locked_pct":   round(illiquid_val / PORTAL_TOTAL * 100, 1),
    }


def _compute_concentration() -> dict:
    SINGLE_THRESHOLD = 15.0   # flag any single position > 15%
    SUPER_THRESHOLDS = {"alternatives": 50.0, "equity": 70.0, "cash": 20.0}
    total = PORTAL_TOTAL

    warnings = []
    for ac in ASSET_CLASSES:
        pct = ac["value"] / total * 100
        if pct >= SINGLE_THRESHOLD:
            severity = "high" if pct >= 25 else "medium"
            warnings.append({
                "id":            ac["id"],
                "label":         ac["label"],
                "super_category": ac["super_category"],
                "value":         round(ac["value"], 0),
                "pct":           round(pct, 1),
                "threshold_pct": SINGLE_THRESHOLD,
                "severity":      severity,
                "note":          f"Single {'illiquid ' if LIQUIDITY_MAP.get(ac['id']) == 'illiquid' else ''}position = {pct:.1f}% of total portfolio",
            })

    super_conc = []
    for cat, threshold in SUPER_THRESHOLDS.items():
        val = SUPER_TOTALS.get(cat, {}).get("value", 0)
        pct = val / total * 100
        super_conc.append({
            "category":      cat,
            "value":         round(val, 0),
            "pct":           round(pct, 1),
            "threshold_pct": threshold,
            "is_over":       pct > threshold,
        })

    # Herfindahl-Hirschman Index (sum of squared weight fractions × 100)
    hhi = sum((ac["value"] / total * 100) ** 2 for ac in ASSET_CLASSES) / 100
    largest = max(ASSET_CLASSES, key=lambda a: a["value"])

    return {
        "warnings":                warnings,
        "super_category_concentration": super_conc,
        "largest_single_position": {
            "id":    largest["id"],
            "label": largest["label"],
            "value": round(largest["value"], 0),
            "pct":   round(largest["value"] / total * 100, 1),
        },
        "hhi": round(hhi, 1),
        "diversification_note": "Lower HHI = more diversified. A 20-position equal-weight portfolio scores ~5. Above 15 = moderate concentration.",
    }


def _compute_retirement(ann_return_pct: float) -> dict:
    import math
    cfg       = RETIREMENT_CONFIG
    years     = cfg["retirement_age"] - cfg["current_age"]
    current   = PORTAL_TOTAL
    target    = cfg["target_portfolio"]

    req_rate  = ((target / current) ** (1 / years) - 1) * 100

    scenarios = [
        {"id": "conservative", "label": "Conservative (6%)",    "rate": 6.0},
        {"id": "moderate",     "label": "Moderate (8%)",         "rate": 8.0},
        {"id": "current",      "label": f"Current pace ({ann_return_pct:.1f}%)", "rate": round(ann_return_pct, 2)},
    ]
    for s in scenarios:
        s["projected_value"] = round(current * (1 + s["rate"] / 100) ** years)
        s["reaches_target"]  = s["projected_value"] >= target

    base_year = 2026
    projection_series = []
    for y in range(years + 1):
        row = {"year": base_year + y, "target": target}
        for s in scenarios:
            row[s["id"]] = round(current * (1 + s["rate"] / 100) ** y)
        projection_series.append(row)

    return {
        "current_age":         cfg["current_age"],
        "retirement_age":      cfg["retirement_age"],
        "years_to_retirement": years,
        "current_aum":         current,
        "target_portfolio":    target,
        "required_return_pct": round(req_rate, 2),
        "annualized_return_pct": round(ann_return_pct, 2),
        "on_track":            ann_return_pct >= req_rate,
        "scenarios":           scenarios,
        "projection_series":   projection_series,
    }


@app.get("/api/risk")
def risk():
    rm  = _compute_risk_metrics()
    liq = _compute_liquidity()
    con = _compute_concentration()
    ret = _compute_retirement(rm["annualized_return_pct"])
    return {
        "as_of":              PORTFOLIO_AS_OF,
        "inception":          PORTFOLIO_INCEPTION,
        "months":             22,
        "risk_metrics":       rm,
        "equity_curve":       [{"month": m, "value": v} for m, v in PORTFOLIO_VALUE_SERIES],
        "liquidity":          liq,
        "concentration":      con,
        "retirement":         ret,
    }


@app.get("/api/risk-metrics")
def get_risk_metrics():
    return RISK_METRICS


# ── AI Chat ────────────────────────────────────────────────────────────────────

class ChatMsg(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    history: List[ChatMsg] = []


@lru_cache(maxsize=1)
def _get_benchmark_itd() -> dict:
    """Fetch inception-to-date returns for SPY and AGG from yfinance. Cached after first call."""
    inception = PORTFOLIO_INCEPTION
    result = {"spy_itd": None, "agg_itd": None, "spy_1y": None, "agg_1y": None}
    try:
        for ticker, itd_key, y1_key in [("SPY", "spy_itd", "spy_1y"), ("AGG", "agg_itd", "agg_1y")]:
            hist = yf.Ticker(ticker).history(start=inception, end="2026-05-06")
            if hist.empty:
                continue
            s = float(hist["Close"].iloc[0])
            e = float(hist["Close"].iloc[-1])
            result[itd_key] = round((e - s) / s * 100, 2)
            if len(hist) >= 252:
                p = float(hist["Close"].iloc[-252])
                result[y1_key] = round((e - p) / p * 100, 2)
    except Exception:
        pass
    result["spy_itd"]  = result["spy_itd"]  or 31.65
    result["agg_itd"]  = result["agg_itd"]  or 8.63
    result["spy_1y"]   = result["spy_1y"]   or 29.91
    result["agg_1y"]   = result["agg_1y"]   or 5.07
    return result


@lru_cache(maxsize=1)
def _get_all_etf_returns() -> dict:
    """Fetch ITD returns for all ETF benchmarks. Returns dict[ticker] = return_pct or None."""
    all_tickers = set()
    for ticker, _ in EQUITY_ETF_MAP.values():
        all_tickers.add(ticker)
    all_tickers.update(TARGET_DATE_FUNDS.keys())
    all_tickers.update(BOND_PROXIES.keys())

    results = {}
    for ticker in all_tickers:
        try:
            hist = yf.Ticker(ticker).history(start=PORTFOLIO_INCEPTION, end="2026-05-06")
            if hist.empty:
                results[ticker] = None
                continue
            s = float(hist["Close"].iloc[0])
            e = float(hist["Close"].iloc[-1])
            results[ticker] = round((e - s) / s * 100, 2)
        except Exception:
            results[ticker] = None
    return results


def _build_system_prompt() -> str:
    """Build a rich, data-driven system prompt from live portfolio constants."""
    bm  = _get_benchmark_itd()
    st  = SUPER_TOTALS
    eq  = st.get("equity",       {"value": 0, "gain": 0, "income": 0})
    alt = st.get("alternatives", {"value": 0, "gain": 0, "income": 0})
    csh = st.get("cash",         {"value": 0, "gain": 0, "income": 0})

    def ret(group):
        cost = group["value"] - group["gain"]
        return (group["gain"] / cost * 100) if cost > 0 else 0

    gross_gain = sum(ac["net_gain"] for ac in ASSET_CLASSES)
    fee_gap    = gross_gain - PORTAL_NET_GAIN

    # Asset class table
    equity_rows = []
    alts_rows   = []
    for ac in sorted(ASSET_CLASSES, key=lambda x: -x["value"]):
        line = (f"  • {ac['label']}: ${ac['value']:>12,.0f} | "
                f"gain {'+' if ac['net_gain']>=0 else ''}{ac['net_gain']:>10,.0f} | "
                f"return {ac['return_pct']:>+7.2f}% | weight {ac['weight']:.2f}%")
        if ac["super_category"] == "equity":
            equity_rows.append(line)
        elif ac["super_category"] == "alternatives":
            alts_rows.append(line)

    # Private equity sub-fund detail
    pe = next((ac for ac in ASSET_CLASSES if ac["id"] == "private_equity"), None)
    pe_holdings = ""
    if pe and pe.get("holdings"):
        pe_holdings = "\n  Private Equity sub-funds:\n" + "\n".join(
            f"    – {h['name']}: ${h['value']:,.0f} | gain ${h['gain']:+,.0f} | {h['return_pct']:+.2f}%"
            for h in pe["holdings"]
        )

    hf = next((ac for ac in ASSET_CLASSES if ac["id"] == "hedge_fund"), None)
    hf_holdings = ""
    if hf and hf.get("holdings"):
        hf_holdings = "\n  Hedge Fund sub-funds:\n" + "\n".join(
            f"    – {h['name']}: ${h['value']:,.0f} | gain ${h['gain']:+,.0f} | {h['return_pct']:+.2f}%"
            for h in hf["holdings"]
        )

    return f"""You are Portfolio Intelligence AI — a precise financial analyst for the Srinivasan household portfolio managed through Tamarac Advisory / AllSource.

## CRITICAL: Data Architecture
There are exactly TWO data sources — cite which one you're using in every answer.

1. **Tamarac CSV** (`data/transactions.csv`, {7550}+ rows, Jul 10 2024 – May 5 2026):
   Transaction ledger: deposits, withdrawals, management fees, dividends, interest, buy/sell trades.
   Used for: total fees paid, monthly cash flows, income, transaction history.

2. **AllSource Portal Snapshot** (hardcoded in `backend/main.py` constants):
   Position Performance Inception tab, as of May 5, 2026.
   Used for: AUM, net gain, return %, IRR, all asset class values and gains.

There is **no MongoDB** in this project. Data is CSV + hardcoded portal snapshot only.

---

## Portfolio Overview (Inception Jul 10, 2024 → May 5, 2026)

| KPI | Value | Source | Formula |
|-----|-------|--------|---------|
| Total AUM | ${PORTAL_TOTAL:,.2f} | Portal snapshot | Sum of all 20 asset class market values |
| Cost Basis | ${PORTAL_COST_BASIS:,.2f} | Portal snapshot | AUM − Net Gain = {PORTAL_TOTAL:,.2f} − {PORTAL_NET_GAIN:,.2f} |
| Net Gain (net of fees) | ${PORTAL_NET_GAIN:+,.2f} | Portal snapshot | Portal "Net Investment Gain" line — fees already deducted |
| Since-Inception Return | {PORTAL_RETURN_PCT:+.2f}% | Portal snapshot | Time-weighted / Modified Dietz; roughly Net Gain / Cost Basis |
| Gross Gain (position-level) | ${gross_gain:+,.0f} | Portal snapshot | Sum of all 20 asset class gains before fee netting |
| Fee gap (gross − net) | ${fee_gap:,.0f} | Computed | Gross gain − Portal net gain; fee drag embedded in managed NAVs |
| IRR 1-Year | 13.11% | Portal snapshot | Annualised internal rate of return from Tamarac engine |
| IRR YTD | 0.08% | Portal snapshot | Year-to-date IRR |
| IRR QTD | 1.89% | Portal snapshot | Quarter-to-date IRR |
| Total Fees Paid | ~$43,847 | **CSV ledger** | SUM(abs(Amount)) WHERE Activity LIKE 'Management Fee%' |
| Avg Monthly Fee | ~$1,993 | **CSV ledger** | Total fees / 22 months of data |
| Ann. Fee Rate | ~0.96% | **CSV ledger** | (Total Fees / AUM) / (22/12) × 100 |

---

## Allocation (computed from asset class values)

| Sleeve | Value | % AUM | Return |
|--------|-------|-------|--------|
| Public Equities | ${eq['value']:,.2f} | {eq['value']/PORTAL_TOTAL*100:.2f}% | {ret(eq):+.2f}% |
| Alternatives | ${alt['value']:,.2f} | {alt['value']/PORTAL_TOTAL*100:.2f}% | {ret(alt):+.2f}% |
| Cash & Equivalents | ${csh['value']:,.2f} | {csh['value']/PORTAL_TOTAL*100:.2f}% | {ret(csh):+.2f}% |

---

## Equity Asset Classes (sorted by value)
{chr(10).join(equity_rows)}

## Alternatives Asset Classes (sorted by value)
{chr(10).join(alts_rows)}
{pe_holdings}
{hf_holdings}

---

## Fee Deep-Dive (from CSV ledger)
- Fees are extracted from transactions.csv by filtering rows where Activity = "Management Fee"
- Major fee payers: Vinod IRA (largest), followed by Weather Mark, LEIA, Putnam, Invenomic
- Annualised fee rate formula: (total_fees / AUM) / (data_months / 12) × 100
  = ($43,847 / $2,392,970) / (22/12) × 100 = 0.9607%
- The ~$27K gap between gross gains ($387K) and net gain ($359K) is fee drag absorbed at position NAV level in the managed sleeves (Weather Mark, Putnam, LEIA)

---

## Benchmark Comparison (ACTUAL from yfinance — DO NOT guess or substitute these numbers)

All figures are inception-to-date (Jul 10, 2024 → May 5, 2026) fetched live from yfinance at server startup.

| Benchmark | ITD Return | 1-Year Return | Source |
|-----------|-----------|---------------|--------|
| **Your Portfolio** | **+{PORTAL_RETURN_PCT:.2f}%** | **+13.11% (IRR)** | AllSource portal |
| S&P 500 (SPY) | {'+' if bm['spy_itd']>=0 else ''}{bm['spy_itd']:.2f}% | {'+' if bm['spy_1y']>=0 else ''}{bm['spy_1y']:.2f}% | yfinance real data |
| Bloomberg Agg (AGG) | {'+' if bm['agg_itd']>=0 else ''}{bm['agg_itd']:.2f}% | {'+' if bm['agg_1y']>=0 else ''}{bm['agg_1y']:.2f}% | yfinance real data |

Blended passive benchmark (matches your actual allocation weights):
- Formula: {eq['value']/PORTAL_TOTAL*100:.1f}% × SPY ITD + {alt['value']/PORTAL_TOTAL*100:.1f}% × AGG ITD + {csh['value']/PORTAL_TOTAL*100:.1f}% × cash yield (~8.7%)
- Blended result: +{round(eq['value']/PORTAL_TOTAL*bm['spy_itd'] + alt['value']/PORTAL_TOTAL*bm['agg_itd'] + csh['value']/PORTAL_TOTAL*8.7, 2):.2f}%
- Alpha (portfolio minus blended benchmark): {'+' if PORTAL_RETURN_PCT - round(eq['value']/PORTAL_TOTAL*bm['spy_itd'] + alt['value']/PORTAL_TOTAL*bm['agg_itd'] + csh['value']/PORTAL_TOTAL*8.7, 2) >= 0 else ''}{PORTAL_RETURN_PCT - round(eq['value']/PORTAL_TOTAL*bm['spy_itd'] + alt['value']/PORTAL_TOTAL*bm['agg_itd'] + csh['value']/PORTAL_TOTAL*8.7, 2):.2f}%

CRITICAL: When asked about S&P 500 or benchmark performance, ALWAYS use the real numbers above from yfinance. Never say "for illustration purposes" or "approximately". These are exact figures.

---

## Performance Notes
- Best equity: Large-Cap Growth +75.93% (TSLA +196%, PLTR +166%, NVDA +95%)
- Worst equity: Small-Cap Growth -90.62% (tiny position, $10.9K)
- Best alt: Private Credit +30.11% (PRF Fund II)
- Worst alt: Hedged Equity (BIVIX) -3.69%
- Private Equity is the single largest position: ${next((ac['value'] for ac in ASSET_CLASSES if ac['id']=='private_equity'),0):,.0f} ({next((ac['weight'] for ac in ASSET_CLASSES if ac['id']=='private_equity'),0):.1f}% of AUM)

---

## Answer guidelines
- Always cite whether a number comes from the CSV ledger or the portal snapshot
- Show the exact formula when explaining a KPI
- When comparing gross vs net gain, explain the fee-netting mechanic
- Be concise — use tables or bullet points for multi-part answers
- If asked about a specific asset class, pull exact figures from the tables above
"""


@app.post("/api/chat")
async def chat(req: ChatRequest):
    if not GROQ_API_KEY:
        raise HTTPException(
            status_code=400,
            detail="GROQ_API_KEY is not set. Add it to a .env file or export it in your shell before starting the server."
        )

    system_prompt = _build_system_prompt()

    messages = [{"role": "system", "content": system_prompt}]
    for h in req.history[-12:]:          # keep last 12 turns as context
        messages.append({"role": h.role, "content": h.content})
    messages.append({"role": "user", "content": req.message})

    async def generate():
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                async with client.stream(
                    "POST",
                    GROQ_URL,
                    headers={
                        "Authorization": f"Bearer {GROQ_API_KEY}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model":       GROQ_MODEL,
                        "messages":    messages,
                        "stream":      True,
                        "temperature": 0.05,
                        "max_tokens":  1200,
                    },
                ) as resp:
                    if resp.status_code != 200:
                        body = await resp.aread()
                        yield f"data: {json.dumps({'error': f'GROQ error {resp.status_code}: {body.decode()[:200]}'})}\n\n"
                        return

                    async for line in resp.aiter_lines():
                        if not line.startswith("data: "):
                            continue
                        payload = line[6:]
                        if payload.strip() == "[DONE]":
                            yield "data: [DONE]\n\n"
                            return
                        try:
                            chunk  = json.loads(payload)
                            token  = chunk["choices"][0]["delta"].get("content", "")
                            if token:
                                yield f"data: {json.dumps({'token': token})}\n\n"
                        except (json.JSONDecodeError, KeyError):
                            continue
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})
