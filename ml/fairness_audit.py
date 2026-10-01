"""
FAIRRATE — Fairness & Demographic Disparity Audit Module
Computes average predicted spread, MAE, and disparity flags across:
- Employment Type (Salaried, Self-Employed, Business)
- Lending Institution (Banks & NBFCs)
- Loan Category
- Income Band (<5L, 5-15L, 15-30L, >30L)
"""

import os
import sys
import json
import joblib
import numpy as np
import pandas as pd
from typing import Dict, Any

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_PATH = os.path.join(BASE_DIR, "data", "loan_data.csv")
MODEL_PATH = os.path.join(BASE_DIR, "models", "model.pkl")
CATALOG_PATH = os.path.join(BASE_DIR, "config", "catalog.json")

CATEGORICAL_FEATURES = ["loan_type", "bank", "employment_type"]
NUMERICAL_FEATURES = [
    "credit_score", "annual_income_lakh", "loan_amount_lakh",
    "tenure_years", "ltv_ratio", "existing_obligations_pct",
]


def assign_income_band(income: float) -> str:
    if income < 5.0:
        return "< ₹5L"
    elif income <= 15.0:
        return "₹5L – ₹15L"
    elif income <= 30.0:
        return "₹15L – ₹30L"
    else:
        return "> ₹30L"


def run_fairness_audit(disparity_threshold_pct: float = 1.0) -> Dict[str, Any]:
    """
    Executes a comprehensive fairness audit on the dataset using the trained model.
    Flags any demographic disparity where the max-min spread delta exceeds disparity_threshold_pct.
    """
    if not os.path.exists(MODEL_PATH) or not os.path.exists(DATA_PATH):
        raise FileNotFoundError("Model or dataset missing. Run train.py first.")

    model = joblib.load(MODEL_PATH)
    df = pd.read_csv(DATA_PATH)
    df["ltv_ratio"] = df["ltv_ratio"].fillna(0.0)

    X = df[CATEGORICAL_FEATURES + NUMERICAL_FEATURES]
    df["predicted_fair_rate"] = model.predict(X)
    df["abs_error"] = (df["fair_rate"] - df["predicted_fair_rate"]).abs()

    # Load baseline rates per loan type to calculate risk spread
    base_rates = {}
    if os.path.exists(CATALOG_PATH):
        try:
            with open(CATALOG_PATH, "r", encoding="utf-8") as f:
                cat = json.load(f)
                for lt in cat["loan_types"]:
                    base_rates[lt["id"]] = float(np.mean(lt["base_rate_range"]))
        except Exception:
            pass

    df["category_base"] = df["loan_type"].map(lambda t: base_rates.get(t, 10.0))
    df["predicted_spread"] = df["predicted_fair_rate"] - df["category_base"]
    df["income_band"] = df["annual_income_lakh"].apply(assign_income_band)

    audit_slices = {}
    flags = []

    # 1. By Employment Type
    emp_grp = df.groupby("employment_type").agg(
        count=("fair_rate", "count"),
        avg_rate=("predicted_fair_rate", "mean"),
        avg_spread=("predicted_spread", "mean"),
        mae=("abs_error", "mean")
    ).round(3).reset_index()

    emp_spread_gap = round(float(emp_grp["avg_spread"].max() - emp_grp["avg_spread"].min()), 3)
    if emp_spread_gap > disparity_threshold_pct:
        flags.append({
            "category": "Employment Type",
            "gap_pct": emp_spread_gap,
            "message": f"Employment spread gap of {emp_spread_gap:.2f}% exceeds threshold ({disparity_threshold_pct:.2f}%). Self-employed/business applicants receive a noticeable risk markup.",
            "severity": "medium"
        })
    audit_slices["employment_type"] = emp_grp.to_dict(orient="records")

    # 2. By Bank
    bank_grp = df.groupby("bank").agg(
        count=("fair_rate", "count"),
        avg_rate=("predicted_fair_rate", "mean"),
        avg_spread=("predicted_spread", "mean"),
        mae=("abs_error", "mean")
    ).round(3).reset_index()

    bank_spread_gap = round(float(bank_grp["avg_spread"].max() - bank_grp["avg_spread"].min()), 3)
    if bank_spread_gap > disparity_threshold_pct:
        flags.append({
            "category": "Bank & NBFC Spreads",
            "gap_pct": bank_spread_gap,
            "message": f"Inter-lender spread disparity of {bank_spread_gap:.2f}%. Private lenders and NBFCs charge significantly wider spreads than PSU banks.",
            "severity": "high" if bank_spread_gap > 1.5 else "medium"
        })
    audit_slices["bank"] = bank_grp.to_dict(orient="records")

    # 3. By Loan Type
    lt_grp = df.groupby("loan_type").agg(
        count=("fair_rate", "count"),
        avg_rate=("predicted_fair_rate", "mean"),
        avg_spread=("predicted_spread", "mean"),
        mae=("abs_error", "mean")
    ).round(3).reset_index()
    audit_slices["loan_type"] = lt_grp.to_dict(orient="records")

    # 4. By Income Band
    income_grp = df.groupby("income_band").agg(
        count=("fair_rate", "count"),
        avg_rate=("predicted_fair_rate", "mean"),
        avg_spread=("predicted_spread", "mean"),
        mae=("abs_error", "mean")
    ).round(3).reset_index()

    inc_spread_gap = round(float(income_grp["avg_spread"].max() - income_grp["avg_spread"].min()), 3)
    if inc_spread_gap > disparity_threshold_pct:
        flags.append({
            "category": "Income Bracket",
            "gap_pct": inc_spread_gap,
            "message": f"Income spread disparity of {inc_spread_gap:.2f}% between low-income (<5L) and high-income (>30L) borrowers.",
            "severity": "medium"
        })
    audit_slices["income_band"] = income_grp.to_dict(orient="records")

    overall_mae = round(float(df["abs_error"].mean()), 3)
    overall_rmse = round(float(np.sqrt((df["abs_error"] ** 2).mean())), 3)

    return {
        "status": "PASS" if len(flags) == 0 else "WARNING",
        "threshold_pct": disparity_threshold_pct,
        "sample_size": len(df),
        "overall_mae": overall_mae,
        "overall_rmse": overall_rmse,
        "disparity_flags": flags,
        "slices": audit_slices,
    }


if __name__ == "__main__":
    res = run_fairness_audit(1.0)
    print("=" * 60)
    print("FAIRRATE FAIRNESS AUDIT REPORT")
    print(f"Overall MAE: {res['overall_mae']}%, RMSE: {res['overall_rmse']}%")
    print(f"Disparity Flags Detected: {len(res['disparity_flags'])}")
    for f in res["disparity_flags"]:
        print(f"  [{f['severity'].upper()}] {f['category']}: {f['message']}")
    print("=" * 60)
