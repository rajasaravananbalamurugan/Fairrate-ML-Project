import React, { useState } from "react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

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
            className="text-xs text-slate-400 font-semibold bg-slate-800/90 border border-slate-700 px-1.5 py-0.5 rounded cursor-help"
            title={tooltip}
          >
            {badge}
          </span>
        )}
      </div>
      {tooltip && (
        <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-900 text-slate-300 text-[10px] rounded-lg shadow-xl border border-slate-700 pointer-events-none z-20 text-center">
          {tooltip}
        </div>
      )}
    </div>
  );
}

export default function VerdictCard({ result, loanType = "personal" }) {
  const [downloading, setDownloading] = useState(false);

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

  // Feature 4: PDF Report generation
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

      // Today's date header
      const todayStr = new Date().toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(14);
      pdf.setTextColor(99, 102, 241);
      pdf.text(`FairRate Report — ${todayStr}`, 15, 14);

      // Embed captured element image
      const margin = 15;
      const imgWidth = pageWidth - margin * 2;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const maxImgHeight = pageHeight - 30;
      const finalHeight = Math.min(imgHeight, maxImgHeight);

      pdf.addImage(imgData, "PNG", margin, 18, imgWidth, finalHeight);

      // Footer disclaimer
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(148, 163, 184);
      pdf.text(
        "This is not financial advice. For educational use only.",
        margin,
        pageHeight - 6
      );

      const cleanType = String(loanType || "loan").toLowerCase();
      const dateSlug = new Date().toISOString().split("T")[0];
      pdf.save(`fairrate-report-${cleanType}-${dateSlug}.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
    } finally {
      setDownloading(false);
    }
  };

  // Feature 5: Confidence Interval Badge
  const confidenceBadge = confidence?.std ? `± ${confidence.std.toFixed(1)}%` : null;

  return (
    <div id="fairrate-result" className="fade-in-up">
      {/* ── Big verdict ── */}
      <VerdictBadge verdict={verdict} emoji={verdict_emoji} />

      {/* ── Rate metrics ── */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <MetricPill
          label="Fair Rate"
          value={`${fair_rate.toFixed(1)}%`}
          badge={confidenceBadge}
          tooltip="Estimated range based on model uncertainty"
          color="#818cf8"
        />
        <MetricPill
          label="Your Rate"
          value={`${offered_rate.toFixed(1)}%`}
          color="#e2e8f0"
        />
        <MetricPill
          label="Difference"
          value={`${diffSign}${difference.toFixed(1)}%`}
          color={diffColor}
        />
      </div>

      {/* ── Message ── */}
      <div
        className={`rounded-xl p-4 mb-5 text-sm font-medium ${
          verdict === "FAIR"
            ? "bg-emerald-500/10 border border-emerald-500/25 text-emerald-300"
            : verdict === "HIGH"
            ? "bg-amber-500/10 border border-amber-500/25 text-amber-300"
            : "bg-red-500/10 border border-red-500/25 text-red-300"
        }`}
      >
        {message}
      </div>

      {/* ── Explainer ── */}
      <div className="glass rounded-xl p-4 mb-5">
        <p className="text-xs uppercase text-slate-500 tracking-widest mb-2 font-semibold">What This Means</p>
        <p className="text-sm text-slate-300 leading-relaxed">{explainer}</p>
      </div>

      {/* ── Model info + Download Report button ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1 border-t border-slate-800/80">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block"></span>
          Powered by {model_name}
        </div>

        {/* Feature 4: Download Report Button (bottom right) */}
        <button
          type="button"
          id="download-pdf-button"
          onClick={handleDownloadPdf}
          disabled={downloading}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed ml-auto"
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
              <span>Download Report</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
