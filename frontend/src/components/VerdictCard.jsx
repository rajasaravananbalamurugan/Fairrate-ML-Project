import React from "react";

function VerdictBadge({ verdict, emoji }) {
  const cls =
    verdict === "FAIR" ? "verdict-fair" :
    verdict === "HIGH" ? "verdict-high" : "verdict-red";

  const size = verdict === "RED FLAG" ? "text-3xl" : "text-4xl";

  return (
    <div className={`rounded-2xl p-6 text-center ${cls} mb-6`}>
      <div className="text-6xl mb-3" role="img" aria-label={verdict}>
        {emoji}
      </div>
      <div className={`font-black tracking-widest uppercase ${size}`} style={{ fontFamily: "Outfit, sans-serif" }}>
        {verdict}
      </div>
    </div>
  );
}

function MetricPill({ label, value, color }) {
  return (
    <div className="glass rounded-xl p-4 text-center">
      <div className="text-xs text-slate-500 uppercase tracking-widest mb-1">{label}</div>
      <div className="text-2xl font-black" style={{ color }}>{value}</div>
    </div>
  );
}

export default function VerdictCard({ result }) {
  if (!result) return null;

  const { fair_rate, offered_rate, difference, verdict, verdict_emoji, message, explainer, model_name } = result;

  const diffColor =
    verdict === "FAIR"     ? "#2dd4bf" :
    verdict === "HIGH"     ? "#fbbf24" : "#f87171";

  const diffSign = difference >= 0 ? "+" : "";

  return (
    <div className="fade-in-up">
      {/* ── Big verdict ── */}
      <VerdictBadge verdict={verdict} emoji={verdict_emoji} />

      {/* ── Rate metrics ── */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <MetricPill
          label="Fair Rate"
          value={`${fair_rate.toFixed(2)}%`}
          color="#818cf8"
        />
        <MetricPill
          label="Your Rate"
          value={`${offered_rate.toFixed(2)}%`}
          color="#e2e8f0"
        />
        <MetricPill
          label="Difference"
          value={`${diffSign}${difference.toFixed(2)}%`}
          color={diffColor}
        />
      </div>

      {/* ── Message ── */}
      <div className={`rounded-xl p-4 mb-5 text-sm font-medium ${
        verdict === "FAIR"     ? "bg-emerald-500/10 border border-emerald-500/25 text-emerald-300" :
        verdict === "HIGH"     ? "bg-amber-500/10 border border-amber-500/25 text-amber-300" :
                                 "bg-red-500/10 border border-red-500/25 text-red-300"
      }`}>
        {message}
      </div>

      {/* ── Explainer ── */}
      <div className="glass rounded-xl p-4 mb-6">
        <p className="text-xs uppercase text-slate-500 tracking-widest mb-2 font-semibold">What This Means</p>
        <p className="text-sm text-slate-300 leading-relaxed">{explainer}</p>
      </div>

      {/* ── Model info ── */}
      <div className="flex items-center gap-2 text-xs text-slate-600 mb-1">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block"></span>
        Powered by {model_name}
      </div>
    </div>
  );
}
