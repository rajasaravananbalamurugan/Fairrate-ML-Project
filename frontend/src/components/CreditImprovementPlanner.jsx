import React, { useState, useEffect } from "react";
import { planCreditImprovement } from "../api";

export default function CreditImprovementPlanner({ formValues }) {
  const [creditScore, setCreditScore] = useState(formValues?.credit_score || 710);
  const [bank, setBank] = useState(formValues?.bank || "HDFC");
  const [loanType, setLoanType] = useState(formValues?.loan_type || "personal");
  const [loanAmountLakh, setLoanAmountLakh] = useState(formValues?.loan_amount_lakh || 10);
  const [tenureYears, setTenureYears] = useState(formValues?.tenure_years || 5);
  const [incomeLakh, setIncomeLakh] = useState(formValues?.annual_income_lakh || 12);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const calculate = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await planCreditImprovement({
        credit_score: Number(creditScore),
        loan_type: loanType,
        bank: bank,
        loan_amount_lakh: Number(loanAmountLakh),
        annual_income_lakh: Number(incomeLakh),
        tenure_years: Number(tenureYears),
        ltv_ratio: 0.75,
        existing_obligations_pct: 20,
      });
      setResult(data);
    } catch (err) {
      setError(err?.response?.data?.detail || err.message || "Failed to calculate credit plan");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    calculate();
  }, [creditScore, bank, loanType, loanAmountLakh, tenureYears, incomeLakh]);

  const formatINR = (val) => "₹" + Math.round(val || 0).toLocaleString("en-IN");

  const targetTier = result?.next_target_tier || 750;
  const progressPct = result && targetTier > 600
    ? Math.min(100, Math.max(0, ((creditScore - 600) / (targetTier - 600)) * 100))
    : 50;

  return (
    <div className="space-y-6 fade-in-up">
      {/* Title */}
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-white" style={{ fontFamily: "Outfit, sans-serif" }}>
          📈 Credit Score Improvement & Tier Unlocker
        </h2>
        <p className="text-xs sm:text-sm text-slate-400">
          Discover how leveling up your CIBIL score into premium borrower brackets lowers fair rates and unlocks lifetime savings.
        </p>
      </div>

      {/* Inputs */}
      <div className="glass p-5 rounded-xl border border-indigo-500/20">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs text-slate-400">Your Current Credit Score</label>
              <span className="text-sm font-bold text-teal-400">{creditScore}</span>
            </div>
            <input
              type="range"
              min="580"
              max="840"
              step="5"
              value={creditScore}
              onChange={(e) => setCreditScore(Number(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">Loan Amount (₹ Lakh)</label>
            <input
              type="number"
              min="1"
              value={loanAmountLakh}
              onChange={(e) => setLoanAmountLakh(Number(e.target.value))}
              className="form-input text-xs"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">Tenure (Years)</label>
            <input
              type="number"
              min="1"
              max="30"
              value={tenureYears}
              onChange={(e) => setTenureYears(Number(e.target.value))}
              className="form-input text-xs"
            />
          </div>
        </div>
      </div>

      {error && <div className="p-3 bg-red-500/20 border border-red-500 text-red-200 text-xs rounded-xl">{error}</div>}

      {/* Target Progress & Financial Impact */}
      {result && (
        <div className="space-y-6">
          <div className="glass p-6 rounded-2xl border-2 border-indigo-500/30">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
              <div>
                <span className="text-xs uppercase font-extrabold tracking-wider text-indigo-400">
                  Target Score Milestone
                </span>
                <h3 className="text-2xl font-black text-white">
                  Reach {result.next_target_tier} (+{result.points_needed} Points Needed)
                </h3>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400">Projected Rate Drop</span>
                <div className="text-2xl font-black text-emerald-400">
                  -{result.estimated_rate_drop_pct.toFixed(2)}%
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-900 rounded-full h-3 p-0.5 overflow-hidden border border-white/10">
              <div
                className="bg-gradient-to-r from-indigo-500 via-teal-400 to-emerald-400 h-full rounded-full transition-all duration-700"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-500 mt-1.5">
              <span>600 (Subprime)</span>
              <span className="text-indigo-300 font-semibold">{creditScore} (Current)</span>
              <span className="text-emerald-400 font-semibold">{result.next_target_tier} (Next Target)</span>
              <span>850 (Prime)</span>
            </div>

            {/* Savings Pill Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-5 border-t border-white/5">
              <div className="text-center sm:text-left">
                <span className="text-xs text-slate-400">Current Fair Rate</span>
                <div className="text-xl font-bold text-slate-200 mt-0.5">
                  {result.current_fair_rate.toFixed(2)}%
                </div>
              </div>
              <div className="text-center sm:text-left">
                <span className="text-xs text-slate-400">Tier Fair Rate</span>
                <div className="text-xl font-bold text-teal-400 mt-0.5">
                  {result.projected_fair_rate.toFixed(2)}%
                </div>
              </div>
              <div className="text-center sm:text-left">
                <span className="text-xs text-slate-400">Total Lifetime Savings</span>
                <div className="text-xl font-black text-emerald-400 mt-0.5">
                  {formatINR(result.lifetime_interest_saved)}
                </div>
              </div>
            </div>
          </div>

          {/* Action Checklist */}
          <div className="glass p-5 rounded-xl border border-teal-500/20">
            <h3 className="text-sm font-bold text-teal-300 mb-3 flex items-center gap-2">
              <span>📋</span>
              <span>Actionable Credit Enhancement Checklist</span>
            </h3>
            <div className="space-y-2.5">
              {result.actionable_checklist?.map((action, i) => (
                <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg bg-white/5 border border-white/5 text-xs text-slate-200">
                  <span className="text-teal-400 font-bold mt-0.5">✔</span>
                  <span>{action}</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 mt-4 italic">
              * Note: Estimates computed via FAIRRATE risk models. Bureau score migrations require 3–6 months of disciplined repayment. Exact score movements cannot be guaranteed.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
