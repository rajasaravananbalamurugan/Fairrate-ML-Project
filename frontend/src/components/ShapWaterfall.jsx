import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid,
} from "recharts";

export default function ShapWaterfall({ result }) {
  // Loading skeleton
  if (!result) {
    return (
      <div className="glass rounded-2xl p-6 border border-indigo-500/20 animate-pulse">
        <div className="h-5 w-48 bg-slate-700/60 rounded mb-4" />
        <div className="h-64 bg-slate-800/80 rounded w-full" />
      </div>
    );
  }

  // Error state if waterfall data is missing
  if (!result.waterfall || result.waterfall.length === 0) {
    return (
      <div className="glass rounded-2xl p-5 border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs">
        ℹ️ SHAP waterfall data not available for this prediction.
      </div>
    );
  }

  const { chartData, minY, maxY } = useMemo(() => {
    const baseValue = result.base_value ?? 13.0;
    const finalRate = result.fair_rate;
    const items = result.waterfall || [];

    let current = baseValue;
    let minObserved = Math.min(baseValue, finalRate);
    let maxObserved = Math.max(baseValue, finalRate);

    const data = [];

    // 1. Base Value bar (Grey)
    data.push({
      name: "Base Rate",
      start: 0,
      diff: baseValue,
      color: "#94a3b8", // slate-400 grey
      shap: 0,
      type: "base",
      displayLabel: "Base Rate (Market Average)",
      cumulative: baseValue,
      rawValue: null,
    });

    // 2. Intermediate SHAP factors (ordered most negative to most positive)
    items.forEach((item) => {
      const shap = item.shap_value;
      const displayLabel = item.display_label;
      const rawValue = item.raw_value;

      let start = 0;
      let diff = Math.abs(shap);
      let color = "#22c55e"; // green for negative (rate-lowering)

      if (shap < 0) {
        start = current + shap;
        color = "#22c55e"; // negative SHAP is rate-lowering (favorable)
        current = current + shap;
      } else {
        start = current;
        color = "#ef4444"; // positive SHAP is rate-raising (unfavorable)
        current = current + shap;
      }

      minObserved = Math.min(minObserved, start, current);
      maxObserved = Math.max(maxObserved, start + diff, current);

      data.push({
        name: displayLabel.length > 12 ? displayLabel.slice(0, 11) + "…" : displayLabel,
        start: Math.max(0, start),
        diff: diff,
        color: color,
        shap: shap,
        type: "factor",
        displayLabel: displayLabel,
        cumulative: current,
        rawValue: rawValue,
      });
    });

    // 3. Final Predicted Rate bar (Indigo)
    data.push({
      name: "Fair Rate",
      start: 0,
      diff: finalRate,
      color: "#6366f1", // indigo
      shap: 0,
      type: "final",
      displayLabel: "Final Predicted Fair Rate",
      cumulative: finalRate,
      rawValue: null,
    });

    return {
      chartData: data,
      minY: Math.max(0, Math.floor(minObserved - 1)),
      maxY: Math.ceil(maxObserved + 1),
    };
  }, [result]);

  return (
    <div className="glass rounded-2xl p-6 border border-indigo-500/20 fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">📊</span>
            <h3
              className="text-lg font-bold text-white tracking-wide"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              SHAP Rate Impact Waterfall
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Step-by-step breakdown of how your profile moved the rate from the market baseline
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs self-start sm:self-auto">
          <span className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2.5 h-2.5 rounded-sm bg-green-500 inline-block" /> Lowers Rate
          </span>
          <span className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2.5 h-2.5 rounded-sm bg-red-500 inline-block" /> Raises Rate
          </span>
        </div>
      </div>

      {/* ComposedChart Waterfall */}
      <div className="w-full h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 15, right: 15, left: -10, bottom: 45 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis
              dataKey="name"
              interval={0}
              angle={-30}
              textAnchor="end"
              stroke="#64748b"
              tick={{ fill: "#94a3b8", fontSize: 11 }}
              height={50}
            />
            <YAxis
              domain={[minY, maxY]}
              stroke="#64748b"
              tick={{ fill: "#94a3b8", fontSize: 11 }}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const d = payload[0].payload;

                if (d.type === "base") {
                  return (
                    <div className="bg-slate-900/95 border border-slate-700 p-3 rounded-xl shadow-xl text-xs backdrop-blur-md">
                      <p className="font-bold text-slate-200 mb-1">{d.displayLabel}</p>
                      <p className="text-slate-300">
                        Starting Base Rate: <strong className="text-white">{d.diff.toFixed(2)}%</strong>
                      </p>
                      <p className="text-slate-400 text-[11px] mt-1">Average market interest rate baseline.</p>
                    </div>
                  );
                }

                if (d.type === "final") {
                  return (
                    <div className="bg-slate-900/95 border border-indigo-500/40 p-3 rounded-xl shadow-xl text-xs backdrop-blur-md">
                      <p className="font-bold text-indigo-300 mb-1">{d.displayLabel}</p>
                      <p className="text-slate-200">
                        Result: <strong className="text-indigo-400 text-sm">{d.diff.toFixed(2)}%</strong>
                      </p>
                      <p className="text-slate-400 text-[11px] mt-1">Net predicted rate for your profile.</p>
                    </div>
                  );
                }

                const sign = d.shap > 0 ? "+" : "";
                const impactDirection = d.shap > 0 ? "increased" : "reduced";
                return (
                  <div className="bg-slate-900/95 border border-slate-700 p-3 rounded-xl shadow-xl text-xs backdrop-blur-md">
                    <p className="font-bold text-white mb-1">{d.displayLabel}</p>
                    {d.rawValue && (
                      <p className="text-slate-400 mb-1">
                        Your Value: <span className="text-slate-200 font-semibold">{d.rawValue}</span>
                      </p>
                    )}
                    <p
                      className={`font-semibold ${
                        d.shap < 0 ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      This factor moved your rate by {sign}{d.shap.toFixed(2)}%
                    </p>
                    <p className="text-slate-400 text-[11px] mt-1">
                      Cumulative rate after this factor:{" "}
                      <span className="text-white font-medium">{d.cumulative.toFixed(2)}%</span>
                    </p>
                  </div>
                );
              }}
            />
            {/* Transparent bottom spacer bar for floating segments */}
            <Bar dataKey="start" stackId="waterfall" fill="transparent" isAnimationActive={false} />
            {/* The visible diff bar */}
            <Bar dataKey="diff" stackId="waterfall" radius={[4, 4, 4, 4]}>
              {chartData.map((entry, index) => (
                <Cell key={`wf-cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <p className="text-[11px] text-slate-500 text-center mt-2">
        Hover over any bar to inspect how each specific factor influenced your predicted fair rate.
      </p>
    </div>
  );
}
