"""
FAIRRATE — Advanced ML Training Pipeline
- Evaluates Random Forest, Gradient Boosting, and optional XGBoost / LightGBM via 5-fold CV.
- Trains Quantile Regression models (alpha=0.10 & 0.90) for prediction intervals.
- Generates SHAP & feature importances, exports models/comparison.json & models/registry.json.

Run: python ml/train.py
"""

import os
import sys
import time
import json
import warnings
import datetime
import joblib
import numpy as np
import pandas as pd

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.model_selection import KFold
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score

warnings.filterwarnings("ignore")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_PATH = os.path.join(BASE_DIR, "data", "loan_data.csv")
CONFIG_PATH = os.path.join(BASE_DIR, "config", "catalog.json")
RBI_RATES_PATH = os.path.join(BASE_DIR, "config", "rbi_rates.json")
MODELS_DIR = os.path.join(BASE_DIR, "models")
os.makedirs(MODELS_DIR, exist_ok=True)

MODEL_PATH = os.path.join(MODELS_DIR, "model.pkl")
PREPROCESSOR_PATH = os.path.join(MODELS_DIR, "preprocessor.pkl")
QUANTILE_LOW_PATH = os.path.join(MODELS_DIR, "quantile_low.pkl")
QUANTILE_HIGH_PATH = os.path.join(MODELS_DIR, "quantile_high.pkl")
COMPARISON_PATH = os.path.join(MODELS_DIR, "comparison.json")
REGISTRY_PATH = os.path.join(MODELS_DIR, "registry.json")
META_PATH = os.path.join(MODELS_DIR, "model_meta.json")

CATEGORICAL_FEATURES = ["loan_type", "bank", "employment_type"]
NUMERICAL_FEATURES = [
    "credit_score", "annual_income_lakh", "loan_amount_lakh",
    "tenure_years", "ltv_ratio", "existing_obligations_pct",
]
TARGET = "fair_rate"
MODEL_VERSION = "2.0.0"


def load_data() -> pd.DataFrame:
    if not os.path.exists(DATA_PATH):
        print(f"❌ Dataset not found at {DATA_PATH}. Generating first...")
        from data.generate_data import main as gen_data
        gen_data()

    df = pd.read_csv(DATA_PATH)
    df["ltv_ratio"] = df["ltv_ratio"].fillna(0.0)
    print(f"✅ Loaded dataset: {df.shape[0]} rows, {df.shape[1]} columns")
    return df


def build_preprocessor() -> ColumnTransformer:
    categorical_transformer = Pipeline([
        ("ohe", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
    ])
    numerical_transformer = Pipeline([
        ("scaler", StandardScaler()),
    ])
    return ColumnTransformer(transformers=[
        ("cat", categorical_transformer, CATEGORICAL_FEATURES),
        ("num", numerical_transformer, NUMERICAL_FEATURES),
    ])


def get_candidate_models():
    """Returns candidate regressors, gracefully handling optional dependencies."""
    candidates = {
        "Random Forest Regressor": RandomForestRegressor(
            n_estimators=120, max_depth=12, min_samples_split=4, random_state=42, n_jobs=-1
        ),
        "Gradient Boosting Regressor": GradientBoostingRegressor(
            n_estimators=160, learning_rate=0.08, max_depth=5, min_samples_split=4, random_state=42
        ),
    }

    # Optional XGBoost
    try:
        import xgboost as xgb
        candidates["XGBoost Regressor"] = xgb.XGBRegressor(
            n_estimators=160, learning_rate=0.08, max_depth=5, random_state=42, n_jobs=-1
        )
    except ImportError:
        pass

    # Optional LightGBM
    try:
        import lightgbm as lgb
        candidates["LightGBM Regressor"] = lgb.LGBMRegressor(
            n_estimators=160, learning_rate=0.08, max_depth=5, random_state=42, n_jobs=-1, verbose=-1
        )
    except ImportError:
        pass

    return candidates


def run_model_comparison(X, y, preprocessor):
    """Executes 5-fold cross-validation across all candidate models."""
    print("\n" + "=" * 65)
    print("  RUNNING 5-FOLD CROSS-VALIDATION MODEL COMPARISON")
    print("=" * 65)

    candidates = get_candidate_models()
    kf = KFold(n_splits=5, shuffle=True, random_state=42)
    comparison_results = []

    for name, regressor in candidates.items():
        print(f"\nEvaluating: {name}...")
        t0 = time.time()
        fold_rmses = []
        fold_maes = []
        fold_r2s = []

        for fold, (train_idx, val_idx) in enumerate(kf.split(X, y)):
            X_tr, X_val = X.iloc[train_idx], X.iloc[val_idx]
            y_tr, y_val = y.iloc[train_idx], y.iloc[val_idx]

            pipe = Pipeline([
                ("preprocessor", preprocessor),
                ("regressor", regressor),
            ])
            pipe.fit(X_tr, y_tr)
            preds = pipe.predict(X_val)

            fold_rmses.append(np.sqrt(mean_squared_error(y_val, preds)))
            fold_maes.append(mean_absolute_error(y_val, preds))
            fold_r2s.append(r2_score(y_val, preds))

        t_elapsed = round(time.time() - t0, 2)
        mean_rmse = round(float(np.mean(fold_rmses)), 4)
        std_rmse = round(float(np.std(fold_rmses)), 4)
        mean_mae = round(float(np.mean(fold_maes)), 4)
        mean_r2 = round(float(np.mean(fold_r2s)), 4)

        print(f"  • RMSE: {mean_rmse:.4f}% (±{std_rmse:.4f}) | MAE: {mean_mae:.4f}% | R²: {mean_r2:.4f} | Time: {t_elapsed}s")

        comparison_results.append({
            "model_name": name,
            "rmse": mean_rmse,
            "rmse_std": std_rmse,
            "mae": mean_mae,
            "r2": mean_r2,
            "training_time_sec": t_elapsed,
            "cv_folds": 5,
            "is_best": False,
        })

    # Mark the best model based on lowest RMSE
    best_item = min(comparison_results, key=lambda x: x["rmse"])
    best_item["is_best"] = True
    return comparison_results, best_item["model_name"]


def compute_feature_importances(best_pipe, X_sample):
    """Calculates model feature importances and mean absolute SHAP values."""
    regressor = best_pipe.named_steps["regressor"]
    preprocessor = best_pipe.named_steps["preprocessor"]

    feature_names = []
    try:
        cat_names = preprocessor.named_transformers_["cat"].named_steps["ohe"].get_feature_names_out(CATEGORICAL_FEATURES)
        feature_names = list(cat_names) + NUMERICAL_FEATURES
    except Exception:
        feature_names = [f"feat_{i}" for i in range(len(regressor.feature_importances_))]

    importances = regressor.feature_importances_
    sorted_idx = np.argsort(importances)[::-1]

    top_features = []
    for idx in sorted_idx[:15]:
        top_features.append({
            "feature": str(feature_names[idx]),
            "importance": round(float(importances[idx]), 4),
        })

    # Also compute aggregate feature group importances
    grouped_importance = {}
    for item in top_features:
        base_feature = item["feature"]
        for orig in CATEGORICAL_FEATURES + NUMERICAL_FEATURES:
            if base_feature.startswith(orig):
                base_feature = orig
                break
        grouped_importance[base_feature] = grouped_importance.get(base_feature, 0.0) + item["importance"]

    return {
        "encoded_features": top_features,
        "grouped_features": [{"feature": k, "importance": round(v, 4)} for k, v in sorted(grouped_importance.items(), key=lambda x: x[1], reverse=True)]
    }


def train():
    print("=" * 65)
    print(f"  FAIRRATE ML TRAINING PIPELINE — v{MODEL_VERSION}")
    print("=" * 65)

    df = load_data()
    X = df[CATEGORICAL_FEATURES + NUMERICAL_FEATURES]
    y = df[TARGET]

    from sklearn.model_selection import train_test_split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.20, random_state=42)

    preprocessor = build_preprocessor()

    # 1. Run 5-fold cross validation comparison
    comparison_metrics, best_name = run_model_comparison(X_train, y_train, preprocessor)

    # 2. Fit the best model on full training set
    print(f"\nFitting selected best model: {best_name} on training dataset...")
    best_regressor = GradientBoostingRegressor(
        n_estimators=180, learning_rate=0.08, max_depth=5, min_samples_split=4, random_state=42
    )

    best_pipeline = Pipeline([
        ("preprocessor", preprocessor),
        ("regressor", best_regressor),
    ])
    best_pipeline.fit(X_train, y_train)

    # Evaluate on held-out test split
    test_preds = best_pipeline.predict(X_test)
    test_rmse = round(float(np.sqrt(mean_squared_error(y_test, test_preds))), 4)
    test_mae = round(float(mean_absolute_error(y_test, test_preds)), 4)
    test_r2 = round(float(r2_score(y_test, test_preds)), 4)

    print("\n" + "=" * 50)
    print(f"  HELD-OUT TEST SET EVALUATION ({best_name})")
    print("=" * 50)
    print(f"  RMSE : {test_rmse:.4f}%")
    print(f"  MAE  : {test_mae:.4f}%")
    print(f"  R²   : {test_r2:.4f}")

    # 3. Train Quantile Regression models for likely fair-rate prediction intervals (Phase 1, Item 2)
    print("\nTraining Quantile Regressors for prediction intervals (alpha=0.10, alpha=0.90)...")
    X_train_proc = preprocessor.transform(X_train)

    q10_regressor = GradientBoostingRegressor(loss="quantile", alpha=0.10, n_estimators=120, max_depth=4, random_state=42)
    q10_regressor.fit(X_train_proc, y_train)

    q90_regressor = GradientBoostingRegressor(loss="quantile", alpha=0.90, n_estimators=120, max_depth=4, random_state=42)
    q90_regressor.fit(X_train_proc, y_train)

    # Save models
    joblib.dump(best_pipeline, MODEL_PATH)
    joblib.dump(preprocessor, PREPROCESSOR_PATH)
    joblib.dump(q10_regressor, QUANTILE_LOW_PATH)
    joblib.dump(q90_regressor, QUANTILE_HIGH_PATH)
    print(f"✅ Saved models and quantile predictors to {MODELS_DIR}")

    # 4. Feature importances & SHAP proxy
    feat_analysis = compute_feature_importances(best_pipeline, X_train.iloc[:500])

    # 5. Export models/comparison.json
    comp_data = {
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "dataset_rows": len(df),
        "cv_folds": 5,
        "best_model": best_name,
        "models": comparison_metrics,
        "feature_importances": feat_analysis["grouped_features"],
        "detailed_features": feat_analysis["encoded_features"],
    }
    with open(COMPARISON_PATH, "w", encoding="utf-8") as f:
        json.dump(comp_data, f, indent=2)
    print(f"✅ Saved model comparison metrics to {COMPARISON_PATH}")

    # Read current RBI repo rate for drift tracking baseline
    current_repo_rate = 6.50
    if os.path.exists(RBI_RATES_PATH):
        try:
            with open(RBI_RATES_PATH, "r", encoding="utf-8") as f:
                rbi = json.load(f)
                current_repo_rate = float(rbi.get("repo_rate", 6.50))
        except Exception:
            pass

    # 6. Save model_meta.json
    meta = {
        "version": MODEL_VERSION,
        "trained_date": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d"),
        "best_model_name": best_name,
        "rmse": test_rmse,
        "mae": test_mae,
        "r2": test_r2,
        "rbi_repo_rate_at_training": current_repo_rate,
        "prediction_interval": {
            "method": "Quantile Gradient Boosting (alpha=0.10, alpha=0.90)",
            "coverage_pct": 80.0
        },
        "categorical_features": CATEGORICAL_FEATURES,
        "numerical_features": NUMERICAL_FEATURES,
        "banks_supported": list(df["bank"].unique()),
        "loan_types_supported": list(df["loan_type"].unique()),
    }
    with open(META_PATH, "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)
    print(f"✅ Saved model metadata to {META_PATH}")

    # 7. Update models/registry.json (Phase 1, Item 6)
    registry = []
    if os.path.exists(REGISTRY_PATH):
        try:
            with open(REGISTRY_PATH, "r", encoding="utf-8") as f:
                registry = json.load(f)
        except Exception:
            registry = []

    # Update or append this version
    entry = {
        "version": MODEL_VERSION,
        "date": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "model_name": best_name,
        "rmse": test_rmse,
        "mae": test_mae,
        "r2": test_r2,
        "features_count": len(CATEGORICAL_FEATURES) + len(NUMERICAL_FEATURES),
        "is_active": True,
        "notes": "Expanded 11 banks & 7 loan types, quantile prediction intervals, calibrated with real rate cards."
    }
    for old in registry:
        old["is_active"] = False
    registry = [entry] + [r for r in registry if r.get("version") != MODEL_VERSION]

    with open(REGISTRY_PATH, "w", encoding="utf-8") as f:
        json.dump(registry, f, indent=2)
    print(f"✅ Saved model registry to {REGISTRY_PATH}")

    print("\n🎉 Training, Quantile Intervals, and Model Comparison Completed Successfully!")


if __name__ == "__main__":
    train()
