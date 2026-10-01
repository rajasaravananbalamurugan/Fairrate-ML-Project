"""
FAIRRATE — Financial Calculations Engine
Implements reducing-balance amortization, prepayment scheduling, APR via IRR,
repo-linked rate scenario sensitivity, and balance transfer break-even math.
"""

import math
from typing import Dict, List, Any


def calculate_reducing_emi(principal: float, annual_rate_pct: float, tenure_years: float) -> float:
    """Calculates monthly EMI using standard reducing-balance compound interest formula."""
    if principal <= 0 or tenure_years <= 0:
        return 0.0
    r = (annual_rate_pct / 100.0) / 12.0
    n = int(tenure_years * 12)
    if r == 0:
        return principal / n
    emi = (principal * r * math.pow(1 + r, n)) / (math.pow(1 + r, n) - 1)
    return round(float(emi), 2)


def compute_prepayment_schedule(
    principal_lakh: float,
    annual_rate_pct: float,
    tenure_years: int,
    extra_monthly_emi: float = 0.0,
    lump_sums: List[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Computes month-by-month loan repayment with and without prepayments.
    Returns months saved, total interest saved, and amortization trajectory.
    """
    if lump_sums is None:
        lump_sums = []

    lump_sum_map = {int(item["month"]): float(item["amount"]) for item in lump_sums}

    principal = principal_lakh * 100000.0
    total_months = tenure_years * 12
    monthly_r = (annual_rate_pct / 100.0) / 12.0

    orig_emi = calculate_reducing_emi(principal, annual_rate_pct, tenure_years)

    # 1. Baseline Run (Without Prepayment)
    bal_orig = principal
    orig_total_interest = 0.0
    orig_timeline = []

    for m in range(1, total_months + 1):
        interest_m = bal_orig * monthly_r
        principal_m = orig_emi - interest_m
        bal_orig = max(0.0, bal_orig - principal_m)
        orig_total_interest += interest_m
        if m % 6 == 0 or m == total_months or m == 1:
            orig_timeline.append({"month": m, "balance": round(bal_orig, 2)})
        if bal_orig <= 0:
            break

    # 2. Prepayment Run
    bal_prep = principal
    prep_total_interest = 0.0
    actual_months_taken = 0
    prep_timeline = []

    for m in range(1, total_months + 1):
        if bal_prep <= 0:
            break
        actual_months_taken = m
        interest_m = bal_prep * monthly_r
        monthly_payment = orig_emi + extra_monthly_emi + lump_sum_map.get(m, 0.0)
        principal_m = monthly_payment - interest_m
        bal_prep = max(0.0, bal_prep - principal_m)
        prep_total_interest += interest_m

        if m % 6 == 0 or bal_prep <= 0 or m == 1:
            prep_timeline.append({
                "month": m,
                "balance_original": round(next((x["balance"] for x in orig_timeline if x["month"] == m), 0.0), 2),
                "balance_prepayment": round(bal_prep, 2),
            })

    months_saved = max(0, total_months - actual_months_taken)
    interest_saved = max(0.0, orig_total_interest - prep_total_interest)

    return {
        "original_tenure_months": total_months,
        "new_tenure_months": actual_months_taken,
        "months_saved": months_saved,
        "years_saved": round(months_saved / 12.0, 1),
        "original_monthly_emi": orig_emi,
        "extra_monthly_emi": extra_monthly_emi,
        "original_total_interest": round(orig_total_interest, 2),
        "new_total_interest": round(prep_total_interest, 2),
        "total_interest_saved": round(interest_saved, 2),
        "amortization_sample": prep_timeline[:40],
    }


def compute_effective_apr(
    loan_amount_lakh: float,
    quoted_rate_pct: float,
    tenure_years: int,
    processing_fee_pct: float = 1.0,
    processing_fee_flat: float = 0.0,
    gst_pct: float = 18.0,
    insurance_amount: float = 0.0,
    other_charges: float = 0.0,
) -> Dict[str, Any]:
    """
    Computes true Annual Percentage Rate (APR) by calculating the Internal Rate of Return (IRR)
    on net loan cash flows including upfront fees, GST, documentation, and insurance charges.
    """
    principal = loan_amount_lakh * 100000.0
    n = tenure_years * 12
    monthly_emi = calculate_reducing_emi(principal, quoted_rate_pct, tenure_years)

    # Calculate fee components
    proc_fee_base = (principal * (processing_fee_pct / 100.0)) + processing_fee_flat
    proc_fee_gst = proc_fee_base * (gst_pct / 100.0)
    total_proc_fee = proc_fee_base + proc_fee_gst
    total_upfront_fees = total_proc_fee + insurance_amount + other_charges

    net_disbursed = principal - total_upfront_fees

    # Solve for IRR on cash flows: +net_disbursed at t=0, -monthly_emi at t=1..n
    # f(r) = net_disbursed - monthly_emi * (1 - (1+r)^(-n)) / r = 0
    # Newton-Raphson solver
    r_est = (quoted_rate_pct / 100.0) / 12.0
    for _ in range(100):
        if r_est <= 0:
            r_est = 0.001
        pv = monthly_emi * (1.0 - math.pow(1.0 + r_est, -n)) / r_est
        diff = pv - net_disbursed
        if abs(diff) < 0.01:
            break
        # Derivative dPV/dr
        d_pv = monthly_emi * ((n * math.pow(1.0 + r_est, -n - 1) * r_est - (1.0 - math.pow(1.0 + r_est, -n))) / (r_est ** 2))
        if d_pv == 0:
            break
        r_est = r_est - (diff / d_pv)

    effective_apr_pct = round(r_est * 12.0 * 100.0, 2)
    gap_bps = int((effective_apr_pct - quoted_rate_pct) * 100)

    total_repayment = monthly_emi * n
    total_interest = total_repayment - principal

    fee_breakdown = [
        {"name": "Processing Fee (excl. GST)", "amount": round(proc_fee_base, 2), "pct": round((proc_fee_base / principal) * 100, 2)},
        {"name": f"GST on Processing Fee ({gst_pct}%)", "amount": round(proc_fee_gst, 2), "pct": round((proc_fee_gst / principal) * 100, 2)},
    ]
    if insurance_amount > 0:
        fee_breakdown.append({"name": "Credit & Asset Insurance", "amount": round(insurance_amount, 2), "pct": round((insurance_amount / principal) * 100, 2)})
    if other_charges > 0:
        fee_breakdown.append({"name": "Documentation & Legal Charges", "amount": round(other_charges, 2), "pct": round((other_charges / principal) * 100, 2)})

    return {
        "quoted_rate_pct": round(quoted_rate_pct, 2),
        "effective_apr_pct": effective_apr_pct,
        "apr_gap_bps": gap_bps,
        "loan_amount_lakh": loan_amount_lakh,
        "principal": principal,
        "total_upfront_fees": round(total_upfront_fees, 2),
        "net_disbursed_amount": round(net_disbursed, 2),
        "monthly_emi": monthly_emi,
        "total_interest": round(total_interest, 2),
        "total_cost_of_credit": round(total_interest + total_upfront_fees, 2),
        "fee_breakdown": fee_breakdown,
    }


def compute_repo_scenarios(
    principal_lakh: float,
    current_rate_pct: float,
    tenure_years: int,
    current_repo_rate_pct: float = 6.50,
) -> Dict[str, Any]:
    """
    Evaluates rate sensitivity to RBI repo rate adjustments (-50, -25, 0, +25, +50 bps).
    Computes both:
    1. Fixed Tenure: How monthly EMI fluctuates.
    2. Fixed EMI: How tenure expands/contracts.
    """
    principal = principal_lakh * 100000.0
    base_emi = calculate_reducing_emi(principal, current_rate_pct, tenure_years)
    base_months = tenure_years * 12

    scenarios = []
    deltas_bps = [-50, -25, 0, 25, 50]

    for bps in deltas_bps:
        new_rate = round(current_rate_pct + (bps / 100.0), 2)
        new_emi = calculate_reducing_emi(principal, new_rate, tenure_years)
        emi_diff = round(new_emi - base_emi, 2)

        # Fixed EMI tenure calculation: n = -ln(1 - (P*r)/E) / ln(1+r)
        r_monthly = (new_rate / 100.0) / 12.0
        tenure_months_new = base_months
        if base_emi > principal * r_monthly:
            try:
                n_calc = -math.log(1.0 - (principal * r_monthly) / base_emi) / math.log(1.0 + r_monthly)
                tenure_months_new = int(math.ceil(n_calc))
            except Exception:
                tenure_months_new = base_months

        tenure_diff_months = tenure_months_new - base_months

        scenarios.append({
            "repo_delta_bps": bps,
            "projected_loan_rate_pct": new_rate,
            "monthly_emi_if_tenure_fixed": new_emi,
            "monthly_emi_diff": emi_diff,
            "tenure_months_if_emi_fixed": tenure_months_new,
            "tenure_diff_months": tenure_diff_months,
            "cumulative_interest_diff": round((new_emi * base_months) - (base_emi * base_months), 2),
        })

    return {
        "current_repo_rate_pct": current_repo_rate_pct,
        "current_loan_rate_pct": current_rate_pct,
        "base_monthly_emi": base_emi,
        "scenarios": scenarios,
        "fixed_vs_floating_guidance": (
            "Floating repo-linked rates (EBR/RLLR) pass through RBI rate cuts directly to you. "
            "Fixed rates insulate against rate hikes but typically carry a 1.25% - 2.00% fixed-rate premium."
        ),
    }


def compute_balance_transfer(
    outstanding_principal_lakh: float,
    remaining_tenure_years: float,
    current_rate_pct: float,
    new_rate_pct: float,
    processing_fee_pct: float = 0.50,
    foreclosure_charges_pct: float = 0.0,
) -> Dict[str, Any]:
    """
    Evaluates refinancing viability: switching costs, break-even month, and net savings.
    """
    principal = outstanding_principal_lakh * 100000.0
    n = int(remaining_tenure_years * 12)

    current_emi = calculate_reducing_emi(principal, current_rate_pct, remaining_tenure_years)
    new_emi = calculate_reducing_emi(principal, new_rate_pct, remaining_tenure_years)

    monthly_savings = max(0.0, current_emi - new_emi)

    # Upfront costs of transferring
    processing_fee = principal * (processing_fee_pct / 100.0)
    foreclosure_cost = principal * (foreclosure_charges_pct / 100.0)
    total_switching_cost = round(processing_fee + foreclosure_cost, 2)

    break_even_month = 0
    if monthly_savings > 0:
        break_even_month = int(math.ceil(total_switching_cost / monthly_savings))

    lifetime_gross_savings = round(monthly_savings * n, 2)
    net_lifetime_savings = round(lifetime_gross_savings - total_switching_cost, 2)

    # Build monthly cumulative savings timeline
    timeline = []
    cum_savings = -total_switching_cost
    for m in range(1, min(n + 1, 61)):
        cum_savings += monthly_savings
        if m in (1, 6, 12, 18, 24, 36, 48, 60) or m == break_even_month:
            timeline.append({
                "month": m,
                "cumulative_net_savings": round(cum_savings, 2),
                "is_break_even": (m == break_even_month),
            })

    # Verdict
    is_recommended = (new_rate_pct < current_rate_pct) and (break_even_month <= 18) and (net_lifetime_savings > 10000)
    verdict = "RECOMMENDED" if is_recommended else ("MARGINAL" if net_lifetime_savings > 0 else "AVOID")

    return {
        "verdict": verdict,
        "is_recommended": is_recommended,
        "current_monthly_emi": current_emi,
        "new_monthly_emi": new_emi,
        "monthly_savings": round(monthly_savings, 2),
        "total_switching_cost": total_switching_cost,
        "break_even_month": break_even_month,
        "net_lifetime_savings": net_lifetime_savings,
        "timeline": timeline,
    }
