"""
FAIRRATE — Synthetic Loan Dataset Generator
Generates ~6,000 rows of synthetic loan data based on real RBI & Indian bank rate cards.
Calibrated against real rate-card bounds from data/real_rate_cards.csv.
Run: python data/generate_data.py
"""

import os
import sys
import json
import random
import numpy as np
import pandas as pd

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

random.seed(42)
np.random.seed(42)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

from ml.load_real_data import calibrate_synthetic_rate

# Load shared catalog configuration
CATALOG_PATH = os.path.join(BASE_DIR, "config", "catalog.json")
with open(CATALOG_PATH, "r", encoding="utf-8") as f:
    CATALOG = json.load(f)

N_ROWS = 6000
OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "loan_data.csv")

BANKS = [b["id"] for b in CATALOG["banks"]]
BANK_SPREAD = {b["id"]: b["base_spread"] for b in CATALOG["banks"]}

LOAN_TYPES = [lt["id"] for lt in CATALOG["loan_types"]]
BASE_RATE_RANGES = {lt["id"]: tuple(lt["base_rate_range"]) for lt in CATALOG["loan_types"]}
LOAN_AMOUNT_RANGES = {lt["id"]: (lt["min_amount"], lt["max_amount"]) for lt in CATALOG["loan_types"]}
TENURE_RANGES = {lt["id"]: (lt["min_tenure"], lt["max_tenure"]) for lt in CATALOG["loan_types"]}
LTV_RULES = {lt["id"]: (lt["has_ltv"], lt["max_ltv"]) for lt in CATALOG["loan_types"]}

EMPLOYMENT_TYPES = ["salaried", "self_employed", "business"]


def credit_score_spread(credit_score: int) -> float:
    """Higher spread for lower credit scores based on Indian credit tiering."""
    if credit_score >= 750:
        return 0.0
    elif credit_score >= 700:
        return 0.75
    elif credit_score >= 650:
        return 1.50
    elif credit_score >= 600:
        return 2.25
    else:
        return 3.00


def employment_spread(employment_type: str) -> float:
    """Self-employed and unorganized business owners carry risk premium."""
    spreads = {
        "salaried": 0.0,
        "self_employed": 0.50,
        "business": 0.90,
    }
    return spreads.get(employment_type, 0.0)


def ltv_spread(ltv_ratio: float, loan_type: str) -> float:
    """High LTV means reduced collateral cushion — risk spread added."""
    has_ltv, max_cap = LTV_RULES.get(loan_type, (False, None))
    if not has_ltv or ltv_ratio is None or np.isnan(ltv_ratio):
        return 0.0

    if loan_type == "gold":
        # Gold loans have strict 75% RBI regulatory LTV cap
        return 0.75 if ltv_ratio > 0.70 else 0.0
    elif loan_type == "lap":
        # LAP loans typically capped at 65% LTV
        return 1.25 if ltv_ratio > 0.60 else (0.50 if ltv_ratio > 0.50 else 0.0)
    else:
        # Home & Car loans
        if ltv_ratio >= 0.85:
            return 1.50
        elif ltv_ratio >= 0.75:
            return 0.75
        elif ltv_ratio >= 0.65:
            return 0.25
        return 0.0


def obligation_spread(existing_obligations_pct: float) -> float:
    """Heavy existing debt burden increases default risk (FOIR ratio)."""
    if existing_obligations_pct >= 50:
        return 1.50
    elif existing_obligations_pct >= 35:
        return 0.75
    elif existing_obligations_pct >= 20:
        return 0.25
    return 0.0


def income_spread(annual_income_lakh: float, loan_amount_lakh: float) -> float:
    """High loan-to-income multiplier signals repayment strain."""
    if annual_income_lakh <= 0:
        return 1.00
    ratio = loan_amount_lakh / annual_income_lakh
    if ratio > 6:
        return 1.00
    elif ratio > 4:
        return 0.50
    elif ratio > 2:
        return 0.25
    return 0.0


def compute_fair_rate(row: dict) -> float:
    """Compute the fair interest rate calibrated to real published bank rate cards."""
    loan_type = row["loan_type"]
    bank = row["bank"]

    base_min, base_max = BASE_RATE_RANGES[loan_type]
    base_rate = (base_min + base_max) / 2.0 + np.random.uniform(-0.25, 0.25)

    spread = 0.0
    spread += BANK_SPREAD.get(bank, 0.0)
    spread += credit_score_spread(row["credit_score"])
    spread += employment_spread(row["employment_type"])
    spread += ltv_spread(row.get("ltv_ratio", np.nan), loan_type)
    spread += obligation_spread(row["existing_obligations_pct"])
    spread += income_spread(row["annual_income_lakh"], row["loan_amount_lakh"])

    raw_rate = base_rate + spread + np.random.normal(0, 0.08)
    # Calibrate and clamp within real rate card bounds
    calibrated = calibrate_synthetic_rate(raw_rate, bank, loan_type)
    return round(calibrated, 2)


def generate_row() -> dict:
    loan_type = np.random.choice(LOAN_TYPES, p=[0.24, 0.22, 0.16, 0.12, 0.10, 0.08, 0.08])
    bank = np.random.choice(BANKS)
    employment_type = np.random.choice(EMPLOYMENT_TYPES, p=[0.60, 0.25, 0.15])

    credit_score = int(np.clip(np.random.normal(715, 75), 300, 900))
    annual_income_lakh = round(float(np.clip(np.random.exponential(12.0) + 3.0, 2.0, 80.0)), 1)

    amt_min, amt_max = LOAN_AMOUNT_RANGES[loan_type]
    loan_amount_lakh = round(float(np.random.uniform(amt_min, amt_max)), 1)

    ten_min, ten_max = TENURE_RANGES[loan_type]
    tenure_years = int(np.random.randint(ten_min, ten_max + 1))

    has_ltv, max_cap = LTV_RULES[loan_type]
    if has_ltv:
        ltv_min = 0.40
        ltv_max = max_cap or 0.85
        ltv_ratio = round(float(np.random.uniform(ltv_min, ltv_max)), 2)
    else:
        ltv_ratio = np.nan

    existing_obligations_pct = round(float(np.clip(np.random.normal(22.0, 12.0), 0.0, 65.0)), 1)

    row = {
        "loan_type": loan_type,
        "bank": bank,
        "credit_score": credit_score,
        "annual_income_lakh": annual_income_lakh,
        "employment_type": employment_type,
        "loan_amount_lakh": loan_amount_lakh,
        "tenure_years": tenure_years,
        "ltv_ratio": ltv_ratio,
        "existing_obligations_pct": existing_obligations_pct,
    }
    row["fair_rate"] = compute_fair_rate(row)
    return row


def main():
    print(f"Generating {N_ROWS} synthetic loan records calibrated with real rate cards...")
    rows = [generate_row() for _ in range(N_ROWS)]
    df = pd.DataFrame(rows)

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    df.to_csv(OUTPUT_PATH, index=False)
    print(f" Saved to: {OUTPUT_PATH}")
    print(f" Dataset shape: {df.shape}")
    print("\nSummary by Loan Type:")
    print(df.groupby("loan_type")["fair_rate"].agg(["count", "mean", "min", "max"]).round(2))
    print("\nSummary by Bank:")
    print(df.groupby("bank")["fair_rate"].agg(["count", "mean", "min", "max"]).round(2))


if __name__ == "__main__":
    main()
