import json
import urllib.request
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

def call_api(endpoint, method="GET", data=None):
    url = f"http://127.0.0.1:8000{endpoint}"
    req = urllib.request.Request(url, method=method)
    if data:
        req.data = json.dumps(data).encode("utf-8")
        req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

def main():
    print("=" * 65)
    print("   FAIRRATE — SYSTEM EXECUTION & VERIFICATION TEST REPORT")
    print("=" * 65)

    # 1. Health
    health = call_api("/health")
    print(f"\n1. Health Check:")
    print(f"   Status      : {health.get('status')}")
    print(f"   Model Loaded: {health.get('model_loaded')}")
    print(f"   Version     : {health.get('version')}")

    # 2. Test Case 1: Personal Loan - Fair Rate Scenario
    print("\n" + "=" * 65)
    print("2. Test Case 1: Salaried Personal Loan (Credit 750, 13.5% Offer)")
    print("-" * 65)
    p1 = {
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
    r1 = call_api("/predict", method="POST", data=p1)
    print(f"   ML Model Used   : {r1['model_name']}")
    print(f"   Fair Rate (Est) : {r1['fair_rate']:.2f}%")
    print(f"   Offered Rate    : {r1['offered_rate']:.2f}%")
    print(f"   Spread/Diff     : {r1['difference']:+.2f}%")
    print(f"   Verdict         : {r1['verdict_emoji']} {r1['verdict']}")
    print(f"   Typical Error   : ±{r1['confidence']['std']:.2f}% (Expected Range: [{r1['confidence']['low']:.2f}%, {r1['confidence']['high']:.2f}%])")
    print(f"   Status Message  : {r1['message']}")
    print("\n   Key SHAP Driver Features:")
    for f in r1.get("top_reasons", []):
        print(f"     • {f['label']:<28} {f['shap_value']:>+6.3f}% | {f['reason']}")

    print("\n   Cross-Bank Predicted Rates:")
    for b in r1.get("compare", []):
        print(f"     • {b['bank']:<6}: {b['predicted_rate']:.2f}% (Savings vs Worst: {b['savings_vs_worst']:.2f}%)")

    # 4. Test Case 2: Home Loan with Moderate/Fair rate
    print("\n" + "=" * 65)
    print("4. Test Case 2: Home Loan (Credit 670, Fair 11.67% vs Offered 11.5%)")
    print("-" * 65)
    p2 = {
        "loan_type": "home",
        "bank": "SBI",
        "credit_score": 670,
        "annual_income_lakh": 10.0,
        "employment_type": "salaried",
        "loan_amount_lakh": 45.0,
        "tenure_years": 20,
        "ltv_ratio": 0.75,
        "existing_obligations_pct": 30.0,
        "offered_rate": 11.5,
    }
    r2 = call_api("/predict", method="POST", data=p2)
    print(f"   Fair Rate (Est) : {r2['fair_rate']:.2f}%")
    print(f"   Offered Rate    : {r2['offered_rate']:.2f}%")
    print(f"   Spread/Diff     : {r2['difference']:+.2f}%")
    print(f"   Verdict         : {r2['verdict_emoji']} {r2['verdict']}")

    # 4b. Test Case 2b: Home Loan with HIGH Rate (+1.13% spread)
    print("\n" + "=" * 65)
    print("4b. Test Case 2b: Home Loan with Overpriced Offer (Credit 670, Offered 12.8%)")
    print("-" * 65)
    p2b = {**p2, "offered_rate": 12.8}
    r2b = call_api("/predict", method="POST", data=p2b)
    print(f"   Fair Rate (Est) : {r2b['fair_rate']:.2f}%")
    print(f"   Offered Rate    : {r2b['offered_rate']:.2f}%")
    print(f"   Spread/Diff     : {r2b['difference']:+.2f}%")
    print(f"   Verdict         : {r2b['verdict_emoji']} {r2b['verdict']}")
    print(f"   Advice          : {r2b['explainer']}")

    # 5. Test Case 3: Car Loan - Red Flag / Extremely Overpriced
    print("\n" + "=" * 65)
    print("5. Test Case 3: Car Loan - Red Flag (Credit 720, Offered 16.5% vs typical 9-10%)")
    print("-" * 65)
    p3 = {
        "loan_type": "car",
        "bank": "ICICI",
        "credit_score": 720,
        "annual_income_lakh": 12.0,
        "employment_type": "salaried",
        "loan_amount_lakh": 8.0,
        "tenure_years": 5,
        "ltv_ratio": 0.80,
        "existing_obligations_pct": 15.0,
        "offered_rate": 16.5,
    }
    r3 = call_api("/predict", method="POST", data=p3)
    print(f"   Fair Rate (Est) : {r3['fair_rate']:.2f}%")
    print(f"   Offered Rate    : {r3['offered_rate']:.2f}%")
    print(f"   Spread/Diff     : {r3['difference']:+.2f}%")
    print(f"   Verdict         : {r3['verdict_emoji']} {r3['verdict']}")
    print(f"   Advice          : {r3['explainer']}")

    print("\n" + "=" * 65)
    print("   ALL TESTS EXECUTED SUCCESSFULLY — SYSTEM ONLINE")
    print("=" * 65)

if __name__ == "__main__":
    main()
