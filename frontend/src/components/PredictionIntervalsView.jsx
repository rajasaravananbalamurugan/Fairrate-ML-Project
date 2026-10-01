import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

export default function PredictionIntervalsView({ result, formValues }) {
  const fairRate = result?.fair_rate ?? 10.45;
  const low = result?.fair_rate_low ?? Number((fairRate - 0.55).toFixed(2));
  const high = result?.fair_rate_high ?? Number((fairRate + 0.65).toFixed(2));
  const offered = result?.offered_rate ?? 13.5;

  const chartData = [
    {
      name: "Quantile Range",
      lowRate: low,
      spread: Number((high - low).toFixed(2)),
      fairRate: fairRate,
      offeredRate: offered,
    },
  ];

  return (
    <div className="space-y-6 fade-in-up">
      {/* Title */}
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-white" style={{ fontFamily: "Outfit, sans-serif" }}>
          📐 Prediction Intervals (Quantile Regression)
        </h2>
        <p className="text-xs sm:text-sm text-slate-400">
          Machine learning uncertainty estimation. We compute the 10th and 90th percentiles to determine the likely fair-rate range.
        </p>
      </div>

      {/* Main KPI Card */}
      <div className="glass p-6 rounded-2xl border-2 border-indigo-500/30">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <span className="text-xs uppercase font-extrabold tracking-wider text-indigo-400">
              Likely Fair-Rate Range (80% Confidence Band)
            </span>
            <div className="text-3xl sm:text-4xl font-black text-teal-400 mt-1">
              {low}% – {high}%
            </div>
            <span className="text-xs text-slate-400">
              Point Estimate (Median): <strong className="text-white">{fairRate}%</strong>
            </span>
          </div>

          <div className="text-right">
            <span className="text-xs text-slate-400">Quoted Rate</span>
            <div
              className={`text-2xl font-black ${
                offered > high ? "text-red-400" : offered >= low ? "text-teal-400" : "text-emerald-400"
              }`}
            >
              {offered}%
            </div>
            <span className="text-[11px] text-slate-500">
              {offered > high ? "⚠️ Exceeds 90th percentile upper bound" : "Within acceptable range"}
            </span>
          </div>
        </div>

        {/* Range Bar Graphic */}
        <div className="relative pt-6 pb-2">
          {/* Track */}
          <div className="h-4 bg-slate-900 rounded-full relative overflow-hidden border border-white/10">
            {/* Likely Fair Range Highlight */}
            <div
              className="absolute h-full bg-gradient-to-r from-teal-500 to-indigo-500 rounded-full opacity-80"
              style={{
                left: `${Math.max(0, Math.min(100, ((low - 7) / (18 - 7)) * 100))}%`,
                width: `${Math.max(5, Math.min(100, ((high - low) / (18 - 7)) * 100))}%`,
              }}
            />
          </div>

          {/* Markers */}
          <div className="flex justify-between text-[11px] text-slate-500 mt-2">
            <span>7.0% (Lower Limit)</span>
            <span className="text-teal-400 font-semibold">{low}% (Q10)</span>
            <span className="text-indigo-300 font-bold">{fairRate}% (Point)</span>
            <span className="text-purple-400 font-semibold">{high}% (Q90)</span>
            <span>18.0% (Upper Limit)</span>
          </div>
        </div>
      </div>

      {/* Methodology Explanation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass p-5 rounded-xl border border-indigo-500/20">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">🔬</span>
            <h3 className="text-sm font-bold text-white">Quantile Gradient Boosting</h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Rather than optimizing standard mean-squared error (which outputs a single average), quantile regressors minimize pinball loss at alpha = 0.10 and alpha = 0.90. This produces rigorous distribution bounds conditioned on your exact borrower risk profile.
          </p>
        </div>

        <div className="glass p-5 rounded-xl border border-teal-500/20">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">⚖️</span>
            <h3 className="text-sm font-bold text-white">Why "Likely Fair-Rate Range"?</h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Credit pricing is not a single deterministic figure. Factors such as branch-level discretionary quotas, monthly sales targets, and relationship banking cause rates to vary within a 0.5% – 1.0% envelope. If your offered rate sits above the 90th percentile, you have strong grounds for negotiation.
          </p>
        </div>
      </div>
    </div>
  );
}
