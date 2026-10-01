import React, { useState } from "react";
import { parseOfferLetter } from "../api";

export default function OfferParser({ onApplyToProfile }) {
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [extracted, setExtracted] = useState(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = async (selectedFile) => {
    setFile(selectedFile);
    setLoading(true);
    setError(null);
    setExtracted(null);

    try {
      const data = await parseOfferLetter(selectedFile);
      setExtracted(data);
    } catch (err) {
      setError(err?.response?.data?.detail || err.message || "Failed to parse sanction letter");
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (field, val) => {
    setExtracted((prev) => ({ ...prev, [field]: val }));
  };

  const handleApply = () => {
    if (!extracted) return;
    if (onApplyToProfile) {
      onApplyToProfile({
        loan_amount_lakh: Number(extracted.loan_amount_lakh || 10),
        offered_rate: Number(extracted.offered_rate || 10.5),
        tenure_years: Number(extracted.tenure_years || 5),
        bank: extracted.bank || "HDFC",
        loan_type: extracted.loan_type || "personal",
      });
    }
  };

  return (
    <div className="space-y-6 fade-in-up">
      {/* Title */}
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-white" style={{ fontFamily: "Outfit, sans-serif" }}>
          📄 Upload & Parse Sanction Letter
        </h2>
        <p className="text-xs sm:text-sm text-slate-400">
          Upload a bank loan sanction letter or loan offer (PDF or Image) to extract terms automatically via AI.
        </p>
      </div>

      {/* Privacy Notice */}
      <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center gap-3 text-xs text-indigo-300">
        <span className="text-lg">🔒</span>
        <span>
          <strong>Zero Storage Guarantee:</strong> Your uploaded documents are processed entirely in-memory and immediately destroyed. Files are never saved or stored on our servers.
        </span>
      </div>

      {/* Drag & Drop Zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
          dragActive
            ? "border-indigo-400 bg-indigo-500/15"
            : "border-slate-700 bg-slate-900/40 hover:border-slate-500"
        }`}
        onClick={() => document.getElementById("offer-file-input")?.click()}
      >
        <input
          id="offer-file-input"
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.webp"
          className="hidden"
          onChange={handleFileChange}
        />
        <div className="text-4xl mb-3">📤</div>
        <h3 className="text-sm font-bold text-white mb-1">
          {file ? file.name : "Click to select or drag and drop your sanction letter"}
        </h3>
        <p className="text-xs text-slate-500">Supports PDF, PNG, JPG (Max 10 MB)</p>
      </div>

      {loading && (
        <div className="glass p-6 text-center rounded-xl space-y-2">
          <div className="spinner mx-auto" />
          <p className="text-xs text-slate-300">Extracting terms via intelligent OCR parser...</p>
        </div>
      )}

      {error && <div className="p-3 bg-red-500/20 border border-red-500 text-red-200 text-xs rounded-xl">{error}</div>}

      {/* Extracted Fields Editor */}
      {extracted && (
        <div className="glass p-6 rounded-2xl border border-teal-500/30 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-xs uppercase font-extrabold tracking-wider text-teal-400">
                Extracted Data Preview (Editable)
              </span>
              <h3 className="text-lg font-bold text-white">Review Before Applying to Profile</h3>
            </div>
            <span className="text-xs px-2.5 py-1 rounded bg-teal-500/20 text-teal-300 font-mono">
              Parser: {extracted.parser_used || "AI / Heuristic"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Bank Name</label>
              <input
                type="text"
                value={extracted.bank || ""}
                onChange={(e) => handleFieldChange("bank", e.target.value)}
                className="form-input text-xs"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Loan Type</label>
              <input
                type="text"
                value={extracted.loan_type || ""}
                onChange={(e) => handleFieldChange("loan_type", e.target.value)}
                className="form-input text-xs"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Offered Rate (% p.a.)</label>
              <input
                type="number"
                step="0.05"
                value={extracted.offered_rate || ""}
                onChange={(e) => handleFieldChange("offered_rate", Number(e.target.value))}
                className="form-input text-xs font-bold text-amber-400"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Sanctioned Amount (₹ Lakh)</label>
              <input
                type="number"
                step="0.5"
                value={extracted.loan_amount_lakh || ""}
                onChange={(e) => handleFieldChange("loan_amount_lakh", Number(e.target.value))}
                className="form-input text-xs font-bold text-teal-400"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Tenure (Years)</label>
              <input
                type="number"
                value={extracted.tenure_years || ""}
                onChange={(e) => handleFieldChange("tenure_years", Number(e.target.value))}
                className="form-input text-xs"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Processing Fees (₹)</label>
              <input
                type="number"
                value={extracted.processing_fee_inr || 0}
                onChange={(e) => handleFieldChange("processing_fee_inr", Number(e.target.value))}
                className="form-input text-xs"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleApply}
            className="btn-primary w-full py-3 rounded-xl font-bold text-sm cursor-pointer flex items-center justify-center gap-2"
          >
            <span>🚀</span>
            <span>Analyze this offer in Loan Profile</span>
          </button>
        </div>
      )}
    </div>
  );
}
