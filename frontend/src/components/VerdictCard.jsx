import React, { useState } from "react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

function calculateEmi(principal, annualRatePct, tenureYears) {
  if (!principal || !annualRatePct || !tenureYears) return 0;
  const r = annualRatePct / (12 * 100);
  const n = tenureYears * 12;
  if (r === 0) return principal / n;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

function formatINR(val) {
  return "₹" + Math.round(val).toLocaleString("en-IN");
}

function VerdictBadge({ verdict, emoji }) {
  const cls =
    verdict === "FAIR"
      ? "verdict-fair"
      : verdict === "HIGH"
      ? "verdict-high"
      : "verdict-red";

  const size = verdict === "RED FLAG" ? "text-3xl" : "text-4xl";

  return (
    <div className={`rounded-2xl p-6 text-center ${cls} mb-6`}>
      <div className="text-6xl mb-3" role="img" aria-label={verdict}>
        {emoji}
      </div>
      <div
        className={`font-black tracking-widest uppercase ${size}`}
        style={{ fontFamily: "Outfit, sans-serif" }}
      >
        {verdict}
      </div>
    </div>
  );
}

function MetricPill({ label, value, color, badge, tooltip }) {
  return (
    <div className="glass rounded-xl p-4 text-center relative group">
      <div className="text-xs text-slate-500 uppercase tracking-widest mb-1">{label}</div>
      <div className="text-2xl font-black flex items-center justify-center flex-wrap gap-1" style={{ color }}>
        <span>{value}</span>
        {badge && (
          <span
            className="text-[10px] text-indigo-300 font-semibold bg-indigo-500/15 border border-indigo-500/30 px-1.5 py-0.5 rounded cursor-help"
            title={tooltip}
          >
            {badge}
          </span>
        )}
      </div>
      {tooltip && (
        <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 p-2 bg-slate-900 text-slate-300 text-[10px] rounded-lg shadow-xl border border-slate-700 pointer-events-none z-20 text-center">
          {tooltip}
        </div>
      )}
    </div>
  );
}

export default function VerdictCard({ result, formValues, loanType = "personal" }) {
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Loading skeleton
  if (!result) {
    return (
      <div className="glass rounded-2xl p-6 animate-pulse">
        <div className="h-28 bg-slate-800 rounded-2xl mb-6" />
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="h-16 bg-slate-800 rounded-xl" />
          <div className="h-16 bg-slate-800 rounded-xl" />
          <div className="h-16 bg-slate-800 rounded-xl" />
        </div>
        <div className="h-12 bg-slate-800 rounded-xl mb-4" />
      </div>
    );
  }

  const {
    fair_rate,
    offered_rate,
    difference,
    verdict,
    verdict_emoji,
    message,
    explainer,
    model_name,
    confidence,
  } = result;

  const diffColor =
    verdict === "FAIR"
      ? "#2dd4bf"
      : verdict === "HIGH"
      ? "#fbbf24"
      : "#f87171";

  const diffSign = difference >= 0 ? "+" : "";

  // Loan parameters for EMI and script
  const principalLakh = formValues?.loan_amount_lakh || 5;
  const principal = principalLakh * 100000;
  const tenureYears = formValues?.tenure_years || 3;
  const bankName = formValues?.bank || "Bank";
  const creditScore = formValues?.credit_score || 750;
  const cleanType = (formValues?.loan_type || loanType || "personal").toLowerCase();

  // Reducing balance EMI calculation
  const nMonths = tenureYears * 12;
  const offeredEmi = calculateEmi(principal, offered_rate, tenureYears);
  const fairEmi = calculateEmi(principal, fair_rate, tenureYears);
  const emiDiff = offeredEmi - fairEmi;

  const offeredTotalInterest = Math.max(0, offeredEmi * nMonths - principal);
  const fairTotalInterest = Math.max(0, fairEmi * nMonths - principal);
  const excessInterest = Math.max(0, offeredTotalInterest - fairTotalInterest);

  // Likely fair-rate range (from Quantile Gradient Boosting alpha=0.10 and alpha=0.90)
  const lowBound = (result?.fair_rate_low ?? (fair_rate - (confidence?.std ?? 0.20) * 1.5)).toFixed(2);
  const highBound = (result?.fair_rate_high ?? (fair_rate + (confidence?.std ?? 0.20) * 1.5)).toFixed(2);
  const likelyRangeBadge = `${lowBound}% – ${highBound}%`;
  const rangeTooltip = `Likely fair-rate range estimated via 10th to 90th percentile quantile regression: ${lowBound}% to ${highBound}%.`;

  // Negotiation Script
  const negotiationText = `Subject: Request for Interest Rate Reconsideration - ${cleanType.toUpperCase()} Loan Application

Dear Loan Manager / ${bankName} Relationship Team,

I have received your loan offer of ${offered_rate.toFixed(2)}% p.a. for my ${cleanType} loan application of ₹${principalLakh} Lakhs over a tenure of ${tenureYears} years.

Based on an objective market risk assessment for my credit profile (CIBIL Score: ${creditScore}, disciplined repayment track record), the fair benchmark rate for this loan is estimated at approximately ${fair_rate.toFixed(2)}% p.a.

The current quoted rate of ${offered_rate.toFixed(2)}% carries a spread of ${diffSign}${difference.toFixed(2)}%, which amounts to an additional ${formatINR(excessInterest)} in excess interest charges over the tenure (${formatINR(emiDiff)} extra per month).

In light of my creditworthiness and competitive quotes from peer lenders, I kindly request you to match or lower the interest rate to around ${fair_rate.toFixed(2)}%.

I value my banking relationship with ${bankName} and would appreciate your positive review on this revision.

Sincerely,
[Your Name]
[Contact Details]`;

  const handleCopyScript = () => {
    navigator.clipboard.writeText(negotiationText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // PDF Report generation
  const handleDownloadPdf = async () => {
    const el = document.getElementById("fairrate-result");
    if (!el) return;

    setDownloading(true);
    try {
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#080f1e",
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const todayStr = new Date().toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(14);
      pdf.setTextColor(99, 102, 241);
      pdf.text(`FairRate Report — ${todayStr}`, 15, 14);

      const margin = 15;
      const imgWidth = pageWidth - margin * 2;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const maxImgHeight = pageHeight - 30;
      const finalHeight = Math.min(imgHeight, maxImgHeight);

      pdf.addImage(imgData, "PNG", margin, 18, imgWidth, finalHeight);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(148, 163, 184);
      pdf.text(
        "For educational use only. Synthetic data modeling. Not financial advice.",
        margin,
        pageHeight - 6
      );

      const dateSlug = new Date().toISOString().split("T")[0];
      pdf.save(`fairrate-verdict-${cleanType}-${dateSlug}.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div id="fairrate-result" className="fade-in-up space-y-6">
      {/* ── Big verdict ── */}
      <VerdictBadge verdict={verdict} emoji={verdict_emoji} />

      {/* ── Rate metrics ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <MetricPill
          label="Fair Market Rate"
          value={`${fair_rate.toFixed(2)}%`}
          color="#818cf8"
        />
        <MetricPill
          label="Your Offered Rate"
          value={`${offered_rate.toFixed(2)}%`}
          color="#e2e8f0"
        />
        <MetricPill
          label="Rate Spread"
          value={`${diffSign}${difference.toFixed(2)}%`}
          color={diffColor}
        />
      </div>

      {/* ── Likely Fair-Rate Range (Prediction Intervals) ── */}
      <div className="glass rounded-xl p-3.5 border border-teal-500/30 bg-teal-500/5 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-base">📐</span>
          <div>
            <span className="text-xs font-bold text-teal-300">Likely Fair-Rate Range: </span>
            <span className="text-xs font-mono font-black text-white">{likelyRangeBadge}</span>
          </div>
        </div>
        <span className="text-[11px] text-teal-300/80">
          Quantile Regression (10th–90th percentile)
        </span>
      </div>

      {/* ── Compact EMI & Total Interest Line (Standard Reducing-Balance) ── */}
      <div className="glass rounded-xl p-4 border border-indigo-500/25 bg-slate-900/60">
        <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-base">💳</span>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Repayment Impact (Reducing Balance)
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            ₹{principalLakh}L • {tenureYears} yrs ({nMonths} EMIs)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/50">
            <div className="text-slate-400 mb-0.5">Monthly EMI</div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-base font-bold text-white">{formatINR(offeredEmi)}</span>
              <span className="text-[10px] text-slate-400">vs {formatINR(fairEmi)} fair</span>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/50">
            <div className="text-slate-400 mb-0.5">Total Interest Payable</div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-base font-bold text-slate-200">{formatINR(offeredTotalInterest)}</span>
              <span className="text-[10px] text-slate-400">vs {formatINR(fairTotalInterest)} fair</span>
            </div>
          </div>

          <div className={`p-2.5 rounded-lg border ${
            excessInterest > 0
              ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
              : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
          }`}>
            <div className="text-slate-400 mb-0.5">
              {excessInterest > 0 ? "Lifetime Excess Cost" : "Fair Rate Advantage"}
            </div>
            <div className="text-base font-black">
              {excessInterest > 0 ? `+${formatINR(excessInterest)}` : "₹0 (Fair Deal)"}
            </div>
          </div>
        </div>
      </div>

      {/* ── Status Message & Explainer ── */}
      <div
        className={`rounded-xl p-4 text-sm font-medium ${
          verdict === "FAIR"
            ? "bg-emerald-500/10 border border-emerald-500/25 text-emerald-300"
            : verdict === "HIGH"
            ? "bg-amber-500/10 border border-amber-500/25 text-amber-300"
            : "bg-red-500/10 border border-red-500/25 text-red-300"
        }`}
      >
        {message}
      </div>

      <div className="glass rounded-xl p-4">
        <p className="text-xs uppercase text-slate-500 tracking-widest mb-2 font-semibold">
          What This Means
        </p>
        <p className="text-sm text-slate-300 leading-relaxed">{explainer}</p>
      </div>

      {/* ── Bank Negotiation Script ── */}
      {verdict !== "FAIR" && (
        <div className="glass rounded-2xl p-5 border border-indigo-500/30 bg-slate-900/50">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">📝</span>
              <div>
                <h4 className="text-sm font-bold text-white">Bank Negotiation Script</h4>
                <p className="text-[11px] text-slate-400">
                  Ready-to-use email/letter to request an interest rate reduction from your lender
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCopyScript}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 transition-all cursor-pointer inline-flex items-center gap-1.5"
            >
              <span>{copied ? "✓" : "📋"}</span>
              <span>{copied ? "Copied to Clipboard!" : "Copy Script"}</span>
            </button>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs font-mono text-slate-300 whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto">
            {negotiationText}
          </div>
        </div>
      )}

      {/* ── Footer Actions & PDF Download ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block"></span>
          Engine: {model_name}
        </div>

        <button
          type="button"
          id="download-pdf-button"
          onClick={handleDownloadPdf}
          disabled={downloading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600/25 hover:bg-indigo-600/40 text-indigo-200 border border-indigo-500/40 text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed ml-auto cursor-pointer"
        >
          {downloading ? (
            <>
              <svg className="animate-spin h-3.5 w-3.5 text-indigo-300" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
              <span>Generating PDF…</span>
            </>
          ) : (
            <>
              <span>📄</span>
              <span>Download PDF Verdict Report</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
