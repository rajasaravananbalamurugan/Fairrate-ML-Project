"""
FAIRRATE — Pydantic Schemas for FastAPI
"""

from typing import Optional, List
from pydantic import BaseModel, Field, validator


class LoanRequest(BaseModel):
    loan_type: str = Field(..., description="personal | home | car | education")
    bank: str = Field(..., description="SBI | HDFC | ICICI | Axis | Kotak")
    credit_score: int = Field(..., ge=300, le=900)
    annual_income_lakh: float = Field(..., gt=0, description="Annual income in ₹ lakhs")
    employment_type: str = Field(..., description="salaried | self_employed | business")
    loan_amount_lakh: float = Field(..., gt=0, description="Loan amount in ₹ lakhs")
    tenure_years: int = Field(..., ge=1, le=30)
    ltv_ratio: Optional[float] = Field(None, ge=0.0, le=1.0, description="LTV ratio (required for home/car)")
    existing_obligations_pct: float = Field(..., ge=0.0, le=100.0, description="% of income as existing EMI")
    offered_rate: float = Field(..., gt=0, description="Interest rate offered by bank (%)")

    @validator("loan_type")
    def validate_loan_type(cls, v):
        allowed = {"personal", "home", "car", "education"}
        if v.lower() not in allowed:
            raise ValueError(f"loan_type must be one of {allowed}")
        return v.lower()

    @validator("bank")
    def validate_bank(cls, v):
        allowed = {"SBI", "HDFC", "ICICI", "Axis", "Kotak"}
        if v not in allowed:
            raise ValueError(f"bank must be one of {allowed}")
        return v

    @validator("employment_type")
    def validate_employment_type(cls, v):
        allowed = {"salaried", "self_employed", "business"}
        if v.lower() not in allowed:
            raise ValueError(f"employment_type must be one of {allowed}")
        return v.lower()


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


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    version: str = "1.0.0"
