import React, { useState, useRef } from "react";
import { toPng } from "html-to-image";

export default function ShareResultModal({ result, formValues }) {
  const cardRef = useRef(null);
  const [includeIncome, setIncludeIncome] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Generate shareable URL with non-sensitive params
  const generateShareUrl = () => {
    const params = new URLSearchParams({
      type: formValues?.loan_type || "personal",
      bank: formValues?.bank || "HDFC",
      amount: formValues?.loan_amount_lakh || 5,
      tenure: formValues?.tenure_years || 3,
      offered: formValues?.offered_rate || 13.5,
      cibil: formValues?.credit_score || 750,
    });
    if (includeIncome && formValues?.annual_income_lakh) {
      params.set("income", formValues.annual_income_lakh);
    }
    return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
  };

  const handleCopyLink = () => {
    const url = generateShareUrl();
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleDownloadCard = async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        backgroundColor: "#080f1e",
        pixelRatio: 2,
      });
      const link = document.createElement("a");
      link.download = `FAIRRATE_Verdict_${formValues?.bank || "Loan"}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Failed to render card image:", err);
    } finally {
      setDownloading(false);
    }
  };

  const fairRate = result?.fair_rate ?? 10.5;
  const offeredRate = result?.offered_rate ?? 13.5;
  const verdict = result?.verdict ?? "HIGH";

  return (
    <div className="space-y-6 fade-in-up">
      {/* Title */}
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-white" style={{ fontFamily: "Outfit, sans-serif" }}>
          📤 Share Rate Verdict Summary Card
        </h2>
        <p className="text-xs sm:text-sm text-slate-400">
          Export a branded rate certificate or generate an anonymized share link to send to lenders or advisors.
        </p>
      </div>

      {/* Sharing Controls */}
      <div className="glass p-4 rounded-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="includeIncome"
            checked={includeIncome}
            onChange={(e) => setIncludeIncome(e.target.checked)}
            className="rounded accent-indigo-500"
          />
          <label htmlFor="includeIncome" className="text-xs font-semibold text-slate-300 cursor-pointer">
            Include annual income on card & link (disabled by default for privacy)
          </label>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleCopyLink}
            className="px-4 py-2 rounded-xl bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 border border-indigo-500/30 text-xs font-bold cursor-pointer transition-colors"
          >
            {copiedLink ? "✅ Link Copied!" : "🔗 Copy Share Link"}
          </button>
          <button
            type="button"
            onClick={handleDownloadCard}
            disabled={downloading}
            className="btn-primary !w-auto px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
          >
            <span>{downloading ? "Rendering..." : "🖼️ Download Image Card"}</span>
          </button>
        </div>
      </div>

      {/* Renderable Preview Card (for PNG export) */}
      <div className="flex justify-center">
        <div
          ref={cardRef}
          className="w-full max-w-lg p-7 rounded-3xl border border-indigo-500/30 bg-gradient-to-br from-slate-900 via-[#0e1729] to-[#080f1e] shadow-2xl relative overflow-hidden"
        >
          {/* Top Brand Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-5">
            <div className="flex items-center gap-2">
              <span className="text-2xl">⚖️</span>
              <div>
                <span className="font-black text-lg gradient-text tracking-tight block leading-tight">
                  FAIRRATE
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  Loan Rate Fairness Certificate
                </span>
              </div>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Verified ML Audit
            </span>
          </div>

          {/* Verdict Banner */}
          <div
            className={`p-4 rounded-2xl text-center mb-5 ${
              verdict === "FAIR"
                ? "bg-teal-500/15 border border-teal-500/40 text-teal-300"
                : verdict === "HIGH"
                ? "bg-amber-500/15 border border-amber-500/40 text-amber-300"
                : "bg-red-500/15 border border-red-500/40 text-red-300"
            }`}
          >
            <span className="text-[10px] uppercase font-bold tracking-widest block text-slate-400">
              Machine Learning Verdict
            </span>
            <div className="text-2xl font-black mt-0.5 tracking-wider">{verdict}</div>
          </div>

          {/* Rates Metric Strip */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="glass p-3 rounded-xl text-center">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Offered Rate</span>
              <div className="text-xl font-black text-slate-200 mt-1">{offeredRate.toFixed(2)}%</div>
            </div>
            <div className="glass p-3 rounded-xl text-center">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Fair Benchmark</span>
              <div className="text-xl font-black text-teal-400 mt-1">{fairRate.toFixed(2)}%</div>
            </div>
          </div>

          {/* Key Loan Attributes */}
          <div className="space-y-1.5 text-xs text-slate-300 border-t border-white/5 pt-4">
            <div className="flex justify-between py-1 border-b border-white/5">
              <span className="text-slate-500">Lender & Loan Type</span>
              <span className="font-semibold capitalize text-white">
                {formValues?.bank} • {formValues?.loan_type} Loan
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-white/5">
              <span className="text-slate-500">Sanction Amount & Tenure</span>
              <span className="font-semibold text-white">
                ₹{formValues?.loan_amount_lakh} Lakhs • {formValues?.tenure_years} Years
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-white/5">
              <span className="text-slate-500">Borrower CIBIL Score</span>
              <span className="font-semibold text-emerald-400">{formValues?.credit_score}</span>
            </div>
            {includeIncome && (
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-500">Annual Declared Income</span>
                <span className="font-semibold text-white">₹{formValues?.annual_income_lakh} Lakhs</span>
              </div>
            )}
          </div>

          {/* Micro Footer */}
          <div className="mt-5 text-center text-[9px] text-slate-500 border-t border-white/5 pt-3">
            fairrate.org • Model v2.0.0 • Educational analysis based on RBI benchmarks. Not financial advice.
          </div>
        </div>
      </div>
    </div>
  );
}
