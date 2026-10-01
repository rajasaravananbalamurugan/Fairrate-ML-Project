"""
FAIRRATE — Pydantic Schemas for FastAPI
Supports v1 and v2 predictions, planning endpoints, tools, and audits.
"""

import os
import json
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, validator

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CATALOG_PATH = os.path.join(BASE_DIR, "config", "catalog.json")

# Load supported banks and loan types from shared config
if os.path.exists(CATALOG_PATH):
    try:
        with open(CATALOG_PATH, "r", encoding="utf-8") as f:
            _catalog = json.load(f)
            ALLOWED_BANKS = {b["id"] for b in _catalog["banks"]}
            ALLOWED_LOAN_TYPES = {lt["id"] for lt in _catalog["loan_types"]}
    except Exception:
        ALLOWED_BANKS = {"SBI", "HDFC", "ICICI", "Axis", "Kotak", "PNB", "BOB", "Canara", "Union", "Bajaj", "Tata"}
        ALLOWED_LOAN_TYPES = {"personal", "home", "car", "education", "gold", "business", "lap"}
else:
    ALLOWED_BANKS = {"SBI", "HDFC", "ICICI", "Axis", "Kotak", "PNB", "BOB", "Canara", "Union", "Bajaj", "Tata"}
    ALLOWED_LOAN_TYPES = {"personal", "home", "car", "education", "gold", "business", "lap"}


class LoanRequest(BaseModel):
    loan_type: str = Field(..., description="personal | home | car | education | gold | business | lap")
    bank: str = Field(..., description="Lending institution identifier (e.g. SBI, HDFC, ICICI, PNB, BOB, Bajaj, Tata)")
    credit_score: int = Field(..., ge=300, le=900)
    annual_income_lakh: float = Field(..., gt=0, description="Annual income in ₹ lakhs")
    employment_type: str = Field(..., description="salaried | self_employed | business")
    loan_amount_lakh: float = Field(..., gt=0, description="Loan amount in ₹ lakhs")
    tenure_years: int = Field(..., ge=1, le=30)
    ltv_ratio: Optional[float] = Field(None, ge=0.0, le=1.0, description="Loan-to-Value ratio as decimal 0.0-1.0 (e.g. 0.75 for 75%)")
    existing_obligations_pct: float = Field(..., ge=0.0, le=100.0, description="% of income as existing EMI")
    offered_rate: float = Field(..., gt=0, description="Interest rate offered by bank (%)")

    @validator("loan_type")
    def validate_loan_type(cls, v):
        clean = v.strip().lower()
        if clean not in ALLOWED_LOAN_TYPES:
            raise ValueError(f"loan_type must be one of {sorted(ALLOWED_LOAN_TYPES)}")
        return clean

    @validator("bank")
    def validate_bank(cls, v):
        clean = v.strip()
        # Case-insensitive match against allowed
        matched = next((b for b in ALLOWED_BANKS if b.lower() == clean.lower()), None)
        if not matched:
            raise ValueError(f"bank must be one of {sorted(ALLOWED_BANKS)}")
        return matched

    @validator("employment_type")
    def validate_employment_type(cls, v):
        allowed = {"salaried", "self_employed", "business"}
        clean = v.strip().lower()
        if clean not in allowed:
            raise ValueError(f"employment_type must be one of {allowed}")
        return clean


class ReasonItem(BaseModel):
    feature: str
    label: str
    shap_value: float
    direction: str
    reason: str


class BenchmarkRate(BaseModel):
    bank: str
    min_rate: float
    max_rate: float
    typical_rate: float


class ConfidenceInfo(BaseModel):
    std: float = Field(..., description="Typical model error (validation MAE)")
    low: float = Field(..., description="fair_rate - typical error")
    high: float = Field(..., description="fair_rate + typical error")


class WaterfallItem(BaseModel):
    feature: str
    display_label: str
    shap_value: float
    raw_value: str
    direction: str


class BankCompareItem(BaseModel):
    bank: str
    predicted_rate: float
    verdict_if_offered_here: str
    savings_vs_worst: float


class PredictionResponse(BaseModel):
    fair_rate: float
    offered_rate: float
    difference: float
    verdict: str
    verdict_emoji: str
    message: str
    explainer: str
    top_reasons: List[ReasonItem]
    benchmark_rates: List[BenchmarkRate]
    model_name: str
    confidence: Optional[ConfidenceInfo] = None
    waterfall: Optional[List[WaterfallItem]] = None
    base_value: Optional[float] = None
    compare: Optional[List[BankCompareItem]] = None


# Phase 1, Item 2: Prediction Intervals Endpoint /predict-v2
class PredictionV2Response(PredictionResponse):
    fair_rate_low: float = Field(..., description="Lower quantile prediction interval (10th percentile)")
    fair_rate_high: float = Field(..., description="Upper quantile prediction interval (90th percentile)")
    likely_fair_range: List[float] = Field(..., description="[fair_rate_low, fair_rate_high] representing 80% interval")
    interval_method: str = "Quantile Gradient Boosting (alpha=0.10, alpha=0.90)"


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    version: str
    quantiles_loaded: bool = False
    supported_banks_count: int = 11
    supported_loan_types_count: int = 7


# ─────────────────────────────────────────────
# Planning Request / Response Schemas
# ─────────────────────────────────────────────

class LumpSumPrepayment(BaseModel):
    month: int = Field(..., ge=1, description="Month in which prepayment is made")
    amount: float = Field(..., gt=0, description="Prepayment amount in ₹")


class PrepaymentPlanRequest(BaseModel):
    principal_lakh: float = Field(..., gt=0)
    annual_rate_pct: float = Field(..., gt=0)
    tenure_years: int = Field(..., ge=1, le=30)
    extra_monthly_emi: float = Field(0.0, ge=0)
    lump_sums: List[LumpSumPrepayment] = Field(default_factory=list)


class APRRequest(BaseModel):
    loan_amount_lakh: float = Field(..., gt=0)
    quoted_rate_pct: float = Field(..., gt=0)
    tenure_years: int = Field(..., ge=1, le=30)
    processing_fee_pct: float = Field(1.0, ge=0)
    processing_fee_flat: float = Field(0.0, ge=0)
    gst_pct: float = Field(18.0, ge=0)
    insurance_amount: float = Field(0.0, ge=0)
    other_charges: float = Field(0.0, ge=0)


class RepoScenarioRequest(BaseModel):
    principal_lakh: float = Field(..., gt=0)
    current_rate_pct: float = Field(..., gt=0)
    tenure_years: int = Field(..., ge=1, le=30)
    current_repo_rate_pct: float = Field(6.50, gt=0)


class BalanceTransferRequest(BaseModel):
    outstanding_principal_lakh: float = Field(..., gt=0)
    remaining_tenure_years: float = Field(..., gt=0)
    current_rate_pct: float = Field(..., gt=0)
    new_rate_pct: float = Field(..., gt=0)
    processing_fee_pct: float = Field(0.50, ge=0)
    foreclosure_charges_pct: float = Field(0.0, ge=0)


class CreditImprovementRequest(BaseModel):
    credit_score: int = Field(..., ge=300, le=900)
    loan_type: str
    bank: str
    annual_income_lakh: float = Field(..., gt=0)
    loan_amount_lakh: float = Field(..., gt=0)
    tenure_years: int = Field(..., ge=1, le=30)
    ltv_ratio: Optional[float] = None
    existing_obligations_pct: float = 20.0


# ─────────────────────────────────────────────
# Tools Request / Response Schemas
# ─────────────────────────────────────────────

class NegotiationScriptRequest(BaseModel):
    verdict: str
    fair_rate: float
    offered_rate: float
    bank: str
    loan_type: str
    loan_amount_lakh: float
    tenure_years: int
    credit_score: int
    top_reasons: List[Any] = Field(default_factory=list)
    competitor_rates: List[Any] = Field(default_factory=list)
    tone: str = Field("polite", description="polite | firm | formal")


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    context: Dict[str, Any] = Field(default_factory=dict)
