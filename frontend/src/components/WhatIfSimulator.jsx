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
  return val.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });
}

export default function WhatIfSimulator({ result, formValues }) {
  const origCredit = formValues?.credit_score ?? 720;
  const origIncome = formValues?.annual_income_lakh ?? 12;
  const origTenure = formValues?.tenure_years ?? 3;
  const loanAmount = formValues?.loan_amount_lakh ?? 5;
  const originalFairRate = result?.fair_rate ?? 12.0;

  const [creditScore, setCreditScore] = useState(origCredit);
  const [incomeLakh, setIncomeLakh] = useState(origIncome);
  const [tenureYears, setTenureYears] = useState(origTenure);

  const [simRate, setSimRate] = useState(originalFairRate);
  const [simLoading, setSimLoading] = useState(false);
  const [simError, setSimError] = useState(null);

  const debounceTimerRef = useRef(null);

  // Sync state if initial props change
  useEffect(() => {
    if (formValues) {
      setCreditScore(formValues.credit_score ?? 720);
      setIncomeLakh(formValues.annual_income_lakh ?? 12);
      setTenureYears(formValues.tenure_years ?? 3);
    }
    if (result?.fair_rate) {
      setSimRate(result.fair_rate);
    }
  }, [formValues, result]);

  // Debounced API call on slider changes
  useEffect(() => {
    if (!formValues && !result) return;

    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Skip if values match original submission
    const isSameAsOriginal =
      creditScore === origCredit &&
      incomeLakh === origIncome &&
      tenureYears === origTenure;

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
          annual_income_lakh: Number(incomeLakh),
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
    }, 400);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [creditScore, incomeLakh, tenureYears, formValues, result, origCredit, origIncome, origTenure, loanAmount, originalFairRate]);

  // Financial calculations
  const originalEmi = calculateEmi(loanAmount, originalFairRate, origTenure);
  const simulatedEmi = calculateEmi(loanAmount, simRate, tenureYears);
  const emiDiff = Math.round(originalEmi - simulatedEmi);

  // Dynamic summary sentence
  const getSummaryLine = () => {
    if (creditScore !== origCredit && creditScore > origCredit) {
      const savings = Math.max(0, emiDiff);
      return `Improving credit score from ${origCredit} → ${creditScore} saves ${formatINR(savings)}/month!`;
    }
    if (emiDiff > 0) {
      return `This combination saves ${formatINR(emiDiff)}/month compared to your baseline offer!`;
    }
    if (emiDiff < 0) {
      return `This profile changes your monthly EMI by +${formatINR(Math.abs(emiDiff))}/month.`;
    }
    return `Adjust the sliders to explore how profile improvements lower your interest rate.`;
  };

  // Loading skeleton when no result
  if (!result) {
    return (
      <div className="glass rounded-2xl p-6 border border-indigo-500/20 animate-pulse">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 bg-slate-700/60 rounded-full" />
          <div className="h-5 w-48 bg-slate-700/60 rounded" />
        </div>
        <div className="space-y-4">
          <div className="h-14 bg-slate-800/80 rounded-xl" />
          <div className="h-14 bg-slate-800/80 rounded-xl" />
          <div className="h-14 bg-slate-800/80 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-6 border border-indigo-500/20 fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🎛️</span>
            <h3
              className="text-lg font-bold text-white tracking-wide"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              What-If Loan Simulator
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Simulate how financial changes immediately impact your fair rate & EMI
          </p>
        </div>

        {/* Live Simulation Rate Badge */}
        <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-slate-900/80 border border-indigo-500/30 self-start sm:self-auto">
          <div className="text-right">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Simulated Rate</div>
            <div className="text-lg font-black text-indigo-300" style={{ fontFamily: "Outfit, sans-serif" }}>
              {simLoading ? (
                <span className="animate-pulse text-slate-400">Calculating…</span>
              ) : (
                `${simRate.toFixed(2)}%`
              )}
            </div>
          </div>
          {simRate !== originalFairRate && (
            <span
              className={`text-xs px-2 py-0.5 rounded font-bold ${
                simRate < originalFairRate
                  ? "bg-emerald-500/20 text-emerald-300"
                  : "bg-red-500/20 text-red-300"
              }`}
            >
              {simRate < originalFairRate ? "-" : "+"}
              {Math.abs(simRate - originalFairRate).toFixed(2)}%
            </span>
          )}
        </div>
      </div>

      {simError && (
        <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
          ⚠️ Simulation error: {simError}
        </div>
      )}

      {/* 3 Interactive Sliders */}
      <div className="space-y-5">
        {/* 1. Credit Score Slider */}
        <div className="rounded-xl p-4 bg-slate-900/40 border border-slate-700/50">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-slate-200 flex items-center gap-2">
              <span>💳</span> Credit Score (CIBIL)
            </label>
            <span
              className={`text-sm font-bold ${
                creditScore >= 750
                  ? "text-emerald-400"
                  : creditScore >= 650
                  ? "text-amber-400"
                  : "text-red-400"
              }`}
            >
              {creditScore}
            </span>
          </div>
          <input
            type="range"
            min="550"
            max="850"
            step="10"
            value={creditScore}
            onChange={(e) => setCreditScore(Number(e.target.value))}
            className="w-full accent-indigo-500 cursor-pointer h-2 bg-slate-800 rounded-lg appearance-none"
          />
          <div className="flex justify-between text-[11px] text-slate-500 mt-1">
            <span>550 (Poor)</span>
            <span>700 (Good)</span>
            <span>850 (Excellent)</span>
          </div>
        </div>

        {/* 2. Annual Income Slider */}
        <div className="rounded-xl p-4 bg-slate-900/40 border border-slate-700/50">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-slate-200 flex items-center gap-2">
              <span>💼</span> Annual Income (LPA)
            </label>
            <span className="text-sm font-bold text-indigo-300">
              ₹{Number(incomeLakh).toFixed(1)} Lakhs
            </span>
          </div>
          <input
            type="range"
            min="1"
            max="50"
            step="0.5"
            value={incomeLakh}
            onChange={(e) => setIncomeLakh(Number(e.target.value))}
            className="w-full accent-indigo-500 cursor-pointer h-2 bg-slate-800 rounded-lg appearance-none"
          />
          <div className="flex justify-between text-[11px] text-slate-500 mt-1">
            <span>₹1 LPA</span>
            <span>₹25 LPA</span>
            <span>₹50 LPA</span>
          </div>
        </div>

        {/* 3. Loan Tenure Slider */}
        <div className="rounded-xl p-4 bg-slate-900/40 border border-slate-700/50">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-slate-200 flex items-center gap-2">
              <span>⏳</span> Loan Tenure
            </label>
            <span className="text-sm font-bold text-indigo-300">
              {tenureYears} {tenureYears === 1 ? "Year" : "Years"}
            </span>
          </div>
          <input
            type="range"
            min="1"
            max="30"
            step="1"
            value={tenureYears}
            onChange={(e) => setTenureYears(Number(e.target.value))}
            className="w-full accent-indigo-500 cursor-pointer h-2 bg-slate-800 rounded-lg appearance-none"
          />
          <div className="flex justify-between text-[11px] text-slate-500 mt-1">
            <span>1 Year</span>
            <span>15 Years</span>
            <span>30 Years</span>
          </div>
        </div>
      </div>

      {/* Summary Highlight Box */}
      <div className="mt-5 p-4 rounded-xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-500/30 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="text-2xl">💡</span>
          <div>
            <p className="text-xs text-slate-400 font-medium">Simulation Insight</p>
            <p className="text-sm font-bold text-white mt-0.5">{getSummaryLine()}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setCreditScore(origCredit);
            setIncomeLakh(origIncome);
            setTenureYears(origTenure);
          }}
          className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-colors"
        >
          Reset Sliders
        </button>
      </div>
    </div>
  );
}
