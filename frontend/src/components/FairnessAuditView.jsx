import React, { useState, useEffect } from "react";
import { fetchFairnessAudit } from "../api";
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

export default function FairnessAuditView() {
  const [threshold, setThreshold] = useState(1.0);
  const [audit, setAudit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("employment");

  const runAudit = (th = threshold) => {
    setLoading(true);
    setError(null);
    fetchFairnessAudit(th)
      .then((data) => {
        setAudit(data);
      })
      .catch((err) => {
        setError(err.message || "Failed to load fairness audit");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    runAudit(threshold);
  }, [threshold]);

  const employmentData = Array.isArray(audit?.slices?.employment_type)
    ? audit.slices.employment_type.map((item) => ({
        name: (item.employment_type || "").replace(/_/g, " "),
        avg_rate: item.avg_rate ?? item.avg_predicted_rate,
        mae: item.mae,
        count: item.count,
      }))
    : audit?.employment_type_audit
    ? Object.entries(audit.employment_type_audit).map(([key, val]) => ({
        name: key.replace(/_/g, " "),
        avg_rate: val.avg_predicted_rate ?? val.avg_rate,
        mae: val.mae,
        count: val.count,
      }))
    : [];

  const bankData = Array.isArray(audit?.slices?.bank)
    ? audit.slices.bank.map((item) => ({
        name: item.bank,
        avg_rate: item.avg_rate ?? item.avg_predicted_rate,
        mae: item.mae,
        count: item.count,
      }))
    : audit?.bank_audit
    ? Object.entries(audit.bank_audit).map(([key, val]) => ({
        name: key,
        avg_rate: val.avg_predicted_rate ?? val.avg_rate,
        mae: val.mae,
        count: val.count,
      }))
    : [];

  const loanTypeData = Array.isArray(audit?.slices?.loan_type)
    ? audit.slices.loan_type.map((item) => ({
        name: (item.loan_type || "").toUpperCase(),
        avg_rate: item.avg_rate ?? item.avg_predicted_rate,
        mae: item.mae,
        count: item.count,
      }))
    : audit?.loan_type_audit
    ? Object.entries(audit.loan_type_audit).map(([key, val]) => ({
        name: key,
        avg_rate: val.avg_predicted_rate ?? val.avg_rate,
        mae: val.mae,
        count: val.count,
      }))
    : [];

  const incomeData = Array.isArray(audit?.slices?.income_band)
    ? audit.slices.income_band.map((item) => ({
        name: item.income_band,
        avg_rate: item.avg_rate ?? item.avg_predicted_rate,
        mae: item.mae,
        count: item.count,
      }))
    : audit?.income_band_audit
    ? Object.entries(audit.income_band_audit).map(([key, val]) => ({
        name: key,
        avg_rate: val.avg_predicted_rate ?? val.avg_rate,
        mae: val.mae,
        count: val.count,
      }))
    : [];

  const currentChartData =
    activeTab === "employment"
      ? employmentData
      : activeTab === "bank"
      ? bankData
      : activeTab === "loan_type"
      ? loanTypeData
      : incomeData;

  const disparityFlags = audit?.disparity_flags || [];

  return (
    <div className="space-y-6 fade-in-up">
      {/* Title */}
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-white" style={{ fontFamily: "Outfit, sans-serif" }}>
          ⚖️ Demographic & Algorithmic Fairness Audit
        </h2>
        <p className="text-xs sm:text-sm text-slate-400">
          Continuous fairness validation across employment types, institutions, loan categories, and income bands.
        </p>
      </div>

      {/* Threshold Slider */}
      <div className="glass p-4 rounded-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <label className="text-xs font-bold text-slate-300 block mb-0.5">
            Disparity Alert Gap Threshold: <span className="text-teal-400">{threshold.toFixed(1)}%</span>
          </label>
          <span className="text-[11px] text-slate-500">
            Flags any demographic spread difference exceeding this margin.
          </span>
        </div>
        <div className="w-48">
          <input
            type="range"
            min="0.5"
            max="3.0"
            step="0.1"
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="w-full"
          />
        </div>
      </div>

      {loading && (
        <div className="glass p-8 text-center rounded-xl space-y-2">
          <div className="spinner mx-auto" />
          <p className="text-xs text-slate-300">Auditing subpopulation distributions...</p>
        </div>
      )}

      {error && <div className="p-3 bg-red-500/20 border border-red-500 text-red-200 text-xs rounded-xl">{error}</div>}

      {audit && (
        <div className="space-y-6">
          {/* Disparity Alerts */}
          {disparityFlags.length > 0 ? (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-2">
              <div className="font-bold flex items-center gap-2 text-sm text-amber-300">
                <span>⚠️</span>
                <span>{disparityFlags.length} Demographic Disparity Gap(s) Flagged</span>
              </div>
              <ul className="list-disc list-inside space-y-1">
                {disparityFlags.map((flag, idx) => (
                  <li key={idx}>
                    <strong>{flag.dimension}:</strong> {flag.description} (Max spread: {flag.spread_pct.toFixed(2)}%)
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-200 text-xs flex items-center gap-2">
              <span>✅</span>
              <span>All demographic sub-segments are operating well within the {threshold}% fair spread threshold.</span>
            </div>
          )}

          {/* Grouped Bar Chart */}
          <div className="glass p-5 rounded-xl border border-indigo-500/20">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h3 className="text-sm font-bold text-slate-200">Subgroup Pricing & Model Error</h3>
              {/* Category selector */}
              <div className="flex gap-1.5">
                {[
                  { id: "employment", label: "Employment" },
                  { id: "bank", label: "Banks" },
                  { id: "loan_type", label: "Loan Types" },
                  { id: "income", label: "Income Bands" },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveTab(t.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                      activeTab === t.id
                        ? "bg-indigo-600 text-white shadow"
                        : "bg-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={currentChartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
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
                    formatter={(val) => `${Number(val).toFixed(2)}%`}
                  />
                  <Legend />
                  <Bar dataKey="avg_rate" name="Average Fair Rate (%)" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="mae" name="Validation Error (MAE %)" fill="#2dd4bf" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
