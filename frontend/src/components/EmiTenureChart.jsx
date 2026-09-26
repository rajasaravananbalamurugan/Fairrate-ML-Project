import React, { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

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

export default function EmiTenureChart({ result, formValues }) {
  const [isOpen, setIsOpen] = useState(true);

  const loanAmount = formValues?.loan_amount_lakh ?? 5;
  const fairRate = result?.fair_rate ?? 12.0;
  const offeredRate = result?.offered_rate ?? formValues?.offered_rate ?? 13.5;
  const currentTenure = formValues?.tenure_years ?? 3;

  // Generate dataset for tenures 1 to 30 years
  const { data, minEmi, maxEmi } = useMemo(() => {
    const rows = [];
    let minVal = Infinity;
    let maxVal = -Infinity;

    for (let t = 1; t <= 30; t++) {
      const fairEmi = Math.round(calculateEmi(loanAmount, fairRate, t));
      const offeredEmi = Math.round(calculateEmi(loanAmount, offeredRate, t));
      const extraPerMonth = Math.max(0, offeredEmi - fairEmi);
      const totalExtra = extraPerMonth * t * 12;

      minVal = Math.min(minVal, fairEmi, offeredEmi);
      maxVal = Math.max(maxVal, fairEmi, offeredEmi);

      rows.push({
        tenure: t,
        fairEmi,
        offeredEmi,
        extraPerMonth,
        totalExtra,
      });
    }

    return {
      data: rows,
      minEmi: Math.max(0, minVal),
      maxEmi: maxVal,
    };
  }, [loanAmount, fairRate, offeredRate]);

  // Loading skeleton
  if (!result) {
    return (
      <div className="glass rounded-2xl p-6 border border-indigo-500/20 animate-pulse">
        <div className="h-6 w-56 bg-slate-700/60 rounded mb-4" />
        <div className="h-64 bg-slate-800/80 rounded w-full" />
      </div>
    );
  }

  // Current tenure comparison for highlight
  const currentFairEmi = Math.round(calculateEmi(loanAmount, fairRate, currentTenure));
  const currentOfferedEmi = Math.round(calculateEmi(loanAmount, offeredRate, currentTenure));
  const currentMonthlyExtra = Math.max(0, currentOfferedEmi - currentFairEmi);

  return (
    <div className="glass rounded-2xl border border-indigo-500/20 overflow-hidden fade-in-up">
      {/* Collapsible Header */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full p-5 flex items-center justify-between text-left hover:bg-slate-800/30 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-xl">📈</span>
          <div>
            <h3
              className="text-base sm:text-lg font-bold text-white tracking-wide"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              See how tenure affects your EMI
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Compare Fair Rate vs Offered Rate monthly repayments across 1 to 30 years
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {currentMonthlyExtra > 0 && (
            <span className="hidden md:inline-flex items-center px-2.5 py-1 rounded-lg bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-semibold">
              +{formatINR(currentMonthlyExtra)}/mo at {currentTenure} yrs
            </span>
          )}
          <span className="text-slate-400 text-lg transform transition-transform duration-200">
            {isOpen ? "▲" : "▼"}
          </span>
        </div>
      </button>

      {/* Collapsible Content */}
      {isOpen && (
        <div className="p-6 pt-0 border-t border-slate-800/60">
          <div className="flex flex-wrap items-center justify-between gap-3 my-4 text-xs">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-3 h-1 bg-green-500 rounded-full inline-block" /> Fair Rate EMI ({fairRate.toFixed(2)}%)
              </span>
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-3 h-1 bg-red-500 rounded-full inline-block" /> Your Offered EMI ({offeredRate.toFixed(2)}%)
              </span>
            </div>
            <div className="text-slate-400 text-[11px]">
              Principal: <strong className="text-white">₹{loanAmount} Lakhs</strong>
            </div>
          </div>

          {/* Recharts ComposedChart with Area Shading and Lines */}
          <div className="w-full h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 15, right: 20, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="tenure"
                  stroke="#64748b"
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  tickFormatter={(v) => `${v}y`}
                  label={{
                    value: "Tenure (Years)",
                    position: "insideBottom",
                    offset: -12,
                    fill: "#64748b",
                    fontSize: 11,
                  }}
                />
                <YAxis
                  stroke="#64748b"
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  tickFormatter={(v) => `₹${Math.round(v / 1000)}k`}
                  width={55}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="bg-slate-900/95 border border-slate-700 p-3.5 rounded-xl shadow-xl text-xs backdrop-blur-md">
                        <p className="font-bold text-white mb-2 pb-1 border-b border-slate-800">
                          Tenure: {d.tenure} {d.tenure === 1 ? "Year" : "Years"} ({d.tenure * 12} EMIs)
                        </p>
                        <div className="space-y-1 text-slate-300">
                          <p className="flex justify-between gap-4">
                            <span className="text-green-400">Fair Rate EMI:</span>
                            <span className="font-semibold text-white">{formatINR(d.fairEmi)}/mo</span>
                          </p>
                          <p className="flex justify-between gap-4">
                            <span className="text-red-400">Your Offered EMI:</span>
                            <span className="font-semibold text-white">{formatINR(d.offeredEmi)}/mo</span>
                          </p>
                        </div>
                        {d.extraPerMonth > 0 ? (
                          <div className="mt-2.5 pt-2 border-t border-slate-800 text-red-300 font-semibold leading-relaxed">
                            At {d.tenure} years — you pay {formatINR(d.extraPerMonth)} extra per month ({formatINR(d.totalExtra)} total extra)
                          </div>
                        ) : (
                          <div className="mt-2.5 pt-2 border-t border-slate-800 text-emerald-300 font-semibold">
                            Offered rate matches or beats fair benchmark.
                          </div>
                        )}
                      </div>
                    );
                  }}
                />
                {/* Under/over shaded area between offered and baseline */}
                <Area
                  type="monotone"
                  dataKey="offeredEmi"
                  fill="#ef4444"
                  fillOpacity={0.15}
                  stroke="none"
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="fairEmi"
                  fill="#080f1e"
                  fillOpacity={0.9}
                  stroke="none"
                  isAnimationActive={false}
                />
                {/* Two distinct curves */}
                <Line
                  type="monotone"
                  dataKey="fairEmi"
                  stroke="#22c55e"
                  strokeWidth={2.5}
                  dot={false}
                  name="Fair Rate EMI"
                />
                <Line
                  type="monotone"
                  dataKey="offeredEmi"
                  stroke="#ef4444"
                  strokeWidth={2.5}
                  dot={false}
                  name="Your Offered EMI"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
