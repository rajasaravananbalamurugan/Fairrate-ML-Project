import React, { useState, useEffect } from "react";
import { generateNegotiationScript } from "../api";

export default function AiNegotiationScript({ result, formValues }) {
  const [tone, setTone] = useState("firm");
  const [scriptText, setScriptText] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);

  const generate = async (selectedTone = tone) => {
    setLoading(true);
    setError(null);
    try {
      const topReasons = result?.explainer?.reasons
        ? result.explainer.reasons.map((r) => r.feature || r.name || r)
        : ["CIBIL score above 750", "Stable salaried employment", "Low obligations"];

      const competitorRates = result?.comparison
        ? result.comparison.slice(0, 3).map((c) => ({ bank: c.bank, rate: c.fair_rate }))
        : [
            { bank: "SBI", rate: 8.5 },
            { bank: "HDFC", rate: 8.75 },
          ];

      const data = await generateNegotiationScript({
        tone: selectedTone,
        verdict: result?.verdict || "HIGH",
        offered_rate: result?.offered_rate || 13.5,
        fair_rate: result?.fair_rate || 10.8,
        bank: formValues?.bank || "HDFC",
        loan_type: formValues?.loan_type || "personal",
        credit_score: formValues?.credit_score || 750,
        loan_amount_lakh: formValues?.loan_amount_lakh || 5,
        tenure_years: formValues?.tenure_years || 3,
        top_reasons: topReasons,
        competitor_rates: competitorRates,
      });

      setScriptText(data?.script || data?.negotiation_text || "");
    } catch (err) {
      setError(err?.response?.data?.detail || err.message || "Failed to generate script");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generate(tone);
  }, [tone, result, formValues]);

  const handleCopy = () => {
    navigator.clipboard.writeText(scriptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const element = document.createElement("a");
    const file = new Blob([scriptText], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `Loan_Rate_Negotiation_${formValues?.bank || "Bank"}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="space-y-6 fade-in-up">
      {/* Title */}
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-white" style={{ fontFamily: "Outfit, sans-serif" }}>
          ✍️ AI Rate Negotiation Script Generator
        </h2>
        <p className="text-xs sm:text-sm text-slate-400">
          Arm yourself with data-driven counter-offers, quoting competitive bank benchmarks and SHAP risk factors.
        </p>
      </div>

      {/* Tone Selector */}
      <div className="glass p-4 rounded-xl flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
          Select Communication Tone:
        </span>
        <div className="flex gap-2">
          {["polite", "firm", "formal"].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTone(t)}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                tone === t
                  ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/25"
                  : "bg-slate-800/80 text-slate-400 hover:text-white"
              }`}
            >
              {t === "polite" && "🤝 "}
              {t === "firm" && "💪 "}
              {t === "formal" && "🏛️ "}
              {t}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="p-3 bg-red-500/20 border border-red-500 text-red-200 text-xs rounded-xl">{error}</div>}

      {/* Script Editor & Actions */}
      <div className="glass p-5 rounded-2xl border border-indigo-500/25 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">
            {loading ? "Generating tailored negotiation script..." : "Editable Draft Preview:"}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 border border-indigo-500/30 text-xs font-semibold cursor-pointer flex items-center gap-1.5 transition-colors"
            >
              <span>{copied ? "✅ Copied!" : "📋 Copy"}</span>
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="px-3 py-1.5 rounded-lg bg-teal-500/20 text-teal-300 hover:bg-teal-500/30 border border-teal-500/30 text-xs font-semibold cursor-pointer flex items-center gap-1.5 transition-colors"
            >
              <span>💾 Download (.txt)</span>
            </button>
          </div>
        </div>

        <textarea
          rows={14}
          value={scriptText}
          onChange={(e) => setScriptText(e.target.value)}
          className="form-input text-xs font-mono leading-relaxed resize-y"
          placeholder="Generating script..."
        />
      </div>
    </div>
  );
}
