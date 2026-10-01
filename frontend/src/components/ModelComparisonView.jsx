import React, { useState, useEffect } from "react";
import { fetchModelComparison } from "../api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export default function ModelComparisonView() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchModelComparison()
      .then((res) => {
        setData(res);
      })
      .catch((err) => {
        setError(err.message || "Failed to load model comparison metrics");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const modelsList = Array.isArray(data?.models)
    ? data.models.map((m) => ({
        name: m.model_name || m.name || "Model",
        rmse: m.rmse,
        mae: m.mae,
        r2: m.r2,
        cv_std: m.rmse_std ?? m.cv_rmse_std ?? 0,
        time_sec: m.training_time_sec ?? 0,
      }))
    : data?.models
    ? Object.entries(data.models).map(([name, m]) => ({
        name: m.model_name || name,
        rmse: m.rmse,
        mae: m.mae,
        r2: m.r2,
        cv_std: m.rmse_std ?? m.cv_rmse_std ?? 0,
        time_sec: m.training_time_sec ?? 0,
      }))
    : [];

  const featureImportance = data?.feature_importances || [];

  return (
    <div className="space-y-6 fade-in-up">
      {/* Title */}
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-white" style={{ fontFamily: "Outfit, sans-serif" }}>
          🔬 5-Fold Cross-Validation Model Benchmark
        </h2>
        <p className="text-xs sm:text-sm text-slate-400">
          Rigorous out-of-fold comparison across Gradient Boosting, Random Forest, and optional gradient boosted trees.
        </p>
      </div>

      {loading && (
        <div className="glass p-8 text-center rounded-xl space-y-2">
          <div className="spinner mx-auto" />
          <p className="text-xs text-slate-300">Loading cross-validation metrics...</p>
        </div>
      )}

      {error && <div className="p-3 bg-red-500/20 border border-red-500 text-red-200 text-xs rounded-xl">{error}</div>}

      {data && (
        <div className="space-y-6">
          {/* Comparison Table */}
          <div className="glass rounded-xl overflow-hidden border border-indigo-500/20">
            <div className="p-4 bg-slate-900/60 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">5-Fold CV Model Benchmark</h3>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-mono">
                Production Model: {data.best_model}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="rate-table">
                <thead>
                  <tr>
                    <th>Algorithm</th>
                    <th>RMSE (%)</th>
                    <th>MAE (%)</th>
                    <th>R² Score</th>
                    <th>CV Std Dev</th>
                    <th>Training Time</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {modelsList.map((m) => {
                    const isBest = m.name === data.best_model;
                    return (
                      <tr key={m.name} className={isBest ? "bg-indigo-500/10 font-bold" : ""}>
                        <td className="text-white font-bold">{m.name}</td>
                        <td className="font-mono text-teal-400">{m.rmse.toFixed(4)}%</td>
                        <td className="font-mono text-indigo-300">{m.mae.toFixed(4)}%</td>
                        <td className="font-mono text-emerald-400">{m.r2.toFixed(4)}</td>
                        <td className="font-mono text-slate-400">±{m.cv_std.toFixed(4)}</td>
                        <td className="text-xs text-slate-400">{m.time_sec.toFixed(2)}s</td>
                        <td>
                          {isBest ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                              DEPLOYED
                            </span>
                          ) : (
                            <span className="text-xs text-slate-500">Evaluated</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Model Error Metrics Chart */}
          <div className="glass p-5 rounded-xl">
            <h3 className="text-sm font-bold text-slate-200 mb-4">Error Metrics Comparison (Lower is Better)</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={modelsList} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 11 }} />
                  <YAxis tick={{ fill: "#64748b", fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0e1729",
                      borderColor: "rgba(255,255,255,0.1)",
                      borderRadius: "10px",
                      fontSize: "12px",
                    }}
                    formatter={(val) => `${Number(val).toFixed(4)}%`}
                  />
                  <Legend />
                  <Bar dataKey="rmse" name="RMSE" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="mae" name="MAE" fill="#2dd4bf" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Feature Importance vs SHAP Importance */}
          {featureImportance.length > 0 && (
            <div className="glass p-5 rounded-xl">
              <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center justify-between">
                <span>Top Model Feature Importances (Gini vs SHAP)</span>
                <span className="text-xs text-slate-500">Relative impact on rate determination</span>
              </h3>
              <div className="space-y-2.5">
                {featureImportance.slice(0, 7).map((feat, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300 font-medium capitalize">
                        {feat.feature.replace(/_/g, " ")}
                      </span>
                      <span className="font-mono text-indigo-400">
                        {(feat.importance * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-white/5">
                      <div
                        className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full"
                        style={{ width: `${Math.min(100, feat.importance * 200)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
