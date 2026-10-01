import React, { useState, useEffect, useRef } from "react";
import { predictFairRate } from "../api";

function calculateEmi(principalLakh, ratePct, tenureYears) {
  if (!principalLakh || !ratePct || !tenureYears) return 0;
  const p = principalLakh * 100000;
  const r = ratePct / (12 * 100);
  const n = tenureYears * 12;
  if (r === 0) return p / n;
  return (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

function formatINR(val) {
  return "₹" + Math.round(val).toLocaleString("en-IN");
}

export default function WhatIfSimulator({ result, formValues }) {
  const origCredit = formValues?.credit_score ?? 720;
  const origTenure = formValues?.tenure_years ?? 3;
  const origAmount = formValues?.loan_amount_lakh ?? 5;
  const originalFairRate = result?.fair_rate ?? 12.0;

  const [creditScore, setCreditScore] = useState(origCredit);
  const [tenureYears, setTenureYears] = useState(origTenure);
  const [loanAmount, setLoanAmount] = useState(origAmount);

  const [simRate, setSimRate] = useState(originalFairRate);
  const [simLoading, setSimLoading] = useState(false);
  const [simError, setSimError] = useState(null);

  const debounceTimerRef = useRef(null);

  // Sync state if initial props change
  useEffect(() => {
    if (formValues) {
      setCreditScore(formValues.credit_score ?? 720);
      setTenureYears(formValues.tenure_years ?? 3);
      setLoanAmount(formValues.loan_amount_lakh ?? 5);
    }
    if (result?.fair_rate) {
      setSimRate(result.fair_rate);
    }
  }, [formValues, result]);

  // Debounced API call on slider changes (re-calls /predict)
  useEffect(() => {
    if (!formValues && !result) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const isSameAsOriginal =
      creditScore === origCredit &&
      tenureYears === origTenure &&
      loanAmount === origAmount;

    if (isSameAsOriginal) {
      setSimRate(originalFairRate);
      setSimLoading(false);
      setSimError(null);
      return;
    }

    setSimLoading(true);
    setSimError(null);

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const payload = {
          loan_type: formValues?.loan_type || "personal",
          bank: formValues?.bank || "HDFC",
          credit_score: Number(creditScore),
          annual_income_lakh: Number(formValues?.annual_income_lakh ?? 12),
          employment_type: formValues?.employment_type || "salaried",
          loan_amount_lakh: Number(loanAmount),
          tenure_years: Number(tenureYears),
          ltv_ratio: formValues?.ltv_ratio ?? null,
          existing_obligations_pct: Number(formValues?.existing_obligations_pct ?? 20),
          offered_rate: Number(formValues?.offered_rate ?? result?.offered_rate ?? 13.5),
        };

        const res = await predictFairRate(payload);
        setSimRate(res.fair_rate);
      } catch (err) {
        setSimError(err?.response?.data?.detail || err.message || "Simulation error");
      } finally {
        setSimLoading(false);
      }
    }, 350);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [creditScore, tenureYears, loanAmount, origCredit, origTenure, origAmount, originalFairRate, formValues, result]);

  // Loading skeleton when no result
  if (!result) {
    return (
      <div className="glass rounded-2xl p-6 border border-indigo-500/20 animate-pulse">
        <div className="h-6 w-56 bg-slate-700/60 rounded mb-4" />
        <div className="space-y-4">
          <div className="h-16 bg-slate-800/80 rounded-xl" />
          <div className="h-16 bg-slate-800/80 rounded-xl" />
          <div className="h-16 bg-slate-800/80 rounded-xl" />
        </div>
      </div>
    );
  }

  // EMI computations
  const origEmi = calculateEmi(origAmount, originalFairRate, origTenure);
  const simEmi = calculateEmi(loanAmount, simRate, tenureYears);
  const emiDelta = simEmi - origEmi;
  const rateDelta = simRate - originalFairRate;

  const handleReset = () => {
    setCreditScore(origCredit);
    setTenureYears(origTenure);
    setLoanAmount(origAmount);
    setSimRate(originalFairRate);
    setSimError(null);
  };

  const isModified =
    creditScore !== origCredit ||
    tenureYears !== origTenure ||
    loanAmount !== origAmount;

  return (
    <div className="glass rounded-2xl p-6 border border-indigo-500/25 bg-slate-900/60 fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center text-lg">
            🎛️
          </span>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">
              Interactive What-If Scenario Simulator
            </h3>
            <p className="text-xs text-slate-400">
              Adjust your CIBIL score, tenure, or loan amount to see real-time ML fair rate updates
            </p>
          </div>
        </div>

        {isModified && (
          <button
            type="button"
            onClick={handleReset}
            className="text-xs font-semibold text-slate-400 hover:text-white px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors cursor-pointer"
          >
            ↺ Reset Values
          </button>
        )}
      </div>

      {simError && (
        <div className="p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/25 text-red-300 text-xs">
          ⚠️ {simError}
        </div>
      )}

      {/* 3 Interactive Sliders: CIBIL, Tenure, Loan Amount */}
      <div className="space-y-5 mb-6">
        {/* 1. CIBIL Score Slider */}
        <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-300">
              1. CIBIL Credit Score
            </span>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black text-emerald-400 font-mono">
                {creditScore}
              </span>
              {creditScore !== origCredit && (
                <span className="text-[11px] text-slate-400 font-mono">
                  ({creditScore > origCredit ? `+${creditScore - origCredit}` : creditScore - origCredit})
                </span>
              )}
            </div>
          </div>
          <input
            type="range"
            min={300}
            max={900}
            step={5}
            value={creditScore}
            onChange={(e) => setCreditScore(Number(e.target.value))}
            className="w-full cursor-pointer"
            style={{
              background: `linear-gradient(to right, #10b981 ${((creditScore - 300) / 600) * 100}%, rgba(255,255,255,0.08) ${((creditScore - 300) / 600) * 100}%)`,
            }}
          />
          <div className="flex justify-between text-[10px] text-slate-500 mt-1">
            <span>300 (Poor)</span>
            <span>750 (Prime)</span>
            <span>900 (Excellent)</span>
          </div>
        </div>

        {/* 2. Tenure Slider */}
        <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-300">
              2. Loan Tenure (Years)
            </span>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black text-indigo-400 font-mono">
                {tenureYears} yrs
              </span>
              {tenureYears !== origTenure && (
                <span className="text-[11px] text-slate-400 font-mono">
                  ({tenureYears > origTenure ? `+${tenureYears - origTenure}y` : `${tenureYears - origTenure}y`})
                </span>
              )}
            </div>
          </div>
          <input
            type="range"
            min={1}
            max={30}
            step={1}
            value={tenureYears}
            onChange={(e) => setTenureYears(Number(e.target.value))}
            className="w-full cursor-pointer"
            style={{
              background: `linear-gradient(to right, #6366f1 ${((tenureYears - 1) / 29) * 100}%, rgba(255,255,255,0.08) ${((tenureYears - 1) / 29) * 100}%)`,
            }}
          />
          <div className="flex justify-between text-[10px] text-slate-500 mt-1">
            <span>1 yr</span>
            <span>15 yrs</span>
            <span>30 yrs</span>
          </div>
        </div>

        {/* 3. Loan Amount Slider */}
        <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-300">
              3. Loan Amount (₹ Lakhs)
            </span>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black text-purple-400 font-mono">
                ₹{loanAmount} Lakhs
              </span>
              {loanAmount !== origAmount && (
                <span className="text-[11px] text-slate-400 font-mono">
                  ({loanAmount > origAmount ? `+₹${(loanAmount - origAmount).toFixed(1)}L` : `-₹${(origAmount - loanAmount).toFixed(1)}L`})
                </span>
              )}
            </div>
          </div>
          <input
            type="range"
            min={1}
            max={150}
            step={0.5}
            value={loanAmount}
            onChange={(e) => setLoanAmount(Number(e.target.value))}
            className="w-full cursor-pointer"
            style={{
              background: `linear-gradient(to right, #a855f7 ${((loanAmount - 1) / 149) * 100}%, rgba(255,255,255,0.08) ${((loanAmount - 1) / 149) * 100}%)`,
            }}
          />
          <div className="flex justify-between text-[10px] text-slate-500 mt-1">
            <span>₹1 Lakh</span>
            <span>₹75 Lakhs</span>
            <span>₹150 Lakhs</span>
          </div>
        </div>
      </div>

      {/* Real-Time Simulated Result Box */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-950/70 to-slate-900 border border-indigo-500/30">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
            Simulated Machine Learning Verdict
          </span>
          {simLoading && (
            <span className="text-xs text-indigo-300 animate-pulse font-medium">
              ⚡ Recalculating fair rate via /predict…
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="text-xs text-slate-400 mb-1">Simulated Fair Rate</div>
            <div className="text-2xl font-black text-indigo-300 font-mono">
              {simRate.toFixed(2)}%
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              vs {originalFairRate.toFixed(2)}% baseline ({rateDelta >= 0 ? `+${rateDelta.toFixed(2)}%` : `${rateDelta.toFixed(2)}%`})
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="text-xs text-slate-400 mb-1">Simulated Monthly EMI</div>
            <div className="text-2xl font-black text-white font-mono">
              {formatINR(simEmi)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              vs {formatINR(origEmi)} baseline
            </div>
          </div>

          <div className={`p-3 rounded-xl border ${
            emiDelta <= 0
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-amber-500/10 border-amber-500/30 text-amber-300"
          }`}>
            <div className="text-xs text-slate-400 mb-1">Monthly EMI Difference</div>
            <div className="text-2xl font-black font-mono">
              {emiDelta <= 0 ? `-${formatINR(Math.abs(emiDelta))}` : `+${formatINR(emiDelta)}`}
            </div>
            <div className="text-[11px] mt-0.5">
              {emiDelta <= 0 ? "Lower monthly outgo 🎉" : "Increased monthly commitment"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
