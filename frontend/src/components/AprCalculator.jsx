import React, { useState, useEffect } from "react";
import { planApr } from "../api";
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

export default function AprCalculator({ formValues }) {
  const [loanAmountLakh, setLoanAmountLakh] = useState(formValues?.loan_amount_lakh || 10);
  const [quotedRatePct, setQuotedRatePct] = useState(formValues?.offered_rate || 10.5);
  const [tenureYears, setTenureYears] = useState(formValues?.tenure_years || 5);
  const [processingFeePct, setProcessingFeePct] = useState(1.0);
  const [processingFeeFlat, setProcessingFeeFlat] = useState(0);
  const [gstPct, setGstPct] = useState(18.0);
  const [insuranceAmount, setInsuranceAmount] = useState(12000);
  const [otherCharges, setOtherCharges] = useState(3500);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const calculate = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await planApr({
        loan_amount_lakh: Number(loanAmountLakh),
        quoted_rate_pct: Number(quotedRatePct),
        tenure_years: Number(tenureYears),
        processing_fee_pct: Number(processingFeePct),
        processing_fee_flat: Number(processingFeeFlat),
        gst_pct: Number(gstPct),
        insurance_amount: Number(insuranceAmount),
        other_charges: Number(otherCharges),
      });
      setResult(data);
    } catch (err) {
      setError(err?.response?.data?.detail || err.message || "Failed to compute APR");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    calculate();
  }, [
    loanAmountLakh,
    quotedRatePct,
    tenureYears,
    processingFeePct,
    processingFeeFlat,
    gstPct,
    insuranceAmount,
    otherCharges,
  ]);

  const formatINR = (val) => "₹" + Math.round(val || 0).toLocaleString("en-IN");

  const chartData = result
    ? [
        {
          name: "Quoted Base vs Total Cost",
          Interest: result.total_interest,
          UpfrontFees: result.total_upfront_fees,
        },
      ]
    : [];

  return (
    <div className="space-y-6 fade-in-up">
      {/* Title */}
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-white" style={{ fontFamily: "Outfit, sans-serif" }}>
          💳 True Cost of Credit (APR Calculator)
        </h2>
        <p className="text-xs sm:text-sm text-slate-400">
          Unmask the hidden drag of processing fees, GST, bundled loan insurance, and documentation charges.
        </p>
      </div>

      {/* Inputs Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass p-4 rounded-xl">
          <label className="text-xs text-slate-400 block mb-1">Loan Principal</label>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-400">₹</span>
            <input
              type="number"
              step="0.5"
              min="0.5"
              value={loanAmountLakh}
              onChange={(e) => setLoanAmountLakh(Number(e.target.value))}
              className="form-input text-sm"
            />
            <span className="text-xs text-slate-500">Lakh</span>
          </div>
        </div>

        <div className="glass p-4 rounded-xl">
          <label className="text-xs text-slate-400 block mb-1">Quoted Rate (% p.a.)</label>
          <input
            type="number"
            step="0.05"
            min="5"
            max="35"
            value={quotedRatePct}
            onChange={(e) => setQuotedRatePct(Number(e.target.value))}
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

        <div className="glass p-4 rounded-xl">
          <label className="text-xs text-slate-400 block mb-1">Processing Fee (% of loan)</label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="5"
            value={processingFeePct}
            onChange={(e) => setProcessingFeePct(Number(e.target.value))}
            className="form-input text-sm"
          />
        </div>

        <div className="glass p-4 rounded-xl">
          <label className="text-xs text-slate-400 block mb-1">GST on Fees (%)</label>
          <input
            type="number"
            step="1"
            value={gstPct}
            onChange={(e) => setGstPct(Number(e.target.value))}
            className="form-input text-sm"
          />
        </div>

        <div className="glass p-4 rounded-xl">
          <label className="text-xs text-slate-400 block mb-1">Mandatory Insurance (₹)</label>
          <input
            type="number"
            step="1000"
            min="0"
            value={insuranceAmount}
            onChange={(e) => setInsuranceAmount(Number(e.target.value))}
            className="form-input text-sm"
          />
        </div>

        <div className="glass p-4 rounded-xl">
          <label className="text-xs text-slate-400 block mb-1">Other Documentation/Valuation (₹)</label>
          <input
            type="number"
            step="500"
            min="0"
            value={otherCharges}
            onChange={(e) => setOtherCharges(Number(e.target.value))}
            className="form-input text-sm"
          />
        </div>

        <div className="glass p-4 rounded-xl">
          <label className="text-xs text-slate-400 block mb-1">Flat Admin Fee (₹, optional)</label>
          <input
            type="number"
            step="500"
            min="0"
            value={processingFeeFlat}
            onChange={(e) => setProcessingFeeFlat(Number(e.target.value))}
            className="form-input text-sm"
          />
        </div>
      </div>

      {error && <div className="p-3 bg-red-500/20 border border-red-500 text-red-200 text-xs rounded-xl">{error}</div>}

      {/* KPI Comparison */}
      {result && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="glass p-5 rounded-2xl text-center border-2 border-indigo-500/30">
              <span className="text-xs text-slate-400 uppercase font-semibold">Bank Quoted Rate</span>
              <div className="text-3xl font-black text-indigo-300 mt-2">
                {result.quoted_rate_pct.toFixed(2)}%
              </div>
              <span className="text-[11px] text-slate-500">Nominal annual percentage rate</span>
            </div>

            <div className="glass p-5 rounded-2xl text-center border-2 border-amber-500 bg-amber-500/5">
              <span className="text-xs text-amber-300 uppercase font-semibold">Effective APR (True Cost)</span>
              <div className="text-3xl font-black text-amber-400 mt-2">
                {result.effective_apr_pct.toFixed(2)}%
              </div>
              <span className="text-[11px] text-amber-300/80">
                +{result.apr_spread_bps} bps higher than advertised
              </span>
            </div>

            <div className="glass p-5 rounded-2xl text-center border-2 border-pink-500/30">
              <span className="text-xs text-slate-400 uppercase font-semibold">Total Upfront Leakage</span>
              <div className="text-3xl font-black text-pink-400 mt-2">
                {formatINR(result.total_upfront_fees)}
              </div>
              <span className="text-[11px] text-slate-500">Deducted from disbursed loan</span>
            </div>
          </div>

          {/* Breakdown Table & Stacked Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass p-5 rounded-xl">
              <h3 className="text-sm font-bold text-slate-200 mb-4">Total Cost Breakdown</h3>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1.5 border-b border-white/5">
                  <span className="text-slate-400">Total Lifetime Interest</span>
                  <span className="font-semibold text-slate-200">{formatINR(result.total_interest)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-white/5">
                  <span className="text-slate-400">Processing Fee + 18% GST</span>
                  <span className="font-semibold text-slate-200">{formatINR(result.breakdown.processing_fee_with_gst)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-white/5">
                  <span className="text-slate-400">Mandatory Insurance</span>
                  <span className="font-semibold text-slate-200">{formatINR(result.breakdown.insurance)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-white/5">
                  <span className="text-slate-400">Documentation & Other Charges</span>
                  <span className="font-semibold text-slate-200">{formatINR(result.breakdown.other_charges)}</span>
                </div>
                <div className="flex justify-between pt-2 text-sm font-bold border-t border-white/10 text-teal-400">
                  <span>Net Disbursed Cash Flow</span>
                  <span>{formatINR(result.net_disbursed_amount)}</span>
                </div>
                <div className="flex justify-between py-1 text-sm font-bold text-red-400">
                  <span>Grand Total Cost (Principal + Interest + Fees)</span>
                  <span>{formatINR(result.grand_total_cost)}</span>
                </div>
              </div>
            </div>

            <div className="glass p-5 rounded-xl">
              <h3 className="text-sm font-bold text-slate-200 mb-4">Interest vs Upfront Fees Composition</h3>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis
                      type="number"
                      tick={{ fill: "#64748b", fontSize: 11 }}
                      tickFormatter={(val) => `₹${Math.round(val / 1000)}k`}
                    />
                    <YAxis type="category" dataKey="name" hide />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0e1729",
                        borderColor: "rgba(255,255,255,0.1)",
                        borderRadius: "10px",
                        fontSize: "12px",
                      }}
                      formatter={(val) => formatINR(val)}
                    />
                    <Legend />
                    <Bar dataKey="Interest" stackId="a" fill="#6366f1" radius={[4, 0, 0, 4]} />
                    <Bar dataKey="UpfrontFees" stackId="a" fill="#fb923c" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[11px] text-slate-500 mt-2 text-center">
                IRR evaluates exact monthly payment schedules to determine your true rate liability.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
