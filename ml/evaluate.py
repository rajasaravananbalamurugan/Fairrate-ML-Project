"""
FAIRRATE — Model Evaluation Script
Print detailed metrics, plots, and comparisons.

Run: python ml/evaluate.py
"""

import os
import sys
import warnings
import numpy as np
import pandas as pd
import joblib

from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score

warnings.filterwarnings("ignore")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_PATH = os.path.join(BASE_DIR, "data", "loan_data.csv")
MODEL_PATH = os.path.join(BASE_DIR, "models", "model.pkl")

CATEGORICAL_FEATURES = ["loan_type", "bank", "employment_type"]
NUMERICAL_FEATURES = [
    "credit_score", "annual_income_lakh", "loan_amount_lakh",
    "tenure_years", "ltv_ratio", "existing_obligations_pct",
]
TARGET = "fair_rate"


def main():
    if not os.path.exists(MODEL_PATH):
        print("❌ Model not found. Run: python ml/train.py first.")
        sys.exit(1)

    df = pd.read_csv(DATA_PATH)
    df["ltv_ratio"] = df["ltv_ratio"].fillna(0.0)

    from sklearn.model_selection import train_test_split
    X = df[CATEGORICAL_FEATURES + NUMERICAL_FEATURES]
    y = df[TARGET]
    _, X_test, _, y_test = train_test_split(X, y, test_size=0.20, random_state=42)

    model = joblib.load(MODEL_PATH)
    y_pred = model.predict(X_test)

    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    mae  = mean_absolute_error(y_test, y_pred)
    r2   = r2_score(y_test, y_pred)

    print("\n" + "="*50)
    print("  FAIRRATE — Model Evaluation Report")
    print("="*50)
    print(f"  RMSE:  {rmse:.4f}%")
    print(f"  MAE:   {mae:.4f}%")
    print(f"  R²:    {r2:.4f}")

    # Per loan type breakdown
    test_df = X_test.copy()
    test_df["y_true"] = y_test.values
    test_df["y_pred"] = y_pred
    test_df["abs_error"] = (test_df["y_true"] - test_df["y_pred"]).abs()

    print("\n\n📊 Per Loan-Type MAE")
    print(f"{'Loan Type':<15} {'MAE':>8}")
    print("─" * 25)
    for lt, grp in test_df.groupby("loan_type"):
        print(f"{lt:<15} {grp['abs_error'].mean():>8.4f}%")

    print("\n📊 Per Bank MAE")
    print(f"{'Bank':<10} {'MAE':>8}")
    print("─" * 20)
    for bk, grp in test_df.groupby("bank"):
        print(f"{bk:<10} {grp['abs_error'].mean():>8.4f}%")

    print("\n✅ Evaluation complete.\n")


if __name__ == "__main__":
    main()
