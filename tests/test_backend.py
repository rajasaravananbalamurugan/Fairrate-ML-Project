"""
FAIRRATE — Comprehensive Backend Test Suite
Tests API endpoints, financial mathematics, prediction intervals, and error handling.
Run: pytest tests/test_backend.py -v
"""

import sys
import os
import pytest
from fastapi.testclient import TestClient

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

from backend.main import app
from backend.financial_math import (
    calculate_reducing_emi,
    compute_prepayment_schedule,
    compute_effective_apr,
    compute_repo_scenarios,
    compute_balance_transfer,
)

client = TestClient(app)


def test_health_endpoint():
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["model_loaded"] is True
    assert data["version"] == "2.0.0"
    assert data["quantiles_loaded"] is True
    assert data["supported_banks_count"] >= 11
    assert data["supported_loan_types_count"] >= 7


def test_predict_v1_contract():
    payload = {
        "loan_type": "personal",
        "bank": "HDFC",
        "credit_score": 750,
        "annual_income_lakh": 15.0,
        "employment_type": "salaried",
        "loan_amount_lakh": 5.0,
        "tenure_years": 3,
        "ltv_ratio": None,
        "existing_obligations_pct": 20.0,
        "offered_rate": 13.5,
    }
    resp = client.post("/predict", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert "fair_rate" in data
    assert "verdict" in data
    assert "top_reasons" in data
    assert len(data["top_reasons"]) > 0


def test_predict_v2_prediction_intervals():
    payload = {
        "loan_type": "home",
        "bank": "SBI",
        "credit_score": 760,
        "annual_income_lakh": 25.0,
        "employment_type": "salaried",
        "loan_amount_lakh": 50.0,
        "tenure_years": 20,
        "ltv_ratio": 0.75,
        "existing_obligations_pct": 25.0,
        "offered_rate": 8.85,
    }
    resp = client.post("/predict-v2", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert "fair_rate" in data
    assert "fair_rate_low" in data
    assert "fair_rate_high" in data
    assert data["fair_rate_low"] <= data["fair_rate_high"]
    assert "likely_fair_range" in data
    assert len(data["likely_fair_range"]) == 2


def test_invalid_input_validation():
    # Invalid credit score (outside 300-900)
    bad_payload = {
        "loan_type": "personal",
        "bank": "SBI",
        "credit_score": 150,  # Invalid
        "annual_income_lakh": 10.0,
        "employment_type": "salaried",
        "loan_amount_lakh": 5.0,
        "tenure_years": 3,
        "existing_obligations_pct": 20.0,
        "offered_rate": 13.5,
    }
    resp = client.post("/predict", json=bad_payload)
    assert resp.status_code == 422


def test_model_lab_endpoints():
    # Data sources
    src_resp = client.get("/data/sources")
    assert src_resp.status_code == 200
    assert len(src_resp.json()["sources"]) > 0

    # Model comparison
    comp_resp = client.get("/model/comparison")
    assert comp_resp.status_code == 200
    assert "models" in comp_resp.json()
    assert len(comp_resp.json()["models"]) >= 2

    # Fairness audit
    audit_resp = client.get("/audit/fairness?threshold=1.0")
    assert audit_resp.status_code == 200
    assert "slices" in audit_resp.json()

    # Drift monitor
    drift_resp = client.get("/monitor/drift")
    assert drift_resp.status_code == 200
    assert drift_resp.json()["status"] in ("OK", "RETRAIN_RECOMMENDED")


def test_financial_math_formulas():
    # Known test case: ₹10,00,000 at 10% for 5 years
    # Monthly rate = 10 / 1200, n = 60
    # Expected EMI ~ ₹21,247.04
    emi = calculate_reducing_emi(1000000.0, 10.0, 5.0)
    assert abs(emi - 21247.04) < 1.0

    # Prepayment math test
    prep = compute_prepayment_schedule(
        principal_lakh=10.0,
        annual_rate_pct=10.0,
        tenure_years=5,
        extra_monthly_emi=2000.0,
        lump_sums=[{"month": 12, "amount": 50000.0}]
    )
    assert prep["months_saved"] > 0
    assert prep["total_interest_saved"] > 0
    assert prep["new_tenure_months"] < prep["original_tenure_months"]

    # APR math test (checking that fees increase APR above quoted rate)
    apr_res = compute_effective_apr(
        loan_amount_lakh=10.0,
        quoted_rate_pct=10.0,
        tenure_years=5,
        processing_fee_pct=1.0,
        gst_pct=18.0,
    )
    assert apr_res["effective_apr_pct"] > apr_res["quoted_rate_pct"]


def test_planning_endpoints():
    # Prepayment endpoint
    p_resp = client.post("/plan/prepayment", json={
        "principal_lakh": 15.0,
        "annual_rate_pct": 9.5,
        "tenure_years": 10,
        "extra_monthly_emi": 1500.0,
        "lump_sums": [{"month": 12, "amount": 50000.0}]
    })
    assert p_resp.status_code == 200
    assert p_resp.json()["months_saved"] > 0

    # APR endpoint
    apr_resp = client.post("/plan/apr", json={
        "loan_amount_lakh": 25.0,
        "quoted_rate_pct": 8.75,
        "tenure_years": 15,
        "processing_fee_pct": 0.5,
    })
    assert apr_resp.status_code == 200

    # Repo scenario endpoint
    repo_resp = client.post("/plan/repo-scenario", json={
        "principal_lakh": 40.0,
        "current_rate_pct": 8.90,
        "tenure_years": 20,
    })
    assert repo_resp.status_code == 200
    assert len(repo_resp.json()["scenarios"]) == 5

    # Balance transfer endpoint
    bt_resp = client.post("/plan/balance-transfer", json={
        "outstanding_principal_lakh": 30.0,
        "remaining_tenure_years": 15.0,
        "current_rate_pct": 9.5,
        "new_rate_pct": 8.6,
        "processing_fee_pct": 0.5,
    })
    assert bt_resp.status_code == 200
    assert "verdict" in bt_resp.json()


def test_tools_endpoints():
    # Negotiation script
    script_resp = client.post("/tools/negotiation-script", json={
        "verdict": "HIGH",
        "fair_rate": 11.5,
        "offered_rate": 13.0,
        "bank": "HDFC",
        "loan_type": "personal",
        "loan_amount_lakh": 5.0,
        "tenure_years": 3,
        "credit_score": 750,
        "tone": "firm"
    })
    assert script_resp.status_code == 200
    assert "negotiation_text" in script_resp.json()

    # Chat assistant
    chat_resp = client.post("/tools/chat", json={
        "message": "Why is my interest rate high?",
        "context": {"offered_rate": 14.5, "fair_rate": 12.0, "verdict": "HIGH", "bank": "Axis"}
    })
    assert chat_resp.status_code == 200
    assert "answer" in chat_resp.json()
    assert "disclaimer" in chat_resp.json()


def test_credit_improvement_endpoint():
    resp = client.post("/plan/credit-improvement", json={
        "credit_score": 710,
        "loan_type": "personal",
        "bank": "HDFC",
        "loan_amount_lakh": 5.0,
        "annual_income_lakh": 12.0,
        "tenure_years": 3,
        "ltv_ratio": 0.75,
        "existing_obligations_pct": 20.0
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["next_target_tier"] == 750
    assert data["points_needed"] == 40
    assert data["projected_fair_rate"] <= data["current_fair_rate"]
    assert "actionable_checklist" in data
    assert len(data["actionable_checklist"]) > 0


def test_edge_cases_and_invalid_inputs():
    # Invalid bank not in catalog
    resp = client.post("/predict", json={
        "loan_type": "personal",
        "bank": "NonExistentBankXYZ",
        "credit_score": 750,
        "annual_income_lakh": 15.0,
        "employment_type": "salaried",
        "loan_amount_lakh": 5.0,
        "tenure_years": 3,
        "offered_rate": 12.0,
    })
    assert resp.status_code == 422

    # Negative loan amount
    resp2 = client.post("/plan/apr", json={
        "loan_amount_lakh": -10.0,
        "quoted_rate_pct": 10.0,
        "tenure_years": 5,
    })
    assert resp2.status_code == 422

    # Zero tenure
    resp3 = client.post("/plan/repo-scenario", json={
        "principal_lakh": 25.0,
        "current_rate_pct": 8.5,
        "tenure_years": 0,
    })
    assert resp3.status_code == 422


def test_known_math_edge_cases():
    # 0% interest rate loan reduces to principal / n
    emi_zero = calculate_reducing_emi(120000.0, 0.0, 1.0)
    assert abs(emi_zero - 10000.0) < 0.01

    # Exact known reducing balance value: ₹1,00,000 at 12% p.a. for 1 year (12 months)
    # EMI = 100000 * 0.01 * (1.01^12) / (1.01^12 - 1) = ₹8,884.88
    emi_known = calculate_reducing_emi(100000.0, 12.0, 1.0)
    assert abs(emi_known - 8884.88) < 0.1

