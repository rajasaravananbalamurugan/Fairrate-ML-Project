"""
FAIRRATE — ML Training Pipeline
Trains Random Forest Regressor and Gradient Boosting Regressor, compares them,
saves the best model and preprocessor.

Run: python ml/train.py
"""

import os
import sys
import warnings
import joblib
import numpy as np
import pandas as pd

from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score

warnings.filterwarnings("ignore")

# ─────────────────────────────────────────────
# Paths
# ─────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_PATH = os.path.join(BASE_DIR, "data", "loan_data.csv")
MODELS_DIR = os.path.join(BASE_DIR, "models")
os.makedirs(MODELS_DIR, exist_ok=True)

MODEL_PATH = os.path.join(MODELS_DIR, "model.pkl")
PREPROCESSOR_PATH = os.path.join(MODELS_DIR, "preprocessor.pkl")

# ─────────────────────────────────────────────
# Feature definitions
# ─────────────────────────────────────────────
CATEGORICAL_FEATURES = ["loan_type", "bank", "employment_type"]
NUMERICAL_FEATURES = [
    "credit_score", "annual_income_lakh", "loan_amount_lakh",
    "tenure_years", "ltv_ratio", "existing_obligations_pct",
]
TARGET = "fair_rate"

# ─────────────────────────────────────────────
# Load & prepare data
# ─────────────────────────────────────────────

def load_data() -> pd.DataFrame:
    if not os.path.exists(DATA_PATH):
        print(f"❌ Dataset not found at {DATA_PATH}")
        print("   Run: python data/generate_data.py  first.")
        sys.exit(1)
    df = pd.read_csv(DATA_PATH)
    print(f"✅ Loaded dataset: {df.shape[0]} rows, {df.shape[1]} columns")

    # Fill NaN ltv_ratio with 0 for non home/car loans
    df["ltv_ratio"] = df["ltv_ratio"].fillna(0.0)
    return df


def build_preprocessor() -> ColumnTransformer:
    """Build a column transformer: OHE for categoricals, StandardScaler for numerics."""
    categorical_transformer = Pipeline([
        ("ohe", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
    ])
    numerical_transformer = Pipeline([
        ("scaler", StandardScaler()),
    ])
    preprocessor = ColumnTransformer(transformers=[
        ("cat", categorical_transformer, CATEGORICAL_FEATURES),
        ("num", numerical_transformer, NUMERICAL_FEATURES),
    ])
    return preprocessor


def evaluate_model(name: str, model, X_test, y_test) -> dict:
    y_pred = model.predict(X_test)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    mae  = mean_absolute_error(y_test, y_pred)
    r2   = r2_score(y_test, y_pred)
    print(f"\n{'─'*40}")
    print(f"  {name}")
    print(f"{'─'*40}")
    print(f"  RMSE : {rmse:.4f}%")
    print(f"  MAE  : {mae:.4f}%")
    print(f"  R²   : {r2:.4f}")
    return {"name": name, "rmse": rmse, "mae": mae, "r2": r2, "model": model}


# ─────────────────────────────────────────────
# Main training
# ─────────────────────────────────────────────

def train():
    print("\n" + "="*50)
    print("  FAIRRATE — ML Training Pipeline")
    print("="*50)

    df = load_data()

    X = df[CATEGORICAL_FEATURES + NUMERICAL_FEATURES]
    y = df[TARGET]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42
    )
    print(f"\n  Train: {X_train.shape[0]} | Test: {X_test.shape[0]}")

    preprocessor = build_preprocessor()

    # ── Random Forest ──
    rf = Pipeline([
        ("preprocessor", preprocessor),
        ("regressor", RandomForestRegressor(
            n_estimators=200,
            max_depth=12,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42,
            n_jobs=-1,
        )),
    ])

    # ── Gradient Boosting ──
    gb = Pipeline([
        ("preprocessor", preprocessor),
        ("regressor", GradientBoostingRegressor(
            n_estimators=300,
            learning_rate=0.05,
            max_depth=5,
            subsample=0.8,
            random_state=42,
        )),
    ])

    print("\n🏋️  Training Random Forest Regressor...")
    rf.fit(X_train, y_train)

    print("🏋️  Training Gradient Boosting Regressor...")
    gb.fit(X_train, y_train)

    print("\n📊 Model Evaluation on Test Set")
    results = []
    results.append(evaluate_model("Random Forest Regressor", rf, X_test, y_test))
    results.append(evaluate_model("Gradient Boosting Regressor", gb, X_test, y_test))

    # ── Comparison table ──
    print("\n\n📋 Comparison Table")
    print(f"{'Model':<35} {'RMSE':>8} {'MAE':>8} {'R²':>8}")
    print("─" * 65)
    for r in results:
        print(f"{r['name']:<35} {r['rmse']:>8.4f} {r['mae']:>8.4f} {r['r2']:>8.4f}")

    # ── Pick best by RMSE ──
    best = min(results, key=lambda x: x["rmse"])
    print(f"\n🏆 Best Model: {best['name']} (RMSE={best['rmse']:.4f})")

    # ── Cross-validation on best ──
    print(f"\n🔁 5-Fold Cross-Validation on {best['name']}...")
    cv_scores = cross_val_score(
        best["model"], X, y, cv=5, scoring="neg_root_mean_squared_error", n_jobs=-1
    )
    cv_rmse = -cv_scores
    print(f"   CV RMSE: {cv_rmse.mean():.4f} ± {cv_rmse.std():.4f}")

    # ── Save best model and preprocessor separately ──
    # Extract the preprocessor after fitting (fitted inside the pipeline)
    fitted_preprocessor = best["model"].named_steps["preprocessor"]
    fitted_regressor    = best["model"].named_steps["regressor"]

    joblib.dump(best["model"], MODEL_PATH)
    joblib.dump(fitted_preprocessor, PREPROCESSOR_PATH)

    # Save metadata for backend use
    meta = {
        "best_model_name": best["name"],
        "rmse": round(best["rmse"], 4),
        "mae":  round(best["mae"], 4),
        "r2":   round(best["r2"], 4),
        "categorical_features": CATEGORICAL_FEATURES,
        "numerical_features": NUMERICAL_FEATURES,
        "feature_names_in": CATEGORICAL_FEATURES + NUMERICAL_FEATURES,
    }
    import json
    meta_path = os.path.join(MODELS_DIR, "model_meta.json")
    with open(meta_path, "w") as f:
        json.dump(meta, f, indent=2)

    print(f"\n✅ Model saved      → {MODEL_PATH}")
    print(f"✅ Preprocessor saved → {PREPROCESSOR_PATH}")
    print(f"✅ Metadata saved   → {meta_path}")
    print("\n" + "="*50)
    print("  Training Complete!")
    print("="*50 + "\n")


if __name__ == "__main__":
    train()
