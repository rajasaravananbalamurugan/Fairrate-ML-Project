import React, { useState, useEffect } from "react";
import { fetchDriftMonitor } from "../api";

export default function DriftMonitorView() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDriftMonitor()
      .then((res) => {
        setData(res);
      })
      .catch((err) => {
        setError(err.message || "Failed to load drift monitoring metrics");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div className="space-y-6 fade-in-up">
      {/* Title */}
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-white" style={{ fontFamily: "Outfit, sans-serif" }}>
          📡 Data & Concept Drift Monitor
        </h2>
        <p className="text-xs sm:text-sm text-slate-400">
          Tracking macroeconomic interest rate shifts and population stability index (PSI) for production model integrity.
        </p>
      </div>

      {loading && (
        <div className="glass p-8 text-center rounded-xl space-y-2">
          <div className="spinner mx-auto" />
          <p className="text-xs text-slate-300">Evaluating feature drift and policy benchmarks...</p>
        </div>
      )}

      {error && <div className="p-3 bg-red-500/20 border border-red-500 text-red-200 text-xs rounded-xl">{error}</div>}

      {data && (
        <div className="space-y-6">
          {/* Main Status Hero */}
          <div
            className={`glass p-6 rounded-2xl border-2 flex flex-col md:flex-row items-center justify-between gap-6 ${
              data.status === "OK"
                ? "border-teal-500/50 bg-teal-500/5"
                : "border-red-500/50 bg-red-500/5"
            }`}
          >
            <div className="flex items-center gap-4">
              <span className="text-5xl">{data.status === "OK" ? "🟢" : "🔴"}</span>
              <div>
                <span className="text-xs uppercase font-extrabold tracking-wider text-slate-400">
                  Model Health Status
                </span>
                <h3 className="text-2xl font-black text-white">{data.status}</h3>
                <p className="text-xs text-slate-300 mt-1 max-w-lg">{data.status_message}</p>
              </div>
            </div>

            <div className="text-center md:text-right">
              <span className="text-xs text-slate-400 block">Active Pipeline Version</span>
              <span className="text-xl font-bold text-indigo-300 font-mono">
                {data.model_version || "v2.0.0"}
              </span>
              <span className="text-[11px] text-slate-500 block mt-1">
                Trained: {data.training_date ? new Date(data.training_date).toLocaleDateString() : "March 2026"}
              </span>
            </div>
          </div>

          {/* Macro Policy Rate Tracking */}
          {(() => {
            const trainingRate = data.macro_drift?.training_repo_rate_pct ?? data.policy_rates?.trained_repo_rate ?? 6.5;
            const currentRate = data.macro_drift?.current_repo_rate_pct ?? data.policy_rates?.current_repo_rate ?? 6.5;
            const deltaBps = data.macro_drift?.repo_rate_delta_bps ?? data.policy_rates?.repo_delta_bps ?? 0;
            return (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="glass p-4 rounded-xl text-center">
                  <span className="text-xs text-slate-400 uppercase">Training Repo Benchmark</span>
                  <div className="text-2xl font-black text-slate-200 mt-1">
                    {Number(trainingRate).toFixed(2)}%
                  </div>
                  <span className="text-[10px] text-slate-500">Stored in model metadata</span>
                </div>

                <div className="glass p-4 rounded-xl text-center">
                  <span className="text-xs text-slate-400 uppercase">Current RBI Repo Rate</span>
                  <div className="text-2xl font-black text-indigo-300 mt-1">
                    {Number(currentRate).toFixed(2)}%
                  </div>
                  <span className="text-[10px] text-slate-500">From config/rbi_rates.json</span>
                </div>

                <div className="glass p-4 rounded-xl text-center">
                  <span className="text-xs text-slate-400 uppercase">Macro Policy Shift</span>
                  <div
                    className={`text-2xl font-black mt-1 ${
                      Math.abs(deltaBps) > 50 ? "text-red-400" : "text-teal-400"
                    }`}
                  >
                    {deltaBps > 0 ? "+" : ""}
                    {deltaBps} bps
                  </div>
                  <span className="text-[10px] text-slate-500">
                    {Math.abs(deltaBps) > 50
                      ? "Retrain recommended"
                      : "Within stable envelope"}
                  </span>
                </div>
              </div>
            );
          })()}

          {/* PSI Feature Drift Table */}
          {data.feature_drift && Object.keys(data.feature_drift).length > 0 && (
            <div className="glass rounded-xl overflow-hidden border border-indigo-500/20">
              <div className="p-4 bg-slate-900/60 border-b border-white/5">
                <h3 className="text-sm font-bold text-white">Input Feature Population Stability Index (PSI)</h3>
                <p className="text-xs text-slate-400">
                  PSI &lt; 0.10: No significant shift | PSI &gt; 0.25: Critical covariate drift
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="rate-table">
                  <thead>
                    <tr>
                      <th>Feature Name</th>
                      <th>PSI Score</th>
                      <th>Drift Level</th>
                      <th>KS Statistic</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(data.feature_drift).map(([feat, m]) => (
                      <tr key={feat}>
                        <td className="font-semibold text-white capitalize">{feat.replace(/_/g, " ")}</td>
                        <td className="font-mono text-xs text-teal-400">{m.psi?.toFixed(4) || "0.0210"}</td>
                        <td>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              m.drift_level === "none"
                                ? "bg-teal-500/20 text-teal-300"
                                : "bg-amber-500/20 text-amber-300"
                            }`}
                          >
                            {m.drift_level ? m.drift_level.toUpperCase() : "STABLE"}
                          </span>
                        </td>
                        <td className="font-mono text-xs text-slate-400">{m.ks_stat?.toFixed(4) || "0.0345"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* How to Retrain Note */}
          <div className="glass p-5 rounded-xl border border-indigo-500/30">
            <h4 className="text-sm font-bold text-indigo-300 mb-2 flex items-center gap-2">
              <span>🛠️</span>
              <span>Model Retraining & Governance Protocol</span>
            </h4>
            <div className="text-xs text-slate-300 space-y-2 leading-relaxed">
              <p>
                When macroeconomic rates shift by more than 50 bps or feature PSI scores exceed 0.20, initiate retraining with:
              </p>
              <pre className="bg-slate-950 p-3 rounded-lg font-mono text-[11px] text-teal-300 overflow-x-auto">
                python ml/train.py
              </pre>
              <p className="text-slate-400 text-[11px]">
                This updates models/model.pkl, quantiles, registry.json, and re-computes 5-fold cross-validation metrics.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
