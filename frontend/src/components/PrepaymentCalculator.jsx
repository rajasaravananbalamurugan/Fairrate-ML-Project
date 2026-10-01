import React, { useState, useEffect } from "react";
import { planPrepayment } from "../api";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useTranslation } from "react-i18next";

export default function PrepaymentCalculator({ formValues }) {
  const { t } = useTranslation();
  const [principalLakh, setPrincipalLakh] = useState(formValues?.loan_amount_lakh || 25);
  const [ratePct, setRatePct] = useState(formValues?.offered_rate || 9.0);
  const [tenureYears, setTenureYears] = useState(formValues?.tenure_years || 20);
  const [extraMonthly, setExtraMonthly] = useState(5000);
  const [lumpMonth, setLumpMonth] = useState(24);
  const [lumpAmount, setLumpAmount] = useState(100000);
  const [includeLump, setIncludeLump] = useState(false);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const calculate = async () => {
    setLoading(true);
    setError(null);
    try {
      const lumpSums = includeLump && lumpAmount > 0 ? [{ month: lumpMonth, amount: lumpAmount }] : [];
      const data = await planPrepayment({
        principal_lakh: Number(principalLakh),
        annual_rate_pct: Number(ratePct),
        tenure_years: Number(tenureYears),
        extra_monthly_emi: Number(extraMonthly),
        lump_sums: lumpSums,
      });
      setResult(data);
    } catch (err) {
      setError(err?.response?.data?.detail || err.message || "Failed to calculate prepayment schedule");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    calculate();
  }, [principalLakh, ratePct, tenureYears, extraMonthly, includeLump, lumpMonth, lumpAmount]);

  const formatINR = (val) => "₹" + Math.round(val || 0).toLocaleString("en-IN");

  return (
    <div className="space-y-6 fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white" style={{ fontFamily: "Outfit, sans-serif" }}>
            ⚡ EMI & Prepayment Acceleration
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Simulate how extra monthly payments or one-time lump sums slash your loan tenure and interest.
          </p>
        </div>
      </div>

      {/* Control Sliders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Principal */}
        <div className="glass p-4 rounded-xl">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-slate-400">Loan Amount</span>
            <span className="text-sm font-bold text-indigo-400">₹{principalLakh} Lakhs</span>
          </div>
          <input
            type="range"
            min="1"
            max="150"
            step="0.5"
            value={principalLakh}
            onChange={(e) => setPrincipalLakh(Number(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Rate */}
        <div className="glass p-4 rounded-xl">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-slate-400">Interest Rate (% p.a.)</span>
            <span className="text-sm font-bold text-teal-400">{ratePct}%</span>
          </div>
          <input
            type="range"
            min="7"
            max="24"
            step="0.1"
            value={ratePct}
            onChange={(e) => setRatePct(Number(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Tenure */}
        <div className="glass p-4 rounded-xl">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-slate-400">Initial Tenure</span>
            <span className="text-sm font-bold text-amber-400">{tenureYears} Years</span>
          </div>
          <input
            type="range"
            min="1"
            max="30"
            step="1"
            value={tenureYears}
            onChange={(e) => setTenureYears(Number(e.target.value))}
            className="w-full"
          />
        </div>
      </div>

      {/* Extra Payment Inputs */}
      <div className="glass p-5 rounded-xl border border-indigo-500/20">
        <h3 className="text-sm font-bold text-indigo-300 mb-3 uppercase tracking-wider">
          Prepayment Strategy
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Extra Monthly EMI (₹)
            </label>
            <input
              type="number"
              step="500"
              min="0"
              value={extraMonthly}
              onChange={(e) => setExtraMonthly(Number(e.target.value))}
              className="form-input text-sm"
              placeholder="e.g. 5000"
            />
            <span className="text-[11px] text-slate-500 mt-1 block">
              Added directly to the principal component every month.
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1">
              <input
                type="checkbox"
                id="includeLump"
                checked={includeLump}
                onChange={(e) => setIncludeLump(e.target.checked)}
                className="rounded accent-indigo-500"
              />
              <label htmlFor="includeLump" className="text-xs font-semibold text-slate-300 cursor-pointer">
                Add One-Time Lump Sum Prepayment
              </label>
            </div>
            {includeLump ? (
              <div className="flex gap-2 mt-2">
                <input
                  type="number"
                  placeholder="Amount ₹"
                  step="10000"
                  value={lumpAmount}
                  onChange={(e) => setLumpAmount(Number(e.target.value))}
                  className="form-input text-xs flex-1"
                />
                <input
                  type="number"
                  placeholder="At Month"
                  min="1"
                  max={tenureYears * 12}
                  value={lumpMonth}
                  onChange={(e) => setLumpMonth(Number(e.target.value))}
                  className="form-input text-xs w-28"
                />
              </div>
            ) : (
              <span className="text-[11px] text-slate-500 block mt-2">
                Bonus, tax refund, or maturity proceeds applied to principal.
              </span>
            )}
          </div>
        </div>
      </div>

      {error && <div className="p-3 bg-red-500/20 border border-red-500 text-red-200 text-xs rounded-xl">{error}</div>}

      {/* Results Cards */}
      {result && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass p-4 rounded-xl text-center border-l-4 border-teal-500">
              <span className="text-[11px] text-slate-400 uppercase font-semibold">Total Interest Saved</span>
              <div className="text-2xl font-black text-teal-400 mt-1">
                {formatINR(result.interest_saved)}
              </div>
              <span className="text-[10px] text-teal-300/80">Direct reduction in bank payout</span>
            </div>

            <div className="glass p-4 rounded-xl text-center border-l-4 border-indigo-500">
              <span className="text-[11px] text-slate-400 uppercase font-semibold">Tenure Reduced By</span>
              <div className="text-2xl font-black text-indigo-400 mt-1">
                {result.years_saved} Yrs ({result.months_saved} Mos)
              </div>
              <span className="text-[10px] text-indigo-300/80">Debt-free {result.years_saved} years sooner</span>
            </div>

            <div className="glass p-4 rounded-xl text-center border-l-4 border-amber-500">
              <span className="text-[11px] text-slate-400 uppercase font-semibold">New Effective Tenure</span>
              <div className="text-2xl font-black text-amber-400 mt-1">
                {result.new_tenure_years} Years
              </div>
              <span className="text-[10px] text-slate-400">Original: {tenureYears} Years</span>
            </div>

            <div className="glass p-4 rounded-xl text-center border-l-4 border-purple-500">
              <span className="text-[11px] text-slate-400 uppercase font-semibold">Base Monthly EMI</span>
              <div className="text-2xl font-black text-purple-400 mt-1">
                {formatINR(result.base_emi)}
              </div>
              <span className="text-[10px] text-slate-400">+ {formatINR(extraMonthly)} extra</span>
            </div>
          </div>

          {/* Amortization Chart */}
          <div className="glass p-5 rounded-xl">
            <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center justify-between">
              <span>Outstanding Principal Trajectory (With vs Without Prepayment)</span>
              <span className="text-xs text-slate-500 font-normal">Reducing Balance</span>
            </h3>
            <div className="h-64 sm:h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={result.amortization_sample || []}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorBaseline" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f87171" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorPrepaid" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2dd4bf" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="#2dd4bf" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    tickFormatter={(m) => `M${m}`}
                  />
                  <YAxis
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    tickFormatter={(val) => `₹${Math.round(val / 100000)}L`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0e1729",
                      borderColor: "rgba(255,255,255,0.1)",
                      borderRadius: "10px",
                      fontSize: "12px",
                    }}
                    formatter={(val, name) => [
                      formatINR(val),
                      name === "baseline_balance" ? "Original Balance" : "Accelerated Balance",
                    ]}
                    labelFormatter={(label) => `Month ${label}`}
                  />
                  <Legend
                    formatter={(value) => (
                      <span className="text-xs text-slate-300">
                        {value === "baseline_balance" ? "Original Trajectory" : "With Prepayment"}
                      </span>
                    )}
                  />
                  <Area
                    type="monotone"
                    dataKey="baseline_balance"
                    stroke="#f87171"
                    fillOpacity={1}
                    fill="url(#colorBaseline)"
                    name="baseline_balance"
                  />
                  <Area
                    type="monotone"
                    dataKey="balance"
                    stroke="#2dd4bf"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorPrepaid)"
                    name="balance"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
