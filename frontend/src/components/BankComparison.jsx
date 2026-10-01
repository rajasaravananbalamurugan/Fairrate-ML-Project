import React, { useState, useEffect, useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ReferenceLine,
} from "recharts";
import { fetchBankComparison } from "../api";

function calculateEmi(principal, annualRatePct, tenureYears) {
  if (!principal || !annualRatePct || !tenureYears) return 0;
  const p = principal * 100000;
  const r = annualRatePct / (12 * 100);
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

export default function BankComparison({ result, formValues }) {
  const [data, setData] = useState(result?.compare || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const offeredRate = result?.offered_rate ?? formValues?.offered_rate ?? 0;
  const loanAmount = formValues?.loan_amount_lakh ?? 5;
  const tenureYears = formValues?.tenure_years ?? 3;

  useEffect(() => {
    if (result?.compare && result.compare.length > 0) {
      setData(result.compare);
      setError(null);
      return;
    }

    if (!formValues && !result) return;

    setLoading(true);
    setError(null);
    const params = {
      loan_type: formValues?.loan_type || result?.loan_type || "personal",
      credit_score: formValues?.credit_score ?? 720,
      annual_income_lakh: formValues?.annual_income_lakh ?? 12,
      employment_type: formValues?.employment_type || "salaried",
      loan_amount_lakh: loanAmount,
      tenure_years: tenureYears,
      offered_rate: offeredRate,
      ltv_ratio: formValues?.ltv_ratio ?? null,
      existing_obligations_pct: formValues?.existing_obligations_pct ?? 20,
    };

    fetchBankComparison(params)
      .then((res) => {
        setData(res);
      })
      .catch((err) => {
        setError(err?.response?.data?.detail || err.message || "Failed to compare banks.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [result, formValues, offeredRate, loanAmount, tenureYears]);

  const bestBank = useMemo(() => {
    if (!data || data.length === 0) return null;
    return [...data].sort((a, b) => a.predicted_rate - b.predicted_rate)[0];
  }, [data]);

  const monthlySavings = useMemo(() => {
    if (!bestBank || !offeredRate) return 0;
    const offeredEmi = calculateEmi(loanAmount, offeredRate, tenureYears);
    const bestEmi = calculateEmi(loanAmount, bestBank.predicted_rate, tenureYears);
    return Math.max(0, Math.round(offeredEmi - bestEmi));
  }, [bestBank, offeredRate, loanAmount, tenureYears]);

  // Loading skeleton
  if (loading) {
    return (
      <div className="glass rounded-2xl p-6 border border-indigo-500/20 animate-pulse">
        <div className="h-5 w-48 bg-slate-700/60 rounded mb-4" />
        <div className="space-y-3">
          <div className="h-8 bg-slate-800/80 rounded w-full" />
          <div className="h-8 bg-slate-800/80 rounded w-5/6" />
          <div className="h-8 bg-slate-800/80 rounded w-4/6" />
          <div className="h-8 bg-slate-800/80 rounded w-3/4" />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="glass rounded-2xl p-5 border border-red-500/30 bg-red-500/10 text-red-300 text-sm">
        <p className="font-semibold mb-1">⚠️ Bank Comparison Error</p>
        <p className="text-xs text-red-400">{error}</p>
      </div>
    );
  }

  // If no data
  if (!data || data.length === 0) {
    return null;
  }

  const sortedData = [...data].sort((a, b) => a.predicted_rate - b.predicted_rate);
  const minRate = sortedData[0]?.predicted_rate || 0;
  const maxRate = sortedData[sortedData.length - 1]?.predicted_rate || 0;

  const getBarColor = (index, total) => {
    if (index === 0) return "#22c55e"; // Lowest rate = green
    if (index === total - 1) return "#ef4444"; // Highest rate = red
    return "#eab308"; // Middle = yellow
  };

  return (
    <div className="glass rounded-2xl p-6 border border-indigo-500/20 fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🏦</span>
            <h3
              className="text-lg font-bold text-white tracking-wide"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              Multi-Bank Fair Rate Comparison
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Predicted interest rate for your financial profile across top Indian lenders
          </p>
        </div>

        {bestBank && monthlySavings > 0 && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold self-start sm:self-auto">
            <span>🎉 Best Deal: <strong>{bestBank.bank}</strong></span>
            <span className="text-emerald-400 font-bold">
              ({formatINR(monthlySavings)}/month cheaper than your offer)
            </span>
          </div>
        )}
      </div>

      {/* Recharts Horizontal Bar Chart with dynamic height for all 11 lenders */}
      <div className="w-full" style={{ height: `${Math.max(260, sortedData.length * 32 + 50)}px` }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={sortedData}
            margin={{ top: 15, right: 35, left: 10, bottom: 5 }}
          >
            <XAxis
              type="number"
              domain={[Math.floor(minRate - 1), Math.ceil(Math.max(maxRate, offeredRate) + 1)]}
              stroke="#64748b"
              tick={{ fill: "#94a3b8", fontSize: 11 }}
              tickFormatter={(v) => `${v}%`}
            />
            <YAxis
              type="category"
              dataKey="bank"
              stroke="#64748b"
              tick={{ fill: "#f1f5f9", fontWeight: 600, fontSize: 13 }}
              width={55}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const d = payload[0].payload;
                const emi = calculateEmi(loanAmount, d.predicted_rate, tenureYears);
                return (
                  <div className="bg-slate-900/95 border border-slate-700/80 p-3 rounded-xl shadow-xl text-xs backdrop-blur-md">
                    <p className="font-bold text-white text-sm mb-1">{d.bank} Bank</p>
                    <p className="text-slate-300">
                      Fair Rate: <strong className="text-indigo-300">{d.predicted_rate.toFixed(2)}%</strong>
                    </p>
                    <p className="text-slate-400 mt-0.5">
                      Estimated EMI: <span className="text-white">{formatINR(Math.round(emi))}/mo</span>
                    </p>
                    {d.savings_vs_worst > 0 && (
                      <p className="text-emerald-400 mt-1 font-medium">
                        {d.savings_vs_worst}% lower than worst lender
                      </p>
                    )}
                    <span
                      className={`inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        d.verdict_if_offered_here === "FAIR"
                          ? "bg-emerald-500/20 text-emerald-300"
                          : d.verdict_if_offered_here === "HIGH"
                          ? "bg-amber-500/20 text-amber-300"
                          : "bg-red-500/20 text-red-300"
                      }`}
                    >
                      {d.verdict_if_offered_here} vs your offer
                    </span>
                  </div>
                );
              }}
            />
            {offeredRate > 0 && (
              <ReferenceLine
                x={offeredRate}
                stroke="#ef4444"
                strokeDasharray="4 4"
                strokeWidth={2}
                label={{
                  value: `Your Offer: ${offeredRate}%`,
                  fill: "#f87171",
                  position: "top",
                  fontSize: 11,
                  fontWeight: 600,
                }}
              />
            )}
            <Bar dataKey="predicted_rate" radius={[0, 6, 6, 0]} barSize={22}>
              {sortedData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(index, sortedData.length)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend & Summary Info */}
      <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-700/50 mt-2 gap-2">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-green-500 inline-block" /> Lowest Rate
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-yellow-500 inline-block" /> Competitive
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-red-500 inline-block" /> Highest Rate
          </span>
        </div>
        {bestBank && (
          <div className="text-slate-300">
            Cheapest lender: <strong className="text-emerald-400">{bestBank.bank}</strong> at{" "}
            <strong>{bestBank.predicted_rate}%</strong>
          </div>
        )}
      </div>
    </div>
  );
}
