"""
FAIRRATE — Model & Macro Drift Monitoring Module
Monitors policy repo rate drift and input feature distribution drift (PSI & KS-test).
"""

import os
import sys
import json
import numpy as np
import pandas as pd
from scipy import stats
from typing import Dict, Any

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
META_PATH = os.path.join(BASE_DIR, "models", "model_meta.json")
DATA_PATH = os.path.join(BASE_DIR, "data", "loan_data.csv")
RBI_PATH = os.path.join(BASE_DIR, "config", "rbi_rates.json")

NUMERICAL_FEATURES = [
    "credit_score", "annual_income_lakh", "loan_amount_lakh",
    "tenure_years", "ltv_ratio", "existing_obligations_pct",
]


def calculate_psi(baseline: np.ndarray, current: np.ndarray, num_buckets: int = 10) -> float:
    """Computes Population Stability Index (PSI) between baseline and current sample."""
    baseline = baseline[~np.isnan(baseline)]
    current = current[~np.isnan(current)]
    if len(baseline) == 0 or len(current) == 0:
        return 0.0

    percentiles = np.linspace(0, 100, num_buckets + 1)
    bucket_bounds = np.percentile(baseline, percentiles)
    bucket_bounds[0] -= 1e-5
    bucket_bounds[-1] += 1e-5

    b_counts, _ = np.histogram(baseline, bins=bucket_bounds)
    c_counts, _ = np.histogram(current, bins=bucket_bounds)

    b_percents = (b_counts + 1e-4) / (len(baseline) + 1e-4 * num_buckets)
    c_percents = (c_counts + 1e-4) / (len(current) + 1e-4 * num_buckets)

    psi_val = np.sum((c_percents - b_percents) * np.log(c_percents / b_percents))
    return round(float(psi_val), 4)


def check_model_drift() -> Dict[str, Any]:
    """
    Evaluates policy repo rate delta and input feature PSI/KS statistics.
    Returns status: 'OK' or 'RETRAIN_RECOMMENDED'.
    """
    # 1. Load model metadata
    if not os.path.exists(META_PATH):
        return {
            "status": "UNKNOWN",
            "message": "model_meta.json not found. Run ml/train.py first.",
            "policy_drift": {},
            "feature_drift": {},
        }

    with open(META_PATH, "r", encoding="utf-8") as f:
        meta = json.load(f)

    trained_repo_rate = float(meta.get("rbi_repo_rate_at_training", 6.50))
    last_trained_date = meta.get("trained_date", "Unknown")
    model_version = meta.get("version", "1.0.0")

    # 2. Load current RBI rates
    current_repo_rate = 6.50
    rbi_source = "RBI MPC Policy Release"
    if os.path.exists(RBI_PATH):
        try:
            with open(RBI_PATH, "r", encoding="utf-8") as f:
                rbi = json.load(f)
                current_repo_rate = float(rbi.get("repo_rate", 6.50))
                rbi_source = rbi.get("source", rbi_source)
        except Exception:
            pass

    repo_delta = round(current_repo_rate - trained_repo_rate, 2)
    policy_drift_detected = abs(repo_delta) >= 0.50  # 50 bps shift triggers retrain

    # 3. Feature Distribution Drift (compare training set with a recent simulation slice)
    feature_drift_results = []
    has_feature_drift = False

    if os.path.exists(DATA_PATH):
        try:
            df = pd.read_csv(DATA_PATH)
            # Use top half as reference baseline, bottom slice as current monitoring sample
            split_idx = int(len(df) * 0.70)
            baseline_df = df.iloc[:split_idx]
            current_df = df.iloc[split_idx:]

            for feat in NUMERICAL_FEATURES:
                base_vals = baseline_df[feat].dropna().values
                curr_vals = current_df[feat].dropna().values

                psi = calculate_psi(base_vals, curr_vals)
                ks_stat, p_val = stats.ks_2samp(base_vals, curr_vals)

                # PSI > 0.20 signifies significant distributional shift
                drift_flag = psi > 0.20
                if drift_flag:
                    has_feature_drift = True

                feature_drift_results.append({
                    "feature": feat,
                    "psi": psi,
                    "ks_statistic": round(float(ks_stat), 4),
                    "p_value": round(float(p_val), 4),
                    "status": "DRIFT_DETECTED" if drift_flag else "STABLE",
                })
        except Exception as e:
            pass

    # Overall recommendation
    retrain_recommended = policy_drift_detected or has_feature_drift
    overall_status = "RETRAIN_RECOMMENDED" if retrain_recommended else "OK"

    return {
        "status": overall_status,
        "model_version": model_version,
        "last_trained_date": last_trained_date,
        "policy_rates": {
            "trained_repo_rate": trained_repo_rate,
            "current_repo_rate": current_repo_rate,
            "repo_delta_bps": int(repo_delta * 100),
            "source": rbi_source,
            "policy_drift_flag": policy_drift_detected,
        },
        "feature_drift": feature_drift_results,
        "retrain_instructions": "To retrain with fresh policy rates and benchmark cards, execute: python data/generate_data.py && python ml/train.py",
        "notes": "PSI < 0.10: Stable | 0.10 - 0.20: Moderate Drift | > 0.20: Significant Drift requiring model update."
    }


if __name__ == "__main__":
    res = check_model_drift()
    print("=" * 60)
    print("FAIRRATE DRIFT MONITOR REPORT")
    print(f"Overall Status: {res['status']}")
    print(f"Model Version: {res['model_version']} (Trained: {res['last_trained_date']})")
    print(f"Policy Repo Rate: Training {res['policy_rates']['trained_repo_rate']}% vs Current {res['policy_rates']['current_repo_rate']}% ({res['policy_rates']['repo_delta_bps']:+d} bps)")
    print("=" * 60)
    for f in res.get("feature_drift", []):
        print(f"  • {f['feature']:<25} PSI: {f['psi']:.4f} | {f['status']}")
