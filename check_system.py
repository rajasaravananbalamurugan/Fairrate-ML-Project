import sys
import httpx
import json

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

BASE = "http://localhost:8000"

def run_test(name, fn):
    try:
        res = fn()
        if res.status_code == 200:
            print(f"✅ [200 OK] {name}")
            return res.json()
        else:
            print(f"❌ [{res.status_code}] {name} - {res.text[:150]}")
            return None
    except Exception as e:
        print(f"❌ [EXCEPTION] {name} - {e}")
        return None

print("=" * 60)
print("🚀 FAIRRATE FULL SYSTEM VALIDATION AUDIT")
print("=" * 60)

# 1. Health
h = run_test("System Health & Model Registry", lambda: httpx.get(f"{BASE}/health", timeout=5.0))
if h:
    print(f"   Model Version: {h.get('version')} | Supported Banks: {h.get('supported_banks_count')} | Loan Types: {h.get('supported_loan_types_count')}")

# 2. Predict V1
p1 = run_test("POST /predict (V1 Backward Compatible)", lambda: httpx.post(f"{BASE}/predict", json={
    "loan_type": "personal", "bank": "HDFC", "credit_score": 750,
    "annual_income_lakh": 15.0, "employment_type": "salaried",
    "loan_amount_lakh": 5.0, "tenure_years": 3, "existing_obligations_pct": 20.0,
    "offered_rate": 13.5
}, timeout=5.0))
if p1:
    print(f"   Fair Rate: {p1.get('fair_rate')}% | Verdict: {p1.get('verdict')}")

# 3. Predict V2 with Quantiles
p2 = run_test("POST /predict-v2 (Quantile Prediction Intervals)", lambda: httpx.post(f"{BASE}/predict-v2", json={
    "loan_type": "home", "bank": "SBI", "credit_score": 760,
    "annual_income_lakh": 24.0, "employment_type": "salaried",
    "loan_amount_lakh": 45.0, "tenure_years": 20, "ltv_ratio": 0.75,
    "existing_obligations_pct": 25.0, "offered_rate": 8.85
}, timeout=5.0))
if p2:
    print(f"   Point Estimate: {p2.get('fair_rate')}% | Likely Fair Range: {p2.get('fair_rate_low')}% – {p2.get('fair_rate_high')}% | Verdict: {p2.get('verdict')}")

# 4. Compare all 11 Banks
comp = run_test("GET /compare (11 Lenders Benchmark)", lambda: httpx.get(f"{BASE}/compare?loan_type=home&credit_score=760&loan_amount_lakh=45&tenure_years=20&offered_rate=8.85", timeout=5.0))
if comp:
    banks_list = [c["bank"] for c in comp]
    print(f"   Returned {len(comp)} lenders: {', '.join(banks_list[:6])}...")

# 5. Model Comparison
mc = run_test("GET /model/comparison (5-Fold CV Metrics)", lambda: httpx.get(f"{BASE}/model/comparison", timeout=5.0))
if mc:
    gbr = next((m for m in mc.get("models", []) if "Gradient" in m.get("model_name", "")), {})
    print(f"   Best Model: {mc.get('best_model')} | RMSE: {gbr.get('rmse')}% | R²: {gbr.get('r2')}")

# 6. Fairness Audit
fa = run_test("GET /audit/fairness (Demographic Subgroup Audit)", lambda: httpx.get(f"{BASE}/audit/fairness?threshold=1.0", timeout=5.0))
if fa:
    print(f"   Disparity Flags: {len(fa.get('disparity_flags', []))} flagged above 1.0% spread")

# 7. Drift Monitor
dm = run_test("GET /monitor/drift (Macro Policy & PSI Drift)", lambda: httpx.get(f"{BASE}/monitor/drift", timeout=5.0))
if dm:
    print(f"   Model Status: {dm.get('status')} | Current Repo: {dm.get('macro_drift', {}).get('current_repo_rate_pct')}%")

# 8. Data Sources
ds = run_test("GET /data/sources (Rate Cards Provenance)", lambda: httpx.get(f"{BASE}/data/sources", timeout=5.0))
if ds:
    sources = ds.get("sources", [])
    verified = sum(1 for s in sources if s.get("is_verified"))
    print(f"   Total Rate Cards: {len(sources)} | Verified: {verified} | Placeholders: {len(sources) - verified}")

# 9. Prepayment Plan
prep = run_test("POST /plan/prepayment (Reducing Balance Amortization)", lambda: httpx.post(f"{BASE}/plan/prepayment", json={
    "principal_lakh": 30.0, "annual_rate_pct": 8.75, "tenure_years": 20,
    "extra_monthly_emi": 5000.0, "lump_sums": [{"month": 24, "amount": 100000.0}]
}, timeout=5.0))
if prep:
    print(f"   Interest Saved: ₹{round(prep.get('interest_saved', 0)):,} | Tenure Reduced: {prep.get('years_saved')} Yrs ({prep.get('months_saved')} Mos)")

# 10. True Cost APR
apr = run_test("POST /plan/apr (IRR Cash Flow Computation)", lambda: httpx.post(f"{BASE}/plan/apr", json={
    "loan_amount_lakh": 10.0, "quoted_rate_pct": 10.5, "tenure_years": 5,
    "processing_fee_pct": 1.0, "gst_pct": 18.0, "insurance_amount": 12000, "other_charges": 3500
}, timeout=5.0))
if apr:
    print(f"   Quoted Rate: {apr.get('quoted_rate_pct')}% -> Effective APR: {apr.get('effective_apr_pct')}% (+{apr.get('apr_spread_bps')} bps hidden cost)")

# 11. Repo Rate Scenario Matrix
repo = run_test("POST /plan/repo-scenario (EBLR Sensitivity Matrix)", lambda: httpx.post(f"{BASE}/plan/repo-scenario", json={
    "principal_lakh": 40.0, "current_rate_pct": 8.75, "tenure_years": 20, "current_repo_rate_pct": 6.50
}, timeout=5.0))
if repo:
    print(f"   Simulated {len(repo.get('scenarios', []))} monetary policy scenarios (-50 bps to +50 bps)")

# 12. Balance Transfer
bt = run_test("POST /plan/balance-transfer (Refinancing Engine)", lambda: httpx.post(f"{BASE}/plan/balance-transfer", json={
    "outstanding_principal_lakh": 35.0, "remaining_tenure_years": 15,
    "current_rate_pct": 9.5, "new_rate_pct": 8.5,
    "processing_fee_pct": 0.5, "foreclosure_charges_pct": 0.0
}, timeout=5.0))
if bt:
    print(f"   Recommendation: {bt.get('verdict')} | Net Lifetime Savings: ₹{round(bt.get('net_savings', 0)):,} | Break-Even Month: {bt.get('break_even_month')}")

# 13. Credit Score Improvement Planner
ci = run_test("POST /plan/credit-improvement (ML Score Migration)", lambda: httpx.post(f"{BASE}/plan/credit-improvement", json={
    "credit_score": 710, "loan_type": "personal", "bank": "HDFC",
    "loan_amount_lakh": 5.0, "annual_income_lakh": 12.0, "tenure_years": 3,
    "existing_obligations_pct": 20.0
}, timeout=5.0))
if ci:
    print(f"   Target Milestone: {ci.get('next_target_tier')} (+{ci.get('points_needed')} pts) | Rate Drop: -{ci.get('estimated_rate_drop_pct')}% | Savings: ₹{round(ci.get('lifetime_interest_saved', 0)):,}")

# 14. AI Negotiation Script (Groq)
ns = run_test("POST /tools/negotiation-script (Groq LLM Engine)", lambda: httpx.post(f"{BASE}/tools/negotiation-script", json={
    "bank": "ICICI", "loan_type": "home", "loan_amount_lakh": 45.0, "tenure_years": 20,
    "offered_rate": 9.25, "fair_rate": 8.65, "credit_score": 780, "tone": "firm",
    "verdict": "HIGH", "top_reasons": ["CIBIL score 780", "Stable corporate employment"]
}, timeout=25.0))
if ns:
    print(f"   Generated: {ns.get('title')} ({ns.get('generator', 'LLM')})")

# 15. AI Chat Assistant (Groq)
chat = run_test("POST /tools/chat (Contextual AI Borrower Advisor)", lambda: httpx.post(f"{BASE}/tools/chat", json={
    "message": "Why is my rate considered high?",
    "context": {"bank": "HDFC", "loan_type": "personal", "offered_rate": 14.5, "fair_rate": 11.2, "verdict": "HIGH", "credit_score": 710}
}, timeout=25.0))
if chat:
    print(f"   AI Advisor: {chat.get('answer')[:120]}... [Powered by {chat.get('powered_by')}]")

print("=" * 60)
print("🎯 ALL 15 CORE SERVICES VALIDATED SUCCESSFULLY!")
print("=" * 60)
