import React, { useState, useEffect } from "react";
import { planBalanceTransfer } from "../api";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

export default function BalanceTransferCalculator({ formValues }) {
  const [outstandingPrincipalLakh, setOutstandingPrincipalLakh] = useState(
    formValues?.loan_amount_lakh || 30
  );
  const [remainingTenureYears, setRemainingTenureYears] = useState(formValues?.tenure_years || 15);
  const [currentRatePct, setCurrentRatePct] = useState(formValues?.offered_rate || 9.5);
  const [newRatePct, setNewRatePct] = useState(8.5);
  const [processingFeePct, setProcessingFeePct] = useState(0.5);
  const [foreclosureChargesPct, setForeclosureChargesPct] = useState(0.0);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const calculate = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await planBalanceTransfer({
        outstanding_principal_lakh: Number(outstandingPrincipalLakh),
        remaining_tenure_years: Number(remainingTenureYears),
        current_rate_pct: Number(currentRatePct),
        new_rate_pct: Number(newRatePct),
        processing_fee_pct: Number(processingFeePct),
        foreclosure_charges_pct: Number(foreclosureChargesPct),
      });
      setResult(data);
    } catch (err) {
      setError(err?.response?.data?.detail || err.message || "Failed to calculate balance transfer");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    calculate();
  }, [
    outstandingPrincipalLakh,
    remainingTenureYears,
    currentRatePct,
    newRatePct,
    processingFeePct,
    foreclosureChargesPct,
  ]);

  const formatINR = (val) => "₹" + Math.round(val || 0).toLocaleString("en-IN");

  return (
    <div className="space-y-6 fade-in-up">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-white" style={{ fontFamily: "Outfit, sans-serif" }}>
          🔄 Home Loan Balance Transfer (Refinancing)
        </h2>
        <p className="text-xs sm:text-sm text-slate-400">
          Compute switching costs, break-even timeline, and net lifetime interest savings from switching banks.
        </p>
      </div>

      {/* Inputs Form */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="glass p-3 rounded-xl">
          <label className="text-[11px] text-slate-400 block mb-1">Outstanding (₹L)</label>
          <input
            type="number"
            step="1"
            min="1"
            value={outstandingPrincipalLakh}
            onChange={(e) => setOutstandingPrincipalLakh(Number(e.target.value))}
            className="form-input text-xs"
          />
        </div>

        <div className="glass p-3 rounded-xl">
          <label className="text-[11px] text-slate-400 block mb-1">Remaining (Yrs)</label>
          <input
            type="number"
            min="1"
            max="30"
            value={remainingTenureYears}
            onChange={(e) => setRemainingTenureYears(Number(e.target.value))}
            className="form-input text-xs"
          />
        </div>

        <div className="glass p-3 rounded-xl">
          <label className="text-[11px] text-slate-400 block mb-1">Current Rate (%)</label>
          <input
            type="number"
            step="0.05"
            value={currentRatePct}
            onChange={(e) => setCurrentRatePct(Number(e.target.value))}
            className="form-input text-xs"
          />
        </div>

        <div className="glass p-3 rounded-xl">
          <label className="text-[11px] text-slate-400 block mb-1">New Bank Rate (%)</label>
          <input
            type="number"
            step="0.05"
            value={newRatePct}
            onChange={(e) => setNewRatePct(Number(e.target.value))}
            className="form-input text-xs"
          />
        </div>

        <div className="glass p-3 rounded-xl">
          <label className="text-[11px] text-slate-400 block mb-1">Transfer Fee (%)</label>
          <input
            type="number"
            step="0.1"
            value={processingFeePct}
            onChange={(e) => setProcessingFeePct(Number(e.target.value))}
            className="form-input text-xs"
          />
        </div>

        <div className="glass p-3 rounded-xl">
          <label className="text-[11px] text-slate-400 block mb-1">Foreclosure (%)</label>
          <input
            type="number"
            step="0.1"
            value={foreclosureChargesPct}
            onChange={(e) => setForeclosureChargesPct(Number(e.target.value))}
            className="form-input text-xs"
          />
        </div>
      </div>

      {error && <div className="p-3 bg-red-500/20 border border-red-500 text-red-200 text-xs rounded-xl">{error}</div>}

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Verdict Card */}
          <div
            className={`glass p-6 rounded-2xl border-2 flex flex-col md:flex-row items-center justify-between gap-6 ${
              result.recommend
                ? "border-teal-500/50 bg-teal-500/5"
                : "border-amber-500/50 bg-amber-500/5"
            }`}
          >
            <div className="flex items-center gap-4">
              <span className="text-5xl">{result.recommend ? "✅" : "⚠️"}</span>
              <div>
                <span
                  className={`text-xs uppercase font-extrabold tracking-wider ${
                    result.recommend ? "text-teal-400" : "text-amber-400"
                  }`}
                >
                  Decision Engine Recommendation
                </span>
                <h3 className="text-2xl font-black text-white">{result.verdict}</h3>
                <p className="text-xs text-slate-300 mt-1 max-w-xl">{result.rationale}</p>
              </div>
            </div>

            <div className="flex flex-wrap md:flex-col gap-3 text-center md:text-right">
              <div>
                <span className="text-[11px] text-slate-400 block">Net Lifetime Savings</span>
                <span className="text-2xl font-black text-teal-400">
                  {formatINR(result.net_savings)}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">Break-Even Period</span>
                <span className="text-lg font-bold text-indigo-300">
                  {result.break_even_month ? `${result.break_even_month} Months` : "Never"}
                </span>
              </div>
            </div>
          </div>

          {/* Stat Pillars */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="glass p-4 rounded-xl text-center">
              <span className="text-[11px] text-slate-400 uppercase">Current EMI</span>
              <div className="text-lg font-bold text-slate-200 mt-1">{formatINR(result.current_emi)}</div>
            </div>
            <div className="glass p-4 rounded-xl text-center">
              <span className="text-[11px] text-slate-400 uppercase">New EMI</span>
              <div className="text-lg font-bold text-teal-400 mt-1">{formatINR(result.new_emi)}</div>
            </div>
            <div className="glass p-4 rounded-xl text-center">
              <span className="text-[11px] text-slate-400 uppercase">Monthly Savings</span>
              <div className="text-lg font-bold text-indigo-300 mt-1">
                {formatINR(result.monthly_savings)}
              </div>
            </div>
            <div className="glass p-4 rounded-xl text-center">
              <span className="text-[11px] text-slate-400 uppercase">Upfront Switch Cost</span>
              <div className="text-lg font-bold text-pink-400 mt-1">
                {formatINR(result.switching_costs)}
              </div>
            </div>
          </div>

          {/* Cumulative Savings Chart */}
          <div className="glass p-5 rounded-xl">
            <h3 className="text-sm font-bold text-slate-200 mb-3 flex items-center justify-between">
              <span>Cumulative Net Savings Trajectory (Over 36 Months)</span>
              <span className="text-xs text-indigo-400 font-semibold">
                Break-even: Month {result.break_even_month || "N/A"}
              </span>
            </h3>
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={result.cumulative_savings_trajectory || []}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    tickFormatter={(m) => `M${m}`}
                  />
                  <YAxis
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    tickFormatter={(val) => `₹${Math.round(val / 1000)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0e1729",
                      borderColor: "rgba(255,255,255,0.1)",
                      borderRadius: "10px",
                      fontSize: "12px",
                    }}
                    formatter={(val) => [formatINR(val), "Net Cumulative Savings"]}
                    labelFormatter={(label) => `Month ${label}`}
                  />
                  <ReferenceLine y={0} stroke="#f87171" strokeDasharray="4 4" />
                  <Line
                    type="monotone"
                    dataKey="cumulative_net_savings"
                    stroke="#2dd4bf"
                    strokeWidth={2.5}
                    dot={{ r: 2 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[11px] text-slate-500 mt-2 text-center">
              The red line represents the zero-sum threshold. Values above zero indicate pure cash profit after recovering all fees.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
