"""
FAIRRATE — Synthetic Loan Dataset Generator
Generates ~5,000 rows of synthetic loan data based on real RBI & Indian bank rate cards.
Run: python data/generate_data.py
"""

import numpy as np
import pandas as pd
import os
import random

random.seed(42)
np.random.seed(42)

# ─────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────
N_ROWS = 5000
OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "loan_data.csv")

LOAN_TYPES = ["personal", "home", "car", "education"]
BANKS = ["SBI", "HDFC", "ICICI", "Axis", "Kotak"]
EMPLOYMENT_TYPES = ["salaried", "self_employed", "business"]

# Base rate ranges (min, max) per loan type — approximate RBI/bank published rates
BASE_RATE_RANGES = {
    "personal":  (10.5, 18.0),
    "home":      (8.5,  9.5),
    "car":       (8.5,  10.5),
    "education": (8.0,  11.0),
}

# Bank-specific micro adjustments (spread relative to category base)
BANK_SPREAD = {
    "SBI":   -0.25,
    "HDFC":  0.0,
    "ICICI": 0.15,
    "Axis":  0.20,
    "Kotak": 0.30,
}

# Loan amount ranges in lakhs per loan type
LOAN_AMOUNT_RANGES = {
    "personal":  (1.0,  25.0),
    "home":      (10.0, 200.0),
    "car":       (3.0,  40.0),
    "education": (1.0,  40.0),
}

# Tenure ranges in years
TENURE_RANGES = {
    "personal":  (1, 7),
    "home":      (5, 30),
    "car":       (1, 7),
    "education": (1, 15),
}

# ─────────────────────────────────────────────
# Rate computation logic
# ─────────────────────────────────────────────

def credit_score_spread(credit_score: int) -> float:
    """Higher spread for lower credit scores."""
    if credit_score >= 750:
        return 0.0
    elif credit_score >= 700:
        return 0.75
    elif credit_score >= 650:
        return 1.5
    elif credit_score >= 600:
        return 2.25
    else:
        return 3.0


def employment_spread(employment_type: str) -> float:
    """Self-employed and business owners carry higher risk."""
    spreads = {
        "salaried":     0.0,
        "self_employed": 0.5,
        "business":     1.0,
    }
    return spreads.get(employment_type, 0.0)


def ltv_spread(ltv_ratio: float, loan_type: str) -> float:
    """High LTV means less collateral buffer — add spread."""
    if loan_type not in ("home", "car"):
        return 0.0
    if ltv_ratio is None or np.isnan(ltv_ratio):
        return 0.0
    if ltv_ratio >= 0.85:
        return 1.5
    elif ltv_ratio >= 0.75:
        return 0.75
    elif ltv_ratio >= 0.65:
        return 0.25
    return 0.0


def obligation_spread(existing_obligations_pct: float) -> float:
    """Heavy existing EMI load raises default risk."""
    if existing_obligations_pct >= 50:
        return 1.5
    elif existing_obligations_pct >= 35:
        return 0.75
    elif existing_obligations_pct >= 20:
        return 0.25
    return 0.0


def income_spread(annual_income_lakh: float, loan_amount_lakh: float) -> float:
    """High loan-to-income ratio = higher risk."""
    if annual_income_lakh <= 0:
        return 1.0
    ratio = loan_amount_lakh / annual_income_lakh
    if ratio > 6:
        return 1.0
    elif ratio > 4:
        return 0.5
    elif ratio > 2:
        return 0.25
    return 0.0


def compute_fair_rate(row: dict) -> float:
    """Compute the fair interest rate for a given borrower profile."""
    loan_type = row["loan_type"]
    bank = row["bank"]

    base_min, base_max = BASE_RATE_RANGES[loan_type]
    # Pick a base rate mid-point with small noise
    base_rate = (base_min + base_max) / 2.0 + np.random.uniform(-0.3, 0.3)

    spread = 0.0
    spread += BANK_SPREAD.get(bank, 0.0)
    spread += credit_score_spread(row["credit_score"])
    spread += employment_spread(row["employment_type"])
    spread += ltv_spread(row.get("ltv_ratio", np.nan), loan_type)
    spread += obligation_spread(row["existing_obligations_pct"])
    spread += income_spread(row["annual_income_lakh"], row["loan_amount_lakh"])

    fair_rate = base_rate + spread
    # Clamp within realistic bounds
    fair_rate = max(base_min - 0.5, min(base_max + 3.5, fair_rate))
    # Add tiny noise to avoid perfect collinearity
    fair_rate += np.random.normal(0, 0.1)
    return round(fair_rate, 2)


# ─────────────────────────────────────────────
# Data generation
# ─────────────────────────────────────────────

def generate_row() -> dict:
    loan_type = np.random.choice(LOAN_TYPES)
    bank = np.random.choice(BANKS)
    employment_type = np.random.choice(EMPLOYMENT_TYPES, p=[0.55, 0.30, 0.15])

    credit_score = int(np.clip(np.random.normal(700, 80), 300, 900))
    annual_income_lakh = round(np.random.uniform(2.0, 50.0), 1)

    amt_min, amt_max = LOAN_AMOUNT_RANGES[loan_type]
    loan_amount_lakh = round(np.random.uniform(amt_min, amt_max), 1)

    ten_min, ten_max = TENURE_RANGES[loan_type]
    tenure_years = int(np.random.randint(ten_min, ten_max + 1))

    # LTV only meaningful for home/car
    if loan_type in ("home", "car"):
        ltv_ratio = round(np.random.uniform(0.50, 0.90), 2)
    else:
        ltv_ratio = np.nan

    existing_obligations_pct = round(np.random.uniform(0.0, 60.0), 1)

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


def generate_dataset(n: int = N_ROWS) -> pd.DataFrame:
    print(f"Generating {n} synthetic loan records...")
    rows = [generate_row() for _ in range(n)]
    df = pd.DataFrame(rows)

    # Reorder columns sensibly
    col_order = [
        "loan_type", "bank", "credit_score", "annual_income_lakh",
        "employment_type", "loan_amount_lakh", "tenure_years",
        "ltv_ratio", "existing_obligations_pct", "fair_rate",
    ]
    df = df[col_order]

    print(f"\nDataset shape: {df.shape}")
    print(f"\nFair rate statistics:")
    print(df["fair_rate"].describe().round(3))
    print(f"\nFair rate by loan type:")
    print(df.groupby("loan_type")["fair_rate"].describe().round(3))
    return df


if __name__ == "__main__":
    df = generate_dataset(N_ROWS)
    df.to_csv(OUTPUT_PATH, index=False)
    print(f"\n[OK] Dataset saved to: {OUTPUT_PATH}")
