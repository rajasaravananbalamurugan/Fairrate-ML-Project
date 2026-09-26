import React, { useState, useRef, useEffect } from "react";
import LoanForm from "./components/LoanForm";
import VerdictCard from "./components/VerdictCard";
import RateTable from "./components/RateTable";
import ReasonsList from "./components/ReasonsList";
import BankComparison from "./components/BankComparison";
import ShapWaterfall from "./components/ShapWaterfall";
import WhatIfSimulator from "./components/WhatIfSimulator";
import EmiTenureChart from "./components/EmiTenureChart";
import HistoryPanel from "./components/HistoryPanel";
import { predictFairRate, healthCheck } from "./api";
import "./index.css";

function Navbar() {
  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50"
      style={{
        background: "rgba(8,15,30,0.88)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderBottom: "1px solid rgba(99,102,241,0.12)",
      }}
    >
      <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
            style={{ background: "linear-gradient(135deg, #6366f1, #a855f7, #ec4899)" }}
          >
            ⚖️
          </div>
          <div>
            <span
              className="font-black text-xl gradient-text"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              FAIRRATE
            </span>
            <span className="text-slate-500 text-xs ml-2 hidden sm:inline">by AI</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-slate-500 hidden md:inline">🇮🇳 Indian Banking System</span>
          <span
            className="text-xs px-2.5 py-1 rounded-full font-semibold"
            style={{
              background: "rgba(99,102,241,0.12)",
              border: "1px solid rgba(99,102,241,0.3)",
              color: "#818cf8",
            }}
          >
            ML Powered
          </span>
        </div>
      </div>
    </nav>
  );
}

function HeroSection() {
  return (
    <div className="text-center mb-6 pt-24">
      <div
        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-6"
        style={{
          background: "rgba(99,102,241,0.1)",
          border: "1px solid rgba(99,102,241,0.3)",
          color: "#a78bfa",
        }}
      >
        <span
          className="w-2 h-2 rounded-full animate-pulse inline-block"
          style={{ background: "linear-gradient(135deg, #6366f1, #ec4899)" }}
        ></span>
        Trained on 5,000+ synthetic loan records • RBI-aligned rate logic
      </div>

      <h1
        className="text-4xl sm:text-5xl font-black mb-4 leading-tight"
        style={{ fontFamily: "Outfit, sans-serif" }}
      >
        Is your <span className="gradient-text">loan rate fair?</span>
      </h1>

      <p className="text-slate-400 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
        Enter your borrower profile and the interest rate your bank offered. Our ML model will tell
        you if you're getting a{" "}
        <span style={{ color: "#2dd4bf" }} className="font-semibold">
          fair deal
        </span>{" "}
        — or if you should{" "}
        <span style={{ color: "#fb923c" }} className="font-semibold">
          negotiate harder
        </span>
        .
      </p>

      <div className="flex items-center justify-center gap-6 mt-6 text-sm text-slate-500 flex-wrap">
        <span>✓ SBI · HDFC · ICICI · Axis · Kotak</span>
        <span>✓ 4 loan types</span>
        <span>✓ SHAP explainability</span>
      </div>
    </div>
  );
}

function APIStatusBanner({ status }) {
  if (status === "ok") return null;
  if (status === "loading") return null;

  return (
    <div className="max-w-5xl mx-auto px-4 mb-4">
      <div className="rounded-xl p-3 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm text-center">
        ⚠️ Backend not connected. Run <code className="bg-black/30 px-1 rounded">uvicorn backend.main:app --reload</code> then train the model.
      </div>
    </div>
  );
}

export default function App() {
  const [result, setResult] = useState(null);
  const [formValues, setFormValues] = useState({
    loan_type: "personal",
    bank: "HDFC",
    credit_score: 720,
    annual_income_lakh: 12,
    employment_type: "salaried",
    loan_amount_lakh: 5,
    tenure_years: 3,
    ltv_ratio: 0.75,
    existing_obligations_pct: 20,
    offered_rate: 13.5,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [apiStatus, setApiStatus] = useState("loading");
  const [loanType, setLoanType] = useState("personal");

  // Feature 7: localStorage history (max 5 items)
  const [history, setHistory] = useState(() => {
    try {
      const stored = localStorage.getItem("fairrate_history");
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  });

  const resultsRef = useRef(null);

  useEffect(() => {
    healthCheck()
      .then(() => setApiStatus("ok"))
      .catch(() => setApiStatus("error"));
  }, []);

  const handleSubmit = async (payload) => {
    setLoading(true);
    setError(null);
    setFormValues(payload);
    setLoanType(payload.loan_type);

    try {
      const data = await predictFairRate(payload);
      setResult(data);

      // Save to localStorage (Feature 7)
      const newItem = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        loan_type: payload.loan_type,
        bank: payload.bank,
        offered_rate: payload.offered_rate,
        predicted_rate: data.fair_rate,
        verdict: data.verdict,
        credit_score: payload.credit_score,
        formValues: payload,
      };

      setHistory((prev) => {
        const next = [newItem, ...prev.filter((i) => i.id !== newItem.id)].slice(0, 5);
        try {
          localStorage.setItem("fairrate_history", JSON.stringify(next));
        } catch (e) {}
        return next;
      });

      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (err) {
      const detail = err?.response?.data?.detail || err.message || "Prediction failed.";
      setError(detail);
    } finally {
      setLoading(false);
    }
  };

  const handleReplay = (historicValues) => {
    setFormValues(historicValues);
    handleSubmit(historicValues);
  };

  const handleClearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem("fairrate_history");
    } catch (e) {}
  };

  return (
    <div style={{ minHeight: "100vh", position: "relative" }}>
      {/* Animated background blobs */}
      <div className="animated-bg" />

      <Navbar />

      <div style={{ position: "relative", zIndex: 1 }}>
        <div className="max-w-6xl mx-auto px-4 pb-20">
          <HeroSection />
          <APIStatusBanner status={apiStatus} />

          {/* Feature 7: Past Checks History Accordion (above the form) */}
          <HistoryPanel
            onReplay={handleReplay}
            currentHistory={history}
            onClearHistory={handleClearHistory}
          />

          <div className="grid lg:grid-cols-[480px_1fr] gap-6 items-start">
            {/* ── Left: Form ── */}
            <div
              className="glass rounded-2xl p-6"
              style={{ borderColor: "rgba(99,102,241,0.15)" }}
            >
              <div className="flex items-center gap-2.5 mb-6">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(99,102,241,0.25), rgba(168,85,247,0.15))",
                  }}
                >
                  📋
                </div>
                <h2
                  className="text-base font-bold text-white"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  Your Loan Profile
                </h2>
              </div>
              <LoanForm onSubmit={handleSubmit} loading={loading} values={formValues} />
            </div>

            {/* ── Right: Results ── */}
            <div ref={resultsRef}>
              {!result && !loading && !error && (
                <div
                  className="glass rounded-2xl p-10 text-center"
                  style={{ borderColor: "rgba(99,102,241,0.12)" }}
                >
                  <div className="text-6xl mb-4">🎯</div>
                  <h3
                    className="text-xl font-bold text-slate-200 mb-2"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    Ready to Check
                  </h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Fill in your loan details on the left and click{" "}
                    <strong className="text-indigo-300">"Check Rate Fairness"</strong>. We'll analyze
                    your profile using machine learning trained on Indian bank rate data.
                  </p>
                  <div className="mt-8 grid grid-cols-3 gap-4">
                    {[
                      { icon: "🤖", label: "ML Prediction", sub: "Gradient Boosting", color: "#6366f1" },
                      { icon: "🔍", label: "SHAP Reasons", sub: "Impact breakdown", color: "#a855f7" },
                      { icon: "📊", label: "Benchmarks", sub: "5 major banks", color: "#ec4899" },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="rounded-xl p-4"
                        style={{
                          background: `${item.color}0a`,
                          border: `1px solid ${item.color}25`,
                        }}
                      >
                        <div className="text-2xl mb-1">{item.icon}</div>
                        <div className="text-xs font-bold text-slate-200">{item.label}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{item.sub}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <div className="glass rounded-2xl p-6 border border-red-500/30 bg-red-500/5 fade-in-up">
                  <div className="text-3xl mb-3">❌</div>
                  <h3 className="text-base font-bold text-red-400 mb-1">Prediction Error</h3>
                  <p className="text-sm text-slate-400">{error}</p>
                  <p className="text-xs text-slate-500 mt-3">
                    Make sure the backend is running and the model is trained.
                  </p>
                </div>
              )}

              {result && (
                <div className="space-y-6">
                  {/* VerdictCard (Feature 4: Download Report + Feature 5: Confidence Interval) */}
                  <div className="glass rounded-2xl p-6">
                    <VerdictCard result={result} loanType={loanType} />
                  </div>

                  {/* Feature 2: SHAP Waterfall Chart (immediately below verdict) */}
                  <ShapWaterfall result={result} />

                  {/* Feature 1: Multi-Bank Comparison (below waterfall) */}
                  <BankComparison result={result} formValues={formValues} />

                  {/* Feature 3: What-If Simulator (below bank comparison) */}
                  <WhatIfSimulator result={result} formValues={formValues} />

                  {/* Feature 6: EMI vs Tenure Line Chart (last, in collapsible section) */}
                  <EmiTenureChart result={result} formValues={formValues} />

                  {/* SHAP Reasons */}
                  {result.top_reasons?.length > 0 && (
                    <div className="glass rounded-2xl p-6">
                      <ReasonsList reasons={result.top_reasons} />
                    </div>
                  )}

                  {/* Benchmark Table */}
                  {result.benchmark_rates?.length > 0 && (
                    <div className="glass rounded-2xl p-6">
                      <RateTable
                        benchmarkRates={result.benchmark_rates}
                        loanType={loanType}
                        offeredRate={result.offered_rate}
                      />
                    </div>
                  )}

                  {/* CTA */}
                  <div
                    className="glass rounded-2xl p-5 text-center"
                    style={{
                      background: "rgba(99,102,241,0.05)",
                      borderColor: "rgba(99,102,241,0.18)",
                    }}
                  >
                    <p className="text-sm text-slate-400">
                      💡 <strong style={{ color: "#c084fc" }}>Tip:</strong> Use this result as a
                      starting point. Always compare at least 3 lenders before signing any loan
                      agreement.
                    </p>
                    <p className="text-xs text-slate-600 mt-2">
                      Disclaimer: This is an AI-based estimate for educational purposes. Not
                      financial advice.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <footer
          style={{
            borderTop: "1px solid rgba(99,102,241,0.1)",
            background: "rgba(8,15,30,0.85)",
            padding: "16px",
            textAlign: "center",
          }}
        >
          <p className="text-xs text-slate-600">
            FAIRRATE © 2025 · Built with FastAPI + React + scikit-learn · Data sourced from RBI &
            published bank rate cards ·
            <strong className="text-slate-500"> Not financial advice</strong>
          </p>
        </footer>
      </div>
    </div>
  );
}
