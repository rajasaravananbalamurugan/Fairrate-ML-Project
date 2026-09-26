import React from "react";

const DIRECTION_ICONS = {
  positive: { icon: "↑", color: "#f87171", bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.25)" },
  negative: { icon: "↓", color: "#34d399", bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.25)" },
};

export default function ReasonsList({ reasons }) {
  if (!reasons || reasons.length === 0) {
    return (
      <div className="text-sm text-slate-500 text-center py-4">
        SHAP explanations unavailable for this prediction.
      </div>
    );
  }

  return (
    <div className="fade-in-up">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1 h-5 bg-violet-500 rounded-full"></div>
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wide">
          Top Reasons (AI Explanation)
        </h3>
      </div>

      <div className="space-y-3">
        {reasons.map((r, idx) => {
          const style = DIRECTION_ICONS[r.direction] || DIRECTION_ICONS.positive;
          const impactPct = Math.min(Math.abs(r.shap_value) * 20, 100);

          return (
            <div
              key={idx}
              id={`reason-${idx}`}
              className="rounded-xl p-4"
              style={{
                background: style.bg,
                border: `1px solid ${style.border}`,
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="text-xs font-bold px-1.5 py-0.5 rounded"
                      style={{ color: style.color, background: `${style.color}22` }}
                    >
                      #{idx + 1}
                    </span>
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                      {r.label}
                    </span>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed">{r.reason}</p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-lg font-black" style={{ color: style.color }}>
                    {style.icon}{Math.abs(r.shap_value).toFixed(2)}
                  </div>
                  <div className="text-xs text-slate-600">impact</div>
                </div>
              </div>

              {/* Impact bar */}
              <div className="mt-3 h-1 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${impactPct}%`,
                    background: `linear-gradient(to right, ${style.color}88, ${style.color})`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-slate-600 mt-3 text-center">
        Explanations generated using SHAP (SHapley Additive exPlanations)
      </p>
    </div>
  );
}
