import React, { useState, useEffect } from "react";
import { planRepoScenario } from "../api";

export default function RepoSimulator({ formValues }) {
  const [principalLakh, setPrincipalLakh] = useState(formValues?.loan_amount_lakh || 40);
  const [currentRatePct, setCurrentRatePct] = useState(formValues?.offered_rate || 8.75);
  const [tenureYears, setTenureYears] = useState(formValues?.tenure_years || 20);
  const [customBps, setCustomBps] = useState(25);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const calculate = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await planRepoScenario({
        principal_lakh: Number(principalLakh),
        current_rate_pct: Number(currentRatePct),
        tenure_years: Number(tenureYears),
        current_repo_rate_pct: 6.50,
      });
      setResult(data);
    } catch (err) {
      setError(err?.response?.data?.detail || err.message || "Failed to simulate repo scenarios");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    calculate();
  }, [principalLakh, currentRatePct, tenureYears]);

  const formatINR = (val) => "₹" + Math.round(val || 0).toLocaleString("en-IN");

  return (
    <div className="space-y-6 fade-in-up">
      {/* Title */}
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-white" style={{ fontFamily: "Outfit, sans-serif" }}>
          🏦 Repo-Linked Lending Rate (EBLR) Simulator
        </h2>
        <p className="text-xs sm:text-sm text-slate-400">
          In RBI's External Benchmark Lending Rate (EBLR) regime, floating rate home loans track the RBI Repo Rate.
        </p>
      </div>

      {/* Input Parameters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass p-4 rounded-xl">
          <label className="text-xs text-slate-400 block mb-1">Loan Principal</label>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-400">₹</span>
            <input
              type="number"
              step="1"
              min="5"
              value={principalLakh}
              onChange={(e) => setPrincipalLakh(Number(e.target.value))}
              className="form-input text-sm"
            />
            <span className="text-xs text-slate-500">Lakh</span>
          </div>
        </div>

        <div className="glass p-4 rounded-xl">
          <label className="text-xs text-slate-400 block mb-1">Current Effective Rate (% p.a.)</label>
          <input
            type="number"
            step="0.05"
            min="6.5"
            max="18"
            value={currentRatePct}
            onChange={(e) => setCurrentRatePct(Number(e.target.value))}
            className="form-input text-sm"
          />
        </div>

        <div className="glass p-4 rounded-xl">
          <label className="text-xs text-slate-400 block mb-1">Tenure (Years)</label>
          <input
            type="number"
            min="1"
            max="30"
            value={tenureYears}
            onChange={(e) => setTenureYears(Number(e.target.value))}
            className="form-input text-sm"
          />
        </div>
      </div>

      {error && <div className="p-3 bg-red-500/20 border border-red-500 text-red-200 text-xs rounded-xl">{error}</div>}

      {/* Scenarios Table */}
      {result && (
        <div className="space-y-6">
          <div className="glass rounded-xl overflow-hidden border border-indigo-500/20">
            <div className="p-4 bg-slate-900/60 border-b border-white/5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white">RBI Monetary Policy Sensitivity Matrix</h3>
                <p className="text-xs text-slate-400">
                  Current Repo Rate: <span className="text-indigo-400 font-bold">6.50%</span> • Bank Spread:{" "}
                  <span className="text-teal-400 font-bold">{result.bank_spread_pct.toFixed(2)}%</span>
                </p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 font-mono">
                Model: Rate = Repo + Spread
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="rate-table">
                <thead>
                  <tr>
                    <th>Repo Shift</th>
                    <th>New Policy Rate</th>
                    <th>Borrower Rate</th>
                    <th>New Monthly EMI</th>
                    <th>EMI Change</th>
                    <th>Tenure If Fixed EMI</th>
                  </tr>
                </thead>
                <tbody>
                  {result.scenarios?.map((row) => {
                    const isBase = row.delta_bps === 0;
                    const isHike = row.delta_bps > 0;
                    return (
                      <tr
                        key={row.delta_bps}
                        className={isBase ? "bg-indigo-500/10 font-bold" : ""}
                      >
                        <td className="font-mono">
                          <span
                            className={`px-2 py-0.5 rounded text-xs ${
                              isBase
                                ? "bg-slate-700 text-slate-300"
                                : isHike
                                ? "bg-red-500/20 text-red-300"
                                : "bg-teal-500/20 text-teal-300"
                            }`}
                          >
                            {row.delta_bps > 0 ? `+${row.delta_bps}` : row.delta_bps} bps
                          </span>
                        </td>
                        <td className="text-slate-300">{row.new_repo_pct.toFixed(2)}%</td>
                        <td className="font-bold text-white">{row.new_rate_pct.toFixed(2)}%</td>
                        <td className="font-semibold text-slate-200">{formatINR(row.new_emi)}</td>
                        <td>
                          {isBase ? (
                            <span className="text-slate-500">—</span>
                          ) : (
                            <span className={isHike ? "text-red-400 font-bold" : "text-teal-400 font-bold"}>
                              {isHike ? `+${formatINR(row.emi_diff)}` : formatINR(row.emi_diff)}
                            </span>
                          )}
                        </td>
                        <td className="text-slate-300">
                          {isBase
                            ? `${tenureYears} Years`
                            : `${row.new_tenure_years_if_fixed_emi} Yrs (${
                                row.tenure_months_diff > 0 ? `+${row.tenure_months_diff}` : row.tenure_months_diff
                              } mos)`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Fixed vs Floating Comparison Guide */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="glass p-5 rounded-xl border border-indigo-500/20">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">🌊</span>
                <h4 className="text-sm font-bold text-indigo-300">Floating (Repo-Linked) Loans</h4>
              </div>
              <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
                <li>Rate resets automatically within 3 months of RBI repo rate changes.</li>
                <li>Zero prepayment penalties mandated by RBI for individual borrowers.</li>
                <li>Best when the monetary cycle is at or near its peak (potential rate cuts ahead).</li>
              </ul>
            </div>

            <div className="glass p-5 rounded-xl border border-purple-500/20">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">🔒</span>
                <h4 className="text-sm font-bold text-purple-300">Fixed Rate Loans</h4>
              </div>
              <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
                <li>Fixed rate predictability protects against steep inflationary hikes.</li>
                <li>Typically priced 1.5% to 2.5% higher than floating benchmark rates.</li>
                <li>Often subject to 2% to 4% foreclosure / prepayment charges.</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
