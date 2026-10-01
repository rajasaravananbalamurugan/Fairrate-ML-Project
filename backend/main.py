"""
FAIRRATE — FastAPI Enterprise Backend Service
Serves ML model predictions with SHAP explanations, prediction intervals,
financial planning calculators, offer parsing, and fairness/drift auditing.

Run: python -m uvicorn backend.main:app --port 8000
"""

import os
import sys
import json
import logging
from typing import List, Optional, Dict, Any

import numpy as np
import pandas as pd
import joblib

from fastapi import FastAPI, HTTPException, UploadFile, File, Request, Query
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# Add project root to path for ml imports
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

from backend.schemas import (
    LoanRequest,
    PredictionResponse,
    PredictionV2Response,
    HealthResponse,
    BenchmarkRate,
    ReasonItem,
    ConfidenceInfo,
    WaterfallItem,
    BankCompareItem,
    PrepaymentPlanRequest,
    APRRequest,
    RepoScenarioRequest,
    BalanceTransferRequest,
    CreditImprovementRequest,
    NegotiationScriptRequest,
    ChatRequest,
)
from ml.explain import explain_prediction, get_shap_waterfall
from ml.load_real_data import get_data_sources_summary, load_rate_cards
from ml.fairness_audit import run_fairness_audit
from ml.drift_check import check_model_drift
from backend.financial_math import (
    calculate_reducing_emi,
    compute_prepayment_schedule,
    compute_effective_apr,
    compute_repo_scenarios,
    compute_balance_transfer,
)
from backend.tools_service import (
    parse_offer_letter,
    generate_negotiation_script,
    handle_chat_assistant,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("fairrate")

# ─────────────────────────────────────────────
# Configuration & Paths
# ─────────────────────────────────────────────
VERDICT_FAIR_THRESHOLD = 0.5
VERDICT_HIGH_THRESHOLD = 1.5

MODELS_DIR = os.path.join(BASE_DIR, "models")
MODEL_PATH = os.path.join(MODELS_DIR, "model.pkl")
META_PATH = os.path.join(MODELS_DIR, "model_meta.json")
QUANTILE_LOW_PATH = os.path.join(MODELS_DIR, "quantile_low.pkl")
QUANTILE_HIGH_PATH = os.path.join(MODELS_DIR, "quantile_high.pkl")
COMPARISON_PATH = os.path.join(MODELS_DIR, "comparison.json")
REGISTRY_PATH = os.path.join(MODELS_DIR, "registry.json")
CATALOG_PATH = os.path.join(BASE_DIR, "config", "catalog.json")

# Load catalog
CATALOG: Dict[str, Any] = {"banks": [], "loan_types": []}
if os.path.exists(CATALOG_PATH):
    try:
        with open(CATALOG_PATH, "r", encoding="utf-8") as f:
            CATALOG = json.load(f)
    except Exception as e:
        logger.warning(f"Failed to load catalog: {e}")

SUPPORTED_BANKS = [b["id"] for b in CATALOG.get("banks", [])] or ["SBI", "HDFC", "ICICI", "Axis", "Kotak"]
SUPPORTED_LOAN_TYPES = [lt["id"] for lt in CATALOG.get("loan_types", [])] or ["personal", "home", "car", "education", "gold", "business", "lap"]

# ─────────────────────────────────────────────
# Load models at startup
# ─────────────────────────────────────────────
model = None
model_q10 = None
model_q90 = None
model_name = "Unknown"
model_mae = 0.20
model_version = "2.0.0"


def load_all_models():
    global model, model_q10, model_q90, model_name, model_mae, model_version
    if not os.path.exists(MODEL_PATH):
        logger.warning(f"Primary model not found at {MODEL_PATH}. Run ml/train.py first.")
        return False
    try:
        model = joblib.load(MODEL_PATH)
        if os.path.exists(QUANTILE_LOW_PATH):
            model_q10 = joblib.load(QUANTILE_LOW_PATH)
        if os.path.exists(QUANTILE_HIGH_PATH):
            model_q90 = joblib.load(QUANTILE_HIGH_PATH)

        if os.path.exists(META_PATH):
            with open(META_PATH, "r", encoding="utf-8") as f:
                meta = json.load(f)
            model_name = meta.get("best_model_name", "Gradient Boosting Regressor")
            model_mae = float(meta.get("mae", 0.20))
            model_version = meta.get("version", "2.0.0")

        logger.info(f"✅ Models loaded: {model_name} (v{model_version}, MAE: {model_mae}%, Quantiles: {model_q10 is not None})")
        return True
    except Exception as e:
        logger.error(f"Failed to load models: {e}")
        return False


model_loaded = load_all_models()

# ─────────────────────────────────────────────
# FastAPI App & Security Middleware
# ─────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address, default_limits=["240/minute"])
app = FastAPI(
    title="FAIRRATE API",
    description="Enterprise ML-powered loan interest rate fairness checker and borrower financial planning suite.",
    version=model_version,
    docs_url="/docs",
    redoc_url="/redoc",
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS configuration (supports env var or permissive defaults for development)
allowed_origins_env = os.getenv("ALLOWED_ORIGINS")
allowed_origins = [orig.strip() for orig in allowed_origins_env.split(",")] if allowed_origins_env else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────
# Verdict & Data Prep Helpers
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
                f"within acceptable market bounds. You are getting a reasonable deal."
            ),
        )
    elif diff <= VERDICT_HIGH_THRESHOLD:
        return (
            "HIGH",
            "⚠️",
            f"Your offered rate is {diff:.2f}% above the fair rate of {fair_rate:.2f}%.",
            (
                f"Your bank is offering {offered_rate:.2f}%, but our ML model estimates a fair benchmark "
                f"of {fair_rate:.2f}%. The spread of +{diff:.2f}% warrants negotiation. Use our AI negotiation script "
                f"or explore alternative peer lenders."
            ),
        )
    else:
        return (
            "RED FLAG",
            "🚨",
            f"Your offered rate is {diff:.2f}% above fair — significantly overpriced!",
            (
                f"Serious pricing disparity detected. The bank is offering {offered_rate:.2f}%, "
                f"whereas a fair rate for this profile is around {fair_rate:.2f}% (gap: +{diff:.2f}%). "
                f"We strongly recommend seeking alternative sanction quotes before signing."
            ),
        )


CATEGORICAL_FEATURES = ["loan_type", "bank", "employment_type"]
NUMERICAL_FEATURES = [
    "credit_score", "annual_income_lakh", "loan_amount_lakh",
    "tenure_years", "ltv_ratio", "existing_obligations_pct",
]


def request_to_df(req: LoanRequest) -> pd.DataFrame:
    ltv = req.ltv_ratio if req.ltv_ratio is not None else 0.0
    data = {
        "loan_type": [req.loan_type],
        "bank": [req.bank],
        "credit_score": [float(req.credit_score)],
        "annual_income_lakh": [float(req.annual_income_lakh)],
        "employment_type": [req.employment_type],
        "loan_amount_lakh": [float(req.loan_amount_lakh)],
        "tenure_years": [float(req.tenure_years)],
        "ltv_ratio": [float(ltv)],
        "existing_obligations_pct": [float(req.existing_obligations_pct)],
    }
    col_order = CATEGORICAL_FEATURES + NUMERICAL_FEATURES
    return pd.DataFrame(data)[col_order]


def build_benchmark_table(loan_type: str) -> List[BenchmarkRate]:
    try:
        cards_df = load_rate_cards()
        filtered = cards_df[cards_df["loan_type"] == loan_type]
        result = []
        for b in SUPPORTED_BANKS:
            b_rows = filtered[filtered["bank"] == b]
            if not b_rows.empty:
                mn = float(b_rows["min_rate"].iloc[0])
                mx = float(b_rows["max_rate"].iloc[0])
            else:
                mn, mx = 9.0, 16.0
            typical = round((mn + mx) / 2.0, 2)
            result.append(BenchmarkRate(bank=b, min_rate=mn, max_rate=mx, typical_rate=typical))
        return result
    except Exception:
        return [BenchmarkRate(bank=b, min_rate=9.0, max_rate=15.0, typical_rate=12.0) for b in SUPPORTED_BANKS[:5]]


def run_bank_comparison(
    model,
    loan_type: str,
    credit_score: float,
    annual_income_lakh: float,
    employment_type: str,
    loan_amount_lakh: float,
    tenure_years: float,
    ltv_ratio: Optional[float] = None,
    existing_obligations_pct: float = 20.0,
    offered_rate: Optional[float] = None,
) -> List[BankCompareItem]:
    ltv = ltv_ratio if ltv_ratio is not None else 0.0
    bank_results = []
    for b in SUPPORTED_BANKS:
        row_data = {
            "loan_type": [loan_type],
            "bank": [b],
            "credit_score": [float(credit_score)],
            "annual_income_lakh": [float(annual_income_lakh)],
            "employment_type": [employment_type],
            "loan_amount_lakh": [float(loan_amount_lakh)],
            "tenure_years": [float(tenure_years)],
            "ltv_ratio": [float(ltv)],
            "existing_obligations_pct": [float(existing_obligations_pct)],
        }
        X_b = pd.DataFrame(row_data)[CATEGORICAL_FEATURES + NUMERICAL_FEATURES]
        pred_b = round(float(model.predict(X_b)[0]), 2)
        verdict_b = get_verdict(offered_rate, pred_b)[0] if offered_rate is not None else "FAIR"
        bank_results.append({
            "bank": b,
            "predicted_rate": pred_b,
            "verdict_if_offered_here": verdict_b,
        })

    worst_rate = max(item["predicted_rate"] for item in bank_results) if bank_results else 0.0
    final_list = []
    for item in bank_results:
        savings = round(worst_rate - item["predicted_rate"], 2)
        final_list.append(BankCompareItem(
            bank=item["bank"],
            predicted_rate=item["predicted_rate"],
            verdict_if_offered_here=item["verdict_if_offered_here"],
            savings_vs_worst=savings
        ))

    final_list.sort(key=lambda x: x.predicted_rate)
    return final_list


# ─────────────────────────────────────────────
# Core Prediction Endpoints (/predict & /predict-v2)
# ─────────────────────────────────────────────
@app.get("/health", response_model=HealthResponse, tags=["System"])
def health():
    """Health check endpoint exposing engine and quantiles availability."""
    return HealthResponse(
        status="ok",
        model_loaded=model is not None,
        version=model_version,
        quantiles_loaded=(model_q10 is not None and model_q90 is not None),
        supported_banks_count=len(SUPPORTED_BANKS),
        supported_loan_types_count=len(SUPPORTED_LOAN_TYPES),
    )


@app.get("/config/catalog", tags=["Reference"])
def get_catalog():
    """Returns the shared banks, loan types, and rate ranges catalog."""
    return CATALOG


@app.post("/predict", response_model=PredictionResponse, tags=["Prediction"])
def predict(req: LoanRequest):
    """
    Standard v1 prediction endpoint. Unchanged schema for backward compatibility.
    """
    if model is None:
        raise HTTPException(status_code=503, detail="ML model not loaded. Please run ml/train.py first.")

    try:
        X = request_to_df(req)
        fair_rate_pred = round(float(model.predict(X)[0]), 2)
        verdict, emoji, message, explainer = get_verdict(req.offered_rate, fair_rate_pred)
        diff = round(req.offered_rate - fair_rate_pred, 2)

        # SHAP explanations
        try:
            reasons_raw = explain_prediction(model, X, CATEGORICAL_FEATURES + NUMERICAL_FEATURES, top_n=3)
            reasons = [ReasonItem(**r) for r in reasons_raw]
        except Exception as e:
            logger.warning(f"SHAP explanation failed: {e}")
            reasons = []

        confidence = ConfidenceInfo(
            std=round(model_mae, 2),
            low=round(fair_rate_pred - model_mae, 2),
            high=round(fair_rate_pred + model_mae, 2),
        )

        waterfall = None
        base_value = None
        try:
            wf_data = get_shap_waterfall(model, X, CATEGORICAL_FEATURES + NUMERICAL_FEATURES)
            waterfall = [WaterfallItem(**item) for item in wf_data["waterfall"]]
            base_value = wf_data["base_value"]
        except Exception as e:
            logger.warning(f"Waterfall calculation failed: {e}")

        compare_list = None
        try:
            compare_list = run_bank_comparison(
                model=model,
                loan_type=req.loan_type,
                credit_score=req.credit_score,
                annual_income_lakh=req.annual_income_lakh,
                employment_type=req.employment_type,
                loan_amount_lakh=req.loan_amount_lakh,
                tenure_years=req.tenure_years,
                ltv_ratio=req.ltv_ratio,
                existing_obligations_pct=req.existing_obligations_pct,
                offered_rate=req.offered_rate,
            )
        except Exception as e:
            logger.warning(f"Bank comparison failed: {e}")

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
            confidence=confidence,
            waterfall=waterfall,
            base_value=base_value,
            compare=compare_list,
        )
    except Exception as e:
        logger.error(f"Prediction error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


@app.post("/predict-v2", response_model=PredictionV2Response, tags=["Prediction"])
def predict_v2(req: LoanRequest):
    """
    Phase 1, Item 2: Upgraded v2 prediction endpoint with Quantile Prediction Intervals
    (fair_rate_low and fair_rate_high representing likely 80% fair-rate range).
    """
    v1_res = predict(req)

    # Compute Quantile prediction intervals
    low_rate = v1_res.fair_rate - (model_mae * 1.5)
    high_rate = v1_res.fair_rate + (model_mae * 1.5)

    if model_q10 is not None and model_q90 is not None:
        try:
            X = request_to_df(req)
            preprocessor = model.named_steps["preprocessor"]
            X_proc = preprocessor.transform(X)
            low_rate = round(float(model_q10.predict(X_proc)[0]), 2)
            high_rate = round(float(model_q90.predict(X_proc)[0]), 2)
            # Ensure proper ordering
            if low_rate > high_rate:
                low_rate, high_rate = high_rate, low_rate
        except Exception as e:
            logger.warning(f"Quantile interval inference failed: {e}")

    return PredictionV2Response(
        **v1_res.dict(),
        fair_rate_low=low_rate,
        fair_rate_high=high_rate,
        likely_fair_range=[low_rate, high_rate],
        interval_method="Quantile Gradient Boosting (alpha=0.10, alpha=0.90)",
    )


@app.get("/compare", response_model=List[BankCompareItem], tags=["Comparison"])
def compare_banks(
    loan_type: str = "personal",
    credit_score: int = 720,
    annual_income_lakh: float = 12.0,
    employment_type: str = "salaried",
    loan_amount_lakh: float = 5.0,
    tenure_years: int = 3,
    offered_rate: Optional[float] = None,
    ltv_ratio: Optional[float] = None,
    existing_obligations_pct: float = 20.0,
):
    """Standalone counterfactual multi-bank comparison across all 11 lenders."""
    if model is None:
        raise HTTPException(status_code=503, detail="ML model not loaded.")
    return run_bank_comparison(
        model=model,
        loan_type=loan_type,
        credit_score=credit_score,
        annual_income_lakh=annual_income_lakh,
        employment_type=employment_type,
        loan_amount_lakh=loan_amount_lakh,
        tenure_years=tenure_years,
        ltv_ratio=ltv_ratio,
        existing_obligations_pct=existing_obligations_pct,
        offered_rate=offered_rate,
    )


# ─────────────────────────────────────────────
# Model Lab & Data Governance Endpoints
# ─────────────────────────────────────────────
@app.get("/data/sources", tags=["Model Lab"])
def get_data_sources():
    """Phase 1, Item 1: Returns verified vs placeholder real rate card data sources."""
    try:
        return {"sources": get_data_sources_summary()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/model/comparison", tags=["Model Lab"])
def get_model_comparison():
    """Phase 1, Item 3: Returns 5-fold CV model comparison metrics and feature importances."""
    if not os.path.exists(COMPARISON_PATH):
        raise HTTPException(status_code=404, detail="Comparison metrics not found. Run ml/train.py first.")
    with open(COMPARISON_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


@app.get("/audit/fairness", tags=["Model Lab"])
def get_fairness_audit(threshold: float = Query(1.0, ge=0.1, le=5.0)):
    """Phase 1, Item 4: Returns demographic fairness audit across employment, bank, loan type, and income."""
    try:
        return run_fairness_audit(disparity_threshold_pct=threshold)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/monitor/drift", tags=["Model Lab"])
def get_drift_monitor():
    """Phase 1, Item 5: Returns macroeconomic repo rate delta and PSI/KS input feature drift."""
    try:
        return check_model_drift()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/model/version", tags=["Model Lab"])
def get_model_registry():
    """Phase 1, Item 6: Returns model version registry and training history."""
    if not os.path.exists(REGISTRY_PATH):
        return {"current_version": model_version, "registry": []}
    with open(REGISTRY_PATH, "r", encoding="utf-8") as f:
        history = json.load(f)
    return {"current_version": model_version, "registry": history}


# ─────────────────────────────────────────────
# Borrower Planning Endpoints (Phase 3)
# ─────────────────────────────────────────────
@app.post("/plan/prepayment", tags=["Borrower Planning"])
def plan_prepayment(req: PrepaymentPlanRequest):
    """Phase 3, Item 10: Calculates accelerated prepayment trajectory, interest saved, and amortization."""
    try:
        lumps = [l.dict() for l in req.lump_sums]
        return compute_prepayment_schedule(
            principal_lakh=req.principal_lakh,
            annual_rate_pct=req.annual_rate_pct,
            tenure_years=req.tenure_years,
            extra_monthly_emi=req.extra_monthly_emi,
            lump_sums=lumps,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/plan/apr", tags=["Borrower Planning"])
def plan_apr(req: APRRequest):
    """Phase 3, Item 11: Computes true effective APR using internal rate of return (IRR)."""
    try:
        return compute_effective_apr(
            loan_amount_lakh=req.loan_amount_lakh,
            quoted_rate_pct=req.quoted_rate_pct,
            tenure_years=req.tenure_years,
            processing_fee_pct=req.processing_fee_pct,
            processing_fee_flat=req.processing_fee_flat,
            gst_pct=req.gst_pct,
            insurance_amount=req.insurance_amount,
            other_charges=req.other_charges,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/plan/repo-scenario", tags=["Borrower Planning"])
def plan_repo_scenario(req: RepoScenarioRequest):
    """Phase 3, Item 12: Simulates floating rate sensitivity to RBI repo rate changes (-50 to +50 bps)."""
    try:
        return compute_repo_scenarios(
            principal_lakh=req.principal_lakh,
            current_rate_pct=req.current_rate_pct,
            tenure_years=req.tenure_years,
            current_repo_rate_pct=req.current_repo_rate_pct,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/plan/balance-transfer", tags=["Borrower Planning"])
def plan_balance_transfer(req: BalanceTransferRequest):
    """Phase 3, Item 13: Computes refinancing break-even month, switching costs, and net savings."""
    try:
        return compute_balance_transfer(
            outstanding_principal_lakh=req.outstanding_principal_lakh,
            remaining_tenure_years=req.remaining_tenure_years,
            current_rate_pct=req.current_rate_pct,
            new_rate_pct=req.new_rate_pct,
            processing_fee_pct=req.processing_fee_pct,
            foreclosure_charges_pct=req.foreclosure_charges_pct,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/plan/credit-improvement", tags=["Borrower Planning"])
def plan_credit_improvement(req: CreditImprovementRequest):
    """Phase 3, Item 14: Predicts fair rate drops and interest savings at higher credit score tiers."""
    if model is None:
        raise HTTPException(status_code=503, detail="ML model not loaded.")
    try:
        current_score = req.credit_score
        tiers = [700, 750, 800, 850]
        next_tier = next((t for t in tiers if t > current_score), 850)
        points_needed = max(0, next_tier - current_score)

        def predict_at_score(s):
            row_data = {
                "loan_type": [req.loan_type],
                "bank": [req.bank],
                "credit_score": [float(s)],
                "annual_income_lakh": [float(req.annual_income_lakh)],
                "employment_type": ["salaried"],
                "loan_amount_lakh": [float(req.loan_amount_lakh)],
                "tenure_years": [float(req.tenure_years)],
                "ltv_ratio": [float(req.ltv_ratio or 0.0)],
                "existing_obligations_pct": [float(req.existing_obligations_pct)],
            }
            X_s = pd.DataFrame(row_data)[CATEGORICAL_FEATURES + NUMERICAL_FEATURES]
            return round(float(model.predict(X_s)[0]), 2)

        cur_fair = predict_at_score(current_score)
        proj_fair = predict_at_score(next_tier)
        rate_drop = max(0.0, round(cur_fair - proj_fair, 2))

        principal = req.loan_amount_lakh * 100000.0
        cur_emi = calculate_reducing_emi(principal, cur_fair, req.tenure_years)
        proj_emi = calculate_reducing_emi(principal, proj_fair, req.tenure_years)
        months = req.tenure_years * 12
        lifetime_saved = max(0.0, round((cur_emi - proj_emi) * months, 2))

        checklist = [
            "Maintain credit card utilization ratio strictly below 30%",
            "Ensure zero 30+ DPD (days past due) over the next 6-12 billing cycles",
            "Avoid making multiple hard loan inquiries in rapid succession",
            "Maintain a healthy seasoning mix of secured (home/auto) and unsecured lines",
            "Dispute any erroneous reporting with CIBIL / Experian promptly"
        ]

        return {
            "current_credit_score": current_score,
            "current_fair_rate": cur_fair,
            "next_target_tier": next_tier,
            "points_needed": points_needed,
            "projected_fair_rate": proj_fair,
            "estimated_rate_drop_pct": rate_drop,
            "monthly_emi_reduction": round(cur_emi - proj_emi, 2),
            "lifetime_interest_saved": lifetime_saved,
            "actionable_checklist": checklist,
            "note": "Estimates based on machine learning risk curves. Individual bureau score movements depend on overall credit mix."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────
# Tools Endpoints (Phase 4)
# ─────────────────────────────────────────────
@app.post("/tools/parse-offer", tags=["Tools"])
async def upload_parse_offer(file: UploadFile = File(...)):
    """Phase 4, Item 15: Uploads sanction letter (PDF/image) and extracts key terms. Files are never stored."""
    if not file:
        raise HTTPException(status_code=400, detail="No file uploaded.")
    # Max file size limit: 10 MB
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large (Max 10 MB).")

    try:
        parsed = parse_offer_letter(content, file.filename)
        return parsed
    except Exception as e:
        logger.error(f"Offer parsing error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Offer parsing failed: {str(e)}")


@app.post("/tools/negotiation-script", tags=["Tools"])
def post_negotiation_script(req: NegotiationScriptRequest):
    """Phase 4, Item 16: Generates personalized negotiation script (polite, firm, formal)."""
    try:
        return generate_negotiation_script(req.dict())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/tools/chat", tags=["Tools"])
def post_chat_assistant(req: ChatRequest):
    """Phase 4, Item 17: Contextual Q&A assistant for borrower rate inquiries."""
    try:
        return handle_chat_assistant(req.message, req.context)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/", tags=["System"])
def root():
    return {
        "app": "FAIRRATE",
        "description": "Enterprise ML-Powered Loan Interest Rate Fairness Checker & Planning Suite",
        "docs": "/docs",
        "version": model_version,
    }
