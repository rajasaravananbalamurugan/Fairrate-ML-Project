import React from "react";

export default function DashboardHome({
  user,
  formValues,
  result,
  onNavigate,
  onRunCheck,
  loading,
  history = [],
}) {
  const annualSavings = result?.compare?.[0]
    ? Math.max(
        0,
        Math.round(
          ((formValues.offered_rate - result.compare[0].predicted_rate) / 100) *
            formValues.loan_amount_lakh *
            100000
        )
      )
    : 12500;

  return (
    <div className="space-y-6 fade-in-up">
      {/* ── Welcome Banner ── */}
      <div
        className="glass rounded-3xl p-6 sm:p-8 relative overflow-hidden border"
        style={{
          borderColor: "rgba(99,102,241,0.25)",
          background:
            "linear-gradient(135deg, rgba(14,23,41,0.85) 0%, rgba(30,27,75,0.4) 100%)",
        }}
      >
        <div
          className="absolute -right-10 -bottom-10 w-60 h-60 rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)",
          }}
        />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-3 bg-indigo-500/15 border border-indigo-500/30 text-indigo-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Live Engine • Gradient Boosting Regressor</span>
            </div>

            <h1
              className="text-2xl sm:text-3xl font-black text-white tracking-tight"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              Welcome back,{" "}
              <span className="gradient-text">{user?.name || "Borrower"}</span> 👋
            </h1>

            <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-xl leading-relaxed">
              Your AI Loan Rate Fairness Dashboard is ready. Monitor real-time bank benchmark rates,
              simulate profile improvements, and ensure your lender isn't overcharging you.
            </p>
          </div>

          {/* Quick Primary Actions */}
          <div className="flex items-center gap-3 flex-wrap shrink-0">
            <button
              onClick={onRunCheck}
              disabled={loading}
              className="btn-primary px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-lg shadow-indigo-600/30 cursor-pointer flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-transform"
            >
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>Evaluating...</span>
                </>
              ) : (
                <>
                  <span>⚡</span>
                  <span>Evaluate Current Offer</span>
                </>
              )}
            </button>

            <button
              onClick={() => onNavigate("profile")}
              className="px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700/80 cursor-pointer flex items-center gap-1.5 transition-colors"
            >
              <span>📋</span>
              <span>Edit Profile</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Key Metrics Overview Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Loan Profile */}
        <div className="glass rounded-2xl p-4 sm:p-5 border border-indigo-500/15 hover:border-indigo-500/30 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Active Offer</span>
            <span className="text-xs px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-300 font-semibold capitalize">
              {formValues.loan_type}
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-white mb-1" style={{ fontFamily: "Outfit, sans-serif" }}>
            {formValues.offered_rate}%
          </div>
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <span className="font-semibold text-slate-300">{formValues.bank}</span>
            <span>•</span>
            <span>₹{formValues.loan_amount_lakh} Lakhs ({formValues.tenure_years}Y)</span>
          </div>
        </div>

        {/* Card 2: Fair Rate Estimate */}
        <div className="glass rounded-2xl p-4 sm:p-5 border border-indigo-500/15 hover:border-indigo-500/30 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>ML Fair Rate</span>
            {result ? (
              <span className="text-xs px-2 py-0.5 rounded-md font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {result.verdict_emoji} {result.verdict}
              </span>
            ) : (
              <span className="text-xs px-2 py-0.5 rounded-md bg-slate-800 text-slate-400">Ready</span>
            )}
          </div>
          <div className="text-xl sm:text-2xl font-black text-white mb-1" style={{ fontFamily: "Outfit, sans-serif" }}>
            {result ? `${result.fair_rate}%` : "— —"}
          </div>
          <div className="text-xs text-slate-400">
            {result ? (
              <span>
                Spread: <strong className={result.difference <= 0 ? "text-emerald-400" : "text-amber-400"}>{result.difference > 0 ? `+${result.difference}%` : `${result.difference}%`}</strong> vs offer
              </span>
            ) : (
              <span>Click Evaluate to calculate</span>
            )}
          </div>
        </div>

        {/* Card 3: Potential Annual Savings */}
        <div className="glass rounded-2xl p-4 sm:p-5 border border-indigo-500/15 hover:border-indigo-500/30 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Market Arbitrage</span>
            <span className="text-xs px-2 py-0.5 rounded-md bg-teal-500/15 text-teal-300 font-semibold">
              5 Lenders
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-teal-400 mb-1" style={{ fontFamily: "Outfit, sans-serif" }}>
            {result ? `₹${annualSavings.toLocaleString("en-IN")}` : "Up to ₹25,000"}
          </div>
          <div className="text-xs text-slate-400">
            {result ? "Estimated yearly savings vs worst" : "Based on competitive spreads"}
          </div>
        </div>

        {/* Card 4: Credit Score Rating */}
        <div className="glass rounded-2xl p-4 sm:p-5 border border-indigo-500/15 hover:border-indigo-500/30 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>CIBIL Score</span>
            <span className="text-xs px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-300 font-semibold">
              {formValues.credit_score >= 750 ? "Prime Tier" : formValues.credit_score >= 680 ? "Good Tier" : "Fair Tier"}
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-indigo-300 mb-1" style={{ fontFamily: "Outfit, sans-serif" }}>
            {formValues.credit_score}
          </div>
          <div className="text-xs text-slate-400">
            {formValues.employment_type} • ₹{formValues.annual_income_lakh}L/yr
          </div>
        </div>
      </div>

      {/* ── Direct Launch Modules Grid ── */}
      <div>
        <div className="flex items-center justify-between mb-4 px-1">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight" style={{ fontFamily: "Outfit, sans-serif" }}>
              Analytics & Decision Modules
            </h2>
            <p className="text-xs text-slate-400">Select any tool to dive deeper into your loan parameters.</p>
          </div>
          <button
            onClick={() => onNavigate("all")}
            className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer flex items-center gap-1"
          >
            <span>🌟</span>
            <span>View All-in-One Dashboard →</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Module 1: Rate Verdict */}
          <div
            onClick={() => onNavigate("verdict")}
            className="glass rounded-2xl p-5 border border-white/[0.08] hover:border-indigo-500/50 hover:bg-slate-900/60 transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                  ⚖️
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  ML Verdict
                </span>
              </div>
              <h3 className="text-sm font-bold text-white mb-1 group-hover:text-indigo-300 transition-colors">
                Rate Verdict & PDF Report
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Fairness badge, 95% confidence interval, and exportable financial certificate.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-indigo-400 font-semibold">
              <span>Inspect Verdict</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </div>

          {/* Module 2: SHAP Waterfall */}
          <div
            onClick={() => onNavigate("waterfall")}
            className="glass rounded-2xl p-5 border border-white/[0.08] hover:border-indigo-500/50 hover:bg-slate-900/60 transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                  🌊
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Explainability
                </span>
              </div>
              <h3 className="text-sm font-bold text-white mb-1 group-hover:text-cyan-300 transition-colors">
                SHAP Waterfall Breakdown
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                See exactly how your credit score, LTV, and loan type push your interest rate up or down.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-cyan-400 font-semibold">
              <span>Explore Drivers</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </div>

          {/* Module 3: Bank Comparison */}
          <div
            onClick={() => onNavigate("compare")}
            className="glass rounded-2xl p-5 border border-white/[0.08] hover:border-indigo-500/50 hover:bg-slate-900/60 transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500/20 to-emerald-500/20 border border-teal-500/30 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                  🏦
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  5 Lenders
                </span>
              </div>
              <h3 className="text-sm font-bold text-white mb-1 group-hover:text-teal-300 transition-colors">
                Multi-Bank Rate Comparison
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Side-by-side rates from SBI, HDFC, ICICI, Axis, and Kotak with potential savings.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-teal-400 font-semibold">
              <span>Compare Banks</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </div>

          {/* Module 4: What-If Simulator */}
          <div
            onClick={() => onNavigate("simulator")}
            className="glass rounded-2xl p-5 border border-white/[0.08] hover:border-indigo-500/50 hover:bg-slate-900/60 transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                  🎛️
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Interactive
                </span>
              </div>
              <h3 className="text-sm font-bold text-white mb-1 group-hover:text-amber-300 transition-colors">
                What-If Profile Simulator
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Move interactive sliders to discover how higher credit or lower LTV slashes interest.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-amber-400 font-semibold">
              <span>Open Simulator</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </div>

          {/* Module 5: EMI vs Tenure */}
          <div
            onClick={() => onNavigate("emi")}
            className="glass rounded-2xl p-5 border border-white/[0.08] hover:border-indigo-500/50 hover:bg-slate-900/60 transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-pink-500/30 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                  📈
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30">
                  1–30 Yrs
                </span>
              </div>
              <h3 className="text-sm font-bold text-white mb-1 group-hover:text-pink-300 transition-colors">
                EMI vs Tenure Trajectory
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Full 30-year repayment line chart comparing fair rate payments vs offered bank rate.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-pink-400 font-semibold">
              <span>Analyze Curve</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </div>

          {/* Module 6: Recent Checks */}
          <div
            onClick={() => onNavigate("history")}
            className="glass rounded-2xl p-5 border border-white/[0.08] hover:border-indigo-500/50 hover:bg-slate-900/60 transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                  📜
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {history.length} Queries
                </span>
              </div>
              <h3 className="text-sm font-bold text-white mb-1 group-hover:text-indigo-300 transition-colors">
                Recent Inquiries History
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Locally stored historical checks with one-click re-runs and parameter comparison.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-indigo-400 font-semibold">
              <span>View History</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Active Analysis Highlight (if result is available) ── */}
      {result && (
        <div className="glass rounded-2xl p-6 border border-indigo-500/20 bg-slate-900/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{result.verdict_emoji}</span>
              <div>
                <h3 className="text-base font-bold text-white" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Active Analysis Summary: {result.verdict} Deal
                </h3>
                <p className="text-xs text-slate-400">
                  Fair rate estimate is {result.fair_rate}% compared to {result.offered_rate}% offered by {formValues.bank}.
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigate("all")}
              className="text-xs px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all cursor-pointer whitespace-nowrap"
            >
              Open Full Suite →
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {result.top_reasons?.slice(0, 3).map((r) => (
              <div key={r.feature} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-200">{r.label}</span>
                  <span
                    className={`text-xs font-mono font-bold ${
                      r.shap_value < 0 ? "text-teal-400" : "text-rose-400"
                    }`}
                  >
                    {r.shap_value > 0 ? `+${r.shap_value.toFixed(2)}%` : `${r.shap_value.toFixed(2)}%`}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">{r.reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
