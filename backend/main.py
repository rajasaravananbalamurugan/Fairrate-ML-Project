"""
FAIRRATE — FastAPI Backend
Serves ML model predictions with SHAP explanations.

Run: uvicorn backend.main:app --reload --port 8000
 or: python -m uvicorn backend.main:app --reload --port 8000
"""

import os
import sys
import json
import logging
from typing import List

import numpy as np
import pandas as pd
import joblib

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# Add project root to path for ml imports
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

from backend.schemas import LoanRequest, PredictionResponse, HealthResponse, BenchmarkRate, ReasonItem
from ml.explain import explain_prediction

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("fairrate")

# ─────────────────────────────────────────────
# Configuration / Constants
# ─────────────────────────────────────────────
VERDICT_FAIR_THRESHOLD = 0.5    # configurable
VERDICT_HIGH_THRESHOLD = 1.5    # configurable

MODELS_DIR = os.path.join(BASE_DIR, "models")
MODEL_PATH = os.path.join(MODELS_DIR, "model.pkl")
META_PATH  = os.path.join(MODELS_DIR, "model_meta.json")

SUPPORTED_BANKS = ["SBI", "HDFC", "ICICI", "Axis", "Kotak"]
SUPPORTED_LOAN_TYPES = ["personal", "home", "car", "education"]

# Benchmark rate cards (min, max) — approximate published rates for rate table display
BENCHMARK_RATES = {
    "personal": {
        "SBI":   (10.65, 15.75), "HDFC": (10.85, 24.0),
        "ICICI": (10.85, 19.0),  "Axis": (10.49, 22.0),
        "Kotak": (10.99, 24.0),
    },
    "home": {
        "SBI":   (8.50, 9.65),  "HDFC": (8.70, 9.95),
        "ICICI": (8.75, 9.90),  "Axis": (8.75, 9.90),
        "Kotak": (8.75, 9.65),
    },
    "car": {
        "SBI":   (8.85, 12.85), "HDFC": (8.75, 11.50),
        "ICICI": (8.80, 12.50), "Axis": (9.25, 13.50),
        "Kotak": (8.75, 13.00),
    },
    "education": {
        "SBI":   (8.15, 10.90), "HDFC": (9.55, 13.25),
        "ICICI": (10.25, 12.75), "Axis": (13.70, 15.20),
        "Kotak": (10.99, 13.50),
    },
}

# ─────────────────────────────────────────────
# Load model at startup
# ─────────────────────────────────────────────
model = None
model_name = "Unknown"

def load_model():
    global model, model_name
    if not os.path.exists(MODEL_PATH):
        logger.warning(f"Model not found at {MODEL_PATH}. Run ml/train.py first.")
        return False
    try:
        model = joblib.load(MODEL_PATH)
        if os.path.exists(META_PATH):
            with open(META_PATH) as f:
                meta = json.load(f)
            model_name = meta.get("best_model_name", "ML Model")
        logger.info(f"✅ Model loaded: {model_name}")
        return True
    except Exception as e:
        logger.error(f"Failed to load model: {e}")
        return False

model_loaded = load_model()

# ─────────────────────────────────────────────
# FastAPI App
# ─────────────────────────────────────────────
app = FastAPI(
    title="FAIRRATE API",
    description="ML-powered loan interest rate fairness checker for Indian borrowers.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────
# Verdict logic
# ─────────────────────────────────────────────

def get_verdict(offered_rate: float, fair_rate: float):
    diff = offered_rate - fair_rate
    if diff <= VERDICT_FAIR_THRESHOLD:
        return (
            "FAIR",
            "✅",
            f"Your offered rate ({offered_rate:.2f}%) is within the expected fair range.",
            (
                f"Based on your financial profile, a fair interest rate for this loan is around "
                f"{fair_rate:.2f}% per annum. Your bank's offer of {offered_rate:.2f}% is "
                f"within acceptable bounds (within {VERDICT_FAIR_THRESHOLD}% of fair rate). "
                f"You're getting a reasonable deal — proceed with confidence."
            ),
        )
    elif diff <= VERDICT_HIGH_THRESHOLD:
        return (
            "HIGH",
            "⚠️",
            f"Your offered rate is {diff:.2f}% above the fair rate of {fair_rate:.2f}%.",
            (
                f"Your bank is offering {offered_rate:.2f}%, but our model estimates the fair rate "
                f"for your profile at {fair_rate:.2f}%. The difference of {diff:.2f}% is above "
                f"normal. Consider negotiating with your bank or comparing offers from other lenders "
                f"before signing. Even a 0.5% reduction can save significant money over a long tenure."
            ),
        )
    else:
        return (
            "RED FLAG",
            "🚨",
            f"Your offered rate is {diff:.2f}% above fair — significantly overpriced!",
            (
                f"This is a serious concern. Your bank is offering {offered_rate:.2f}%, but the "
                f"fair rate for your profile is approximately {fair_rate:.2f}%. The gap of {diff:.2f}% "
                f"suggests you may be being charged well above market rates. We strongly recommend "
                f"getting quotes from multiple banks, checking RBI's MCLR base rates, and consulting "
                f"a financial advisor before proceeding."
            ),
        )


# ─────────────────────────────────────────────
# Helper: prepare input DataFrame
# ─────────────────────────────────────────────

CATEGORICAL_FEATURES = ["loan_type", "bank", "employment_type"]
NUMERICAL_FEATURES = [
    "credit_score", "annual_income_lakh", "loan_amount_lakh",
    "tenure_years", "ltv_ratio", "existing_obligations_pct",
]

def request_to_df(req: LoanRequest) -> pd.DataFrame:
    ltv = req.ltv_ratio if req.ltv_ratio is not None else 0.0
    data = {
        "loan_type":                [req.loan_type],
        "bank":                     [req.bank],
        "credit_score":             [float(req.credit_score)],
        "annual_income_lakh":       [req.annual_income_lakh],
        "employment_type":          [req.employment_type],
        "loan_amount_lakh":         [req.loan_amount_lakh],
        "tenure_years":             [float(req.tenure_years)],
        "ltv_ratio":                [ltv],
        "existing_obligations_pct": [req.existing_obligations_pct],
    }
    col_order = CATEGORICAL_FEATURES + NUMERICAL_FEATURES
    return pd.DataFrame(data)[col_order]


def build_benchmark_table(loan_type: str) -> List[BenchmarkRate]:
    rates = BENCHMARK_RATES.get(loan_type, {})
    result = []
    for bank in SUPPORTED_BANKS:
        mn, mx = rates.get(bank, (8.0, 15.0))
        typical = round((mn + mx) / 2, 2)
        result.append(BenchmarkRate(bank=bank, min_rate=mn, max_rate=mx, typical_rate=typical))
    return result


# ─────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────

@app.get("/health", response_model=HealthResponse, tags=["System"])
def health():
    """Health check endpoint."""
    return HealthResponse(status="ok", model_loaded=model_loaded, version="1.0.0")


@app.get("/banks", tags=["Reference"])
def get_banks():
    """Returns list of supported banks."""
    return {"banks": SUPPORTED_BANKS}


@app.get("/loan-types", tags=["Reference"])
def get_loan_types():
    """Returns list of supported loan types."""
    return {"loan_types": SUPPORTED_LOAN_TYPES}


@app.post("/predict", response_model=PredictionResponse, tags=["Prediction"])
def predict(req: LoanRequest):
    """
    Predict fair interest rate and return verdict + SHAP explanations.
    """
    if not model_loaded or model is None:
        raise HTTPException(
            status_code=503,
            detail="ML model not loaded. Please run ml/train.py first."
        )

    try:
        X = request_to_df(req)
        fair_rate_pred = float(model.predict(X)[0])
        fair_rate_pred = round(fair_rate_pred, 2)

        verdict, emoji, message, explainer = get_verdict(req.offered_rate, fair_rate_pred)
        diff = round(req.offered_rate - fair_rate_pred, 2)

        # SHAP explanations
        try:
            reasons_raw = explain_prediction(model, X, CATEGORICAL_FEATURES + NUMERICAL_FEATURES, top_n=3)
            reasons = [ReasonItem(**r) for r in reasons_raw]
        except Exception as e:
            logger.warning(f"SHAP explanation failed: {e}")
            reasons = []

        benchmark = build_benchmark_table(req.loan_type)

        return PredictionResponse(
            fair_rate=fair_rate_pred,
            offered_rate=round(req.offered_rate, 2),
            difference=diff,
            verdict=verdict,
            verdict_emoji=emoji,
            message=message,
            explainer=explainer,
            top_reasons=reasons,
            benchmark_rates=benchmark,
            model_name=model_name,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Prediction error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


@app.get("/", tags=["System"])
def root():
    return {
        "app": "FAIRRATE",
        "description": "ML-powered loan interest rate fairness checker for Indian borrowers",
        "docs": "/docs",
        "version": "1.0.0",
    }
