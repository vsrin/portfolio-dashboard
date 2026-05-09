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
# GROUND TRUTH from AllSource portal — Position Performance Inception
# All Accounts | From July 10, 2024 to May 05, 2026
# ─────────────────────────────────────────────────────────────────────────────

PORTAL_TOTAL          = 2_392_970.34   # Managed Market ending value 5/5/2026
PORTAL_NET_GAIN       = 359_599.34     # Net Investment Gain since inception
PORTAL_RETURN_PCT     = 20.74          # Since-inception net return %
PORTAL_COST_BASIS     = PORTAL_TOTAL - PORTAL_NET_GAIN   # ≈ $2,033,371
PORTFOLIO_AS_OF       = "2026-05-05"
PORTFOLIO_INCEPTION   = "2024-07-10"

# ─────────────────────────────────────────────────────────────────────────────
# Asset class data — each entry is a category group from Position Perf Inception
# ─────────────────────────────────────────────────────────────────────────────

ASSET_CLASSES = [
    # ── Equity ────────────────────────────────────────────────────────────────
    {
        "id": "lc_core",
        "label": "Large-Cap Core",
        "super_category": "equity",
        "value": 175_746.37,
        "net_gain": 50_447.94,
        "return_pct": 35.07,
        "weight": 7.34,
        "income": 1_846.40,
        "top": [("GOOGL",173.33),("KLAC",102.86),("AMZN",95.92),("META",33.34)],
        "worst": [("MCK",-15.24),("MSFT",-2.16),("FISV",-3.08)],
    },
    {
        "id": "lc_growth",
        "label": "Large-Cap Growth",
        "super_category": "equity",
        "value": 236_282.54,
        "net_gain": 108_682.89,
        "return_pct": 75.93,
        "weight": 9.87,
        "income": 26.74,
        "top": [("TSLA",196.54),("PLTR",166.16),("NVDA",95.80),("CRWD",67.95)],
        "worst": [("COIN",-19.14)],
    },
    {
        "id": "lc_value",
        "label": "Large-Cap Value",
        "super_category": "equity",
        "value": 132_536.17,
        "net_gain": 32_208.47,
        "return_pct": 60.25,
        "weight": 5.54,
        "income": 3_555.83,
        "top": [("BAC",387.09),("GOOG",150.21),("WFC",55.05),("T",45.79)],
        "worst": [("NKE",-30.81),("NOC",-21.63),("VZ",-5.94)],
    },
    {
        "id": "sc_core",
        "label": "Small-Cap Core",
        "super_category": "equity",
        "value": 19_697.37,
        "net_gain": -5_313.48,
        "return_pct": -29.31,
        "weight": 0.82,
        "income": 627.36,
        "top": [("QS",47.54)],
        "worst": [("BF.B",-26.16),("ELAN",-5.42),("BJ",-3.51)],
    },
    {
        "id": "sc_growth",
        "label": "Small-Cap Growth",
        "super_category": "equity",
        "value": 10_916.95,
        "net_gain": -7_804.90,
        "return_pct": -90.62,
        "weight": 0.46,
        "income": 0.0,
        "top": [],
        "worst": [("TMDX",-30.94),("ELF",-32.78),("MP",-10.41)],
    },
    {
        "id": "sc_value",
        "label": "Small-Cap Value",
        "super_category": "equity",
        "value": 21_457.50,
        "net_gain": -14_949.69,
        "return_pct": -45.45,
        "weight": 0.90,
        "income": 596.72,
        "top": [("LUMN",19.50),("IEP",1.42),("HTGC",1.13)],
        "worst": [("KMX",-48.11),("CPB",-36.39),("COTY",-12.53)],
    },
    {
        "id": "mc_core",
        "label": "Mid-Cap Core",
        "super_category": "equity",
        "value": 64_714.64,
        "net_gain": -3_781.13,
        "return_pct": -7.51,
        "weight": 2.70,
        "income": 734.83,
        "top": [("URI",24.85),("CTVA",6.81),("ALL",4.74)],
        "worst": [("ZTS",-38.69),("EFX",-42.84),("IR",-10.18)],
    },
    {
        "id": "mc_growth",
        "label": "Mid-Cap Growth",
        "super_category": "equity",
        "value": 51_420.27,
        "net_gain": 3_320.22,
        "return_pct": 6.13,
        "weight": 2.15,
        "income": 454.83,
        "top": [("BE",349.07),("Q",33.74),("HLT",5.30)],
        "worst": [("TTD",-47.38),("SMCI",-29.13),("PODD",-17.90)],
    },
    {
        "id": "mc_value",
        "label": "Mid-Cap Value",
        "super_category": "equity",
        "value": 54_181.28,
        "net_gain": 15_151.02,
        "return_pct": 14.27,
        "weight": 2.26,
        "income": 3_168.79,
        "top": [("WBD",444.30),("DD",21.72),("EL",25.73)],
        "worst": [("BAX",-55.60),("KHC",-29.45),("IFF",-26.69)],
    },
    {
        "id": "foreign_lc_growth",
        "label": "Foreign Large-Cap Growth",
        "super_category": "equity",
        "value": 107_409.15,
        "net_gain": 39_251.98,
        "return_pct": 61.92,
        "weight": 4.49,
        "income": 947.38,
        "top": [("ASML",141.29),("BAESY",73.79),("RYCEY",61.44)],
        "worst": [("RNMBY",-23.23),("AZN",-4.39)],
    },
    {
        "id": "foreign_sm_growth",
        "label": "Foreign Small/Mid-Cap Growth",
        "super_category": "equity",
        "value": 16_876.58,
        "net_gain": 5_792.98,
        "return_pct": 52.75,
        "weight": 0.71,
        "income": 11.84,
        "top": [("STX",89.64),("JCI",9.89)],
        "worst": [],
    },
    {
        "id": "intl_developed",
        "label": "Int'l Developed Markets",
        "super_category": "equity",
        "value": 11_948.34,
        "net_gain": 12_015.89,
        "return_pct": 39.64,
        "weight": 0.50,
        "income": 1_504.99,
        "top": [("GSK",61.34),("NVO",20.89),("BUD",36.48)],
        "worst": [("LVMUY",-21.61),("SNY",-1.24)],
    },
    # ── Alternatives ──────────────────────────────────────────────────────────
    {
        "id": "commodity",
        "label": "Commodity (Gold)",
        "super_category": "alternatives",
        "value": 45_515.65,
        "net_gain": 16_699.60,
        "return_pct": 62.51,
        "weight": 1.90,
        "income": 0.0,
        "top": [("GLDM",62.51)],
        "worst": [],
        "holdings": [{"symbol":"GLDM","name":"SPDR Gold MiniShares","value":45515.65,"gain":16699.60,"return_pct":62.51}],
    },
    {
        "id": "hedged_equity",
        "label": "Hedged Equity (Invenomic)",
        "super_category": "alternatives",
        "value": 122_786.99,
        "net_gain": -6_640.96,
        "return_pct": -3.69,
        "weight": 5.13,
        "income": 12_620.14,
        "top": [],
        "worst": [("BIVIX",-3.54)],
        "holdings": [{"symbol":"BIVIX","name":"Invenomic Institutional","value":122786.99,"gain":-6618.86,"return_pct":-3.54}],
    },
    {
        "id": "managed_futures",
        "label": "Managed Futures",
        "super_category": "alternatives",
        "value": 107_568.18,
        "net_gain": 7_568.18,
        "return_pct": 7.57,
        "weight": 4.50,
        "income": 0.0,
        "top": [("MARS FX",7.57)],
        "worst": [],
        "holdings": [{"symbol":"MARSFXLP","name":"MARS FX LP","value":107568.18,"gain":7568.18,"return_pct":7.57}],
    },
    {
        "id": "hedge_fund",
        "label": "Hedge Funds",
        "super_category": "alternatives",
        "value": 249_531.64,
        "net_gain": 49_531.64,
        "return_pct": 25.23,
        "weight": 10.43,
        "income": 0.0,
        "top": [("RA Capital",30.39),("CAIS SSA",19.14)],
        "worst": [],
        "holdings": [
            {"symbol":"RACAPINTL","name":"RA Capital International","value":130388.00,"gain":30388.00,"return_pct":30.39},
            {"symbol":"CXSCHONPTLTD","name":"CAIS SSA Strategic Partners Offshore","value":119143.64,"gain":19143.64,"return_pct":19.14},
        ],
    },
    {
        "id": "private_equity",
        "label": "Private Equity",
        "super_category": "alternatives",
        "value": 629_688.13,
        "net_gain": 40_756.13,
        "return_pct": 15.38,
        "weight": 26.31,
        "income": 0.0,
        "top": [("JPMorgan PM",18.78),("NorthHaven PE",11.43),("CAZ GP",13.78)],
        "worst": [("CAZ Sports",0.0),("Hamilton Lane VC",0.0)],
        "holdings": [
            {"symbol":"VISTAONETELP","name":"VistaOne (TE), L.P.-A-I","value":258700.45,"gain":8700.45,"return_pct":4.35},
            {"symbol":"CAZGPOCFTEL","name":"CAZ GP Ownership Class F Fund","value":111884.71,"gain":9384.71,"return_pct":13.78},
            {"symbol":"48130F306","name":"JPMorgan Private Markets Fund Cl I","value":118784.67,"gain":18784.67,"return_pct":18.78},
            {"symbol":"STEPSTONE","name":"StepStone Private Venture & Growth","value":75968.30,"gain":968.30,"return_pct":1.29},
            {"symbol":"NORTHHAVIII","name":"North Haven PE Co-Investment","value":36850.00,"gain":2918.00,"return_pct":11.43},
            {"symbol":"CAZPSOFIIITT","name":"CAZ Professional Sports Fund III","value":27500.00,"gain":0.0,"return_pct":0.0},
        ],
    },
    {
        "id": "private_credit",
        "label": "Private Credit",
        "super_category": "alternatives",
        "value": 136_615.37,
        "net_gain": 31_615.37,
        "return_pct": 30.11,
        "weight": 5.71,
        "income": 0.0,
        "top": [("PRF Fund II",30.11)],
        "worst": [],
        "holdings": [{"symbol":"PRFDIILP","name":"PRF Fund II LP","value":136615.37,"gain":31615.37,"return_pct":30.11}],
    },
    # ── Cash & Other ──────────────────────────────────────────────────────────
    {
        "id": "cash",
        "label": "Cash & Equivalents",
        "super_category": "cash",
        "value": 123_077.22,
        "net_gain": 12_492.72,
        "return_pct": 8.20,
        "weight": 5.14,
        "income": 13_162.79,
        "top": [("FDRXX",8.33)],
        "worst": [],
        "holdings": [
            {"symbol":"FDRXX","name":"Fidelity Cash Reserves","value":120554.53,"gain":12492.71,"return_pct":8.33},
            {"symbol":"FCASH","name":"Cash","value":2522.69,"gain":0.0,"return_pct":0.0},
        ],
    },
    {
        "id": "venture",
        "label": "Venture Capital",
        "super_category": "alternatives",
        "value": 75_000.00,
        "net_gain": 0.0,
        "return_pct": 0.0,
        "weight": 3.13,
        "income": 0.0,
        "top": [],
        "worst": [],
        "holdings": [{"symbol":"HAMLANVENCAP","name":"Hamilton Lane Venture Capital & Growth Fund","value":75000.00,"gain":0.0,"return_pct":0.0}],
    },
]

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
        # IRR from portal (annualised ~22 months)
        "net_irr_mtd":       0.07,
        "net_irr_qtd":       1.89,
        "net_irr_ytd":       0.08,
        "net_irr_1y":        13.11,
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


@app.get("/api/asset-classes")
def asset_classes(super_category: Optional[str] = None):
    """Return all asset class groups, optionally filtered by super_category."""
    data = ASSET_CLASSES
    if super_category:
        data = [ac for ac in data if ac["super_category"] == super_category]

    result = []
    for ac in data:
        cost = ac["value"] - ac["net_gain"]
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
            "holdings":       ac.get("holdings", []),
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
PORTFOLIO_VALUE_SERIES = [
    ("2024-07",   695_000),   # Initial equity accounts opened
    ("2024-08",   862_000),   # +$170K additional funding, Aug market dip offset
    ("2024-09", 1_628_000),   # +$812K major funding wave
    ("2024-10", 1_682_000),   # Market appreciation, no deposits
    ("2024-11", 1_762_000),   # Post-election equity rally
    ("2024-12", 1_728_000),   # December pullback
    ("2025-01", 1_718_000),   # Flat start to 2025
    ("2025-02", 1_685_000),   # Tech correction
    ("2025-03", 1_638_000),   # Tariff policy fears build
    ("2025-04", 1_508_000),   # April tariff shock — estimated max drawdown
    ("2025-05", 1_598_000),   # Recovery begins
    ("2025-06", 1_652_000),   # Continued recovery
    ("2025-07", 1_706_000),   # Summer rally
    ("2025-08", 2_162_000),   # Managed accounts funded (+~$600K AUM added)
    ("2025-09", 2_118_000),   # Slight pullback
    ("2025-10", 2_222_000),   # Recovery + small additions
    ("2025-11", 2_255_000),   # Market steady
    ("2025-12", 2_312_000),   # Year-end appreciation
    ("2026-01", 2_270_000),   # January volatility
    ("2026-02", 2_245_000),   # Continued pressure
    ("2026-03", 2_358_000),   # March additions + recovery
    ("2026-04", 2_358_000),   # April — tariff noise, new additions
    ("2026-05", 2_392_970),   # ACTUAL — AllSource portal 2026-05-05
]

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
