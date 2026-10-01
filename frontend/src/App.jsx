import React, { useState, useRef, useEffect, Suspense, lazy } from "react";
import { useTranslation } from "react-i18next";
import { predictFairRateV2, fetchModelRegistry } from "./api";
import LoginPage from "./components/LoginPage";
import ErrorBoundary from "./components/ErrorBoundary";
import "./index.css";

// ── Lazy Loaded Section Components ──
const LoanForm = lazy(() => import("./components/LoanForm"));
const VerdictCard = lazy(() => import("./components/VerdictCard"));
const ShapWaterfall = lazy(() => import("./components/ShapWaterfall"));
const WhatIfSimulator = lazy(() => import("./components/WhatIfSimulator"));
const BankComparison = lazy(() => import("./components/BankComparison"));

// Plan Suite
const PrepaymentCalculator = lazy(() => import("./components/PrepaymentCalculator"));
const BalanceTransferCalculator = lazy(() => import("./components/BalanceTransferCalculator"));
const AprCalculator = lazy(() => import("./components/AprCalculator"));
const RepoSimulator = lazy(() => import("./components/RepoSimulator"));
const CreditImprovementPlanner = lazy(() => import("./components/CreditImprovementPlanner"));

// Tools Suite
const OfferParser = lazy(() => import("./components/OfferParser"));
const AiNegotiationScript = lazy(() => import("./components/AiNegotiationScript"));
const ChatAssistant = lazy(() => import("./components/ChatAssistant"));
const ShareResultModal = lazy(() => import("./components/ShareResultModal"));

// Model Lab Suite
const FairnessAuditView = lazy(() => import("./components/FairnessAuditView"));
const ModelComparisonView = lazy(() => import("./components/ModelComparisonView"));
const PredictionIntervalsView = lazy(() => import("./components/PredictionIntervalsView"));
const DataSourcesView = lazy(() => import("./components/DataSourcesView"));
const DriftMonitorView = lazy(() => import("./components/DriftMonitorView"));

// ── Navigation Configuration ──
const NAV_GROUPS = [
  {
    id: "analyze",
    titleKey: "nav.analyzeGroup",
    defaultTitle: "Analyze",
    icon: "🔍",
    items: [
      { id: "profile", labelKey: "nav.profile", defaultLabel: "Profile", icon: "📋" },
      { id: "verdict", labelKey: "nav.verdict", defaultLabel: "Verdict", icon: "⚖️" },
      { id: "shap", labelKey: "nav.shap", defaultLabel: "Why (SHAP)", icon: "🌊" },
      { id: "compare", labelKey: "nav.compare", defaultLabel: "Compare", icon: "🏦" },
      { id: "what_if", labelKey: "nav.whatIf", defaultLabel: "What-If", icon: "🎛️" },
    ],
  },
  {
    id: "plan",
    titleKey: "nav.planGroup",
    defaultTitle: "Plan",
    icon: "📈",
    items: [
      { id: "prepayment", labelKey: "nav.prepayment", defaultLabel: "EMI & Prepay", icon: "⚡" },
      { id: "balance_transfer", labelKey: "nav.balanceTransfer", defaultLabel: "Balance Transfer", icon: "🔄" },
      { id: "apr", labelKey: "nav.apr", defaultLabel: "True Cost (APR)", icon: "💳" },
      { id: "repo", labelKey: "nav.repo", defaultLabel: "Repo-Linked", icon: "🏛️" },
      { id: "credit_planner", labelKey: "nav.creditPlanner", defaultLabel: "Credit Planner", icon: "⭐" },
    ],
  },
  {
    id: "tools",
    titleKey: "nav.toolsGroup",
    defaultTitle: "Tools",
    icon: "🛠️",
    items: [
      { id: "upload_offer", labelKey: "nav.uploadOffer", defaultLabel: "Upload Offer", icon: "📄" },
      { id: "negotiation_script", labelKey: "nav.negotiationScript", defaultLabel: "Negotiation Script", icon: "✍️" },
      { id: "chat_assistant", labelKey: "nav.chatAssistant", defaultLabel: "Chat Assistant", icon: "💬" },
      { id: "share", labelKey: "nav.share", defaultLabel: "Share Result", icon: "📤" },
    ],
  },
  {
    id: "model_lab",
    titleKey: "nav.modelLabGroup",
    defaultTitle: "Model Lab",
    icon: "🔬",
    items: [
      { id: "fairness_audit", labelKey: "nav.fairnessAudit", defaultLabel: "Fairness Audit", icon: "⚖️" },
      { id: "model_comparison", labelKey: "nav.modelComparison", defaultLabel: "Model Comparison", icon: "📊" },
      { id: "prediction_intervals", labelKey: "nav.predictionIntervals", defaultLabel: "Prediction Intervals", icon: "📐" },
      { id: "data_sources", labelKey: "nav.dataSources", defaultLabel: "Data Sources", icon: "📑" },
      { id: "drift_monitor", labelKey: "nav.driftMonitor", defaultLabel: "Drift Monitor", icon: "📡" },
    ],
  },
];

function SectionLoader() {
  return (
    <div className="glass rounded-2xl p-12 text-center animate-pulse space-y-3">
      <div className="spinner mx-auto" />
      <p className="text-xs text-slate-400">Loading module...</p>
    </div>
  );
}

function PromptCard({ onGoToProfile, title, desc, icon = "📋" }) {
  return (
    <div className="glass rounded-2xl p-10 text-center max-w-xl mx-auto border border-indigo-500/20 fade-in-up">
      <div className="text-5xl mb-4">{icon}</div>
      <h3 className="text-lg font-bold text-white mb-2" style={{ fontFamily: "Outfit, sans-serif" }}>
        {title || "Check Rate Fairness First"}
      </h3>
      <p className="text-xs text-slate-400 leading-relaxed mb-6">
        {desc || "Fill out your loan profile in the Profile tab and submit it to unlock your ML rate verdict, SHAP explainability, and multi-bank comparison."}
      </p>
      <button
        type="button"
        onClick={onGoToProfile}
        className="btn-primary !w-auto px-6 py-2.5 rounded-xl font-bold text-xs inline-flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-500/25 hover:scale-105 transition-transform"
      >
        <span>📋</span>
        <span>Go to Loan Profile</span>
      </button>
    </div>
  );
}

export default function App() {
  const { t, i18n } = useTranslation();
  const [activeSection, setActiveSection] = useState("profile");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem("fairrate_theme") || "dark");
  const [modelVersion, setModelVersion] = useState("v2.0.0");

  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem("fairrate_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const handleLogin = (userData) => {
    setUser(userData);
    try {
      localStorage.setItem("fairrate_user", JSON.stringify(userData));
    } catch (e) {
      console.error("Failed to persist user session:", e);
    }
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem("fairrate_user");
    } catch (e) {}
    setUser(null);
    setResult(null);
    setFormValues({
      loan_type: "personal",
      bank: "HDFC",
      credit_score: 600,
      annual_income_lakh: 0,
      employment_type: "salaried",
      loan_amount_lakh: 0,
      tenure_years: 5,
      ltv_ratio: 0.75,
      existing_obligations_pct: 0,
      offered_rate: 0,
    });
    setActiveSection("profile");
  };

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

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("fairrate_theme", theme);
  }, [theme]);

  // Fetch model active version
  useEffect(() => {
    fetchModelRegistry()
      .then((res) => {
        if (res.current_version) setModelVersion(res.current_version);
      })
      .catch(() => {});
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const handleLanguageChange = (lng) => {
    i18n.changeLanguage(lng);
    localStorage.setItem("fairrate_language", lng);
  };

  const handleSubmit = async (payload) => {
    setLoading(true);
    setError(null);
    setFormValues(payload);

    try {
      // Use predict-v2 to get quantile prediction intervals
      const data = await predictFairRateV2(payload);
      setResult(data);
      setActiveSection("verdict");
    } catch (err) {
      const detail = err?.response?.data?.detail || err.message || "Prediction failed. Check backend connection.";
      setError(detail);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyOffer = (extractedValues) => {
    setFormValues((prev) => ({ ...prev, ...extractedValues }));
    setActiveSection("profile");
  };

  const hasResult = Boolean(result);

  // Show login page if not authenticated
  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row relative text-slate-100 bg-[var(--color-bg)] transition-colors">
      {/* Background Glow */}
      <div className="animated-bg" />

      {/* ── SIDEBAR NAVIGATION (Desktop) ── */}
      <aside className="hidden md:flex flex-col w-64 lg:w-72 bg-slate-950/80 backdrop-blur-2xl border-r border-indigo-500/15 p-4 z-30 shrink-0 sticky top-0 h-screen overflow-y-auto">
        {/* Brand */}
        <div className="flex items-center gap-3 px-2 py-3 mb-4">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl shadow-lg shrink-0"
            style={{ background: "linear-gradient(135deg, #6366f1, #a855f7)" }}
          >
            ⚖️
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-xl gradient-text tracking-tight" style={{ fontFamily: "Outfit, sans-serif" }}>
                FAIRRATE
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                PRO
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">Rate Fairness Suite</p>
          </div>
        </div>

        {/* Grouped Nav Items */}
        <nav className="flex-1 space-y-5">
          {NAV_GROUPS.map((group) => (
            <div key={group.id} className="space-y-1">
              <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <span>{group.icon}</span>
                <span>{t(group.titleKey, group.defaultTitle)}</span>
              </div>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = activeSection === item.id;
                  const isLocked = ["verdict", "shap", "compare", "what_if"].includes(item.id) && !hasResult;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      id={`nav-item-${item.id}`}
                      onClick={() => setActiveSection(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        isActive
                          ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/20 font-bold"
                          : isLocked
                          ? "text-slate-500 hover:text-slate-300 hover:bg-slate-900/40"
                          : "text-slate-300 hover:text-white hover:bg-slate-900/60"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <span className="text-sm">{item.icon}</span>
                        <span className="truncate">{t(item.labelKey, item.defaultLabel)}</span>
                      </div>
                      {isLocked && <span className="text-[10px] text-slate-600 font-mono">🔒</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Sidebar Controls (Theme, Lang & User) */}
        <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-3">
          <div className="flex items-center justify-between px-2">
            <span className="text-[11px] text-slate-400 font-semibold">Theme</span>
            <button
              type="button"
              onClick={toggleTheme}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs cursor-pointer flex items-center gap-1.5"
            >
              <span>{theme === "dark" ? "🌙 Dark" : "☀️ Light"}</span>
            </button>
          </div>

          <div className="flex items-center justify-between px-2">
            <span className="text-[11px] text-slate-400 font-semibold">Language</span>
            <div className="flex gap-1">
              {[
                { code: "en", label: "EN" },
                { code: "ta", label: "தமிழ்" },
                { code: "hi", label: "हिन्दी" },
              ].map((lng) => (
                <button
                  key={lng.code}
                  type="button"
                  onClick={() => handleLanguageChange(lng.code)}
                  className={`px-2 py-1 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                    i18n.language === lng.code
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-900 text-slate-400 hover:text-white"
                  }`}
                >
                  {lng.label}
                </button>
              ))}
            </div>
          </div>

          {/* User info + Sign Out */}
          <div className="px-2 pt-2 border-t border-slate-800/60">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-200 truncate">{user?.name || "User"}</p>
                <p className="text-[10px] text-slate-500 truncate">{user?.email || ""}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="w-full text-[11px] font-semibold text-slate-400 hover:text-red-400 px-2 py-1.5 rounded-lg bg-slate-900/60 hover:bg-red-500/10 border border-slate-800 hover:border-red-500/30 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <span>🚪</span>
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ── MOBILE HEADER & DRAWER ── */}
      <div className="md:hidden sticky top-0 z-40 bg-slate-950/90 backdrop-blur-xl border-b border-indigo-500/15 p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">⚖️</span>
          <span className="font-black text-lg gradient-text" style={{ fontFamily: "Outfit, sans-serif" }}>
            FAIRRATE
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs"
          >
            {theme === "dark" ? "🌙" : "☀️"}
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold cursor-pointer"
          >
            {mobileMenuOpen ? "✕ Close" : "☰ Menu"}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden z-30 bg-slate-950/95 border-b border-indigo-500/20 p-4 space-y-4 max-h-[80vh] overflow-y-auto">
          {NAV_GROUPS.map((group) => (
            <div key={group.id} className="space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-500 px-2">
                {t(group.titleKey, group.defaultTitle)}
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveSection(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`p-2 rounded-xl text-left text-xs font-semibold flex items-center gap-2 ${
                      activeSection === item.id
                        ? "bg-indigo-600 text-white font-bold"
                        : "bg-slate-900/60 text-slate-300"
                    }`}
                  >
                    <span>{item.icon}</span>
                    <span className="truncate">{t(item.labelKey, item.defaultLabel)}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* Language Switcher in Mobile Drawer */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold">Language</span>
            <div className="flex gap-1.5">
              {["en", "ta", "hi"].map((lng) => (
                <button
                  key={lng}
                  type="button"
                  onClick={() => handleLanguageChange(lng)}
                  className={`px-2.5 py-1 rounded text-xs font-bold ${
                    i18n.language === lng ? "bg-indigo-600 text-white" : "bg-slate-900 text-slate-400"
                  }`}
                >
                  {lng.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── MAIN WORKSPACE ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Active Profile Summary Bar */}
        {hasResult && activeSection !== "profile" && (
          <div className="bg-slate-950/40 border-b border-indigo-500/10 px-4 py-2.5">
            <div className="max-w-5xl mx-auto flex items-center justify-between gap-3 text-xs flex-wrap">
              <div className="flex items-center gap-2 flex-wrap text-slate-300">
                <span className="text-slate-500 font-medium">Profile:</span>
                <span className="font-bold text-white capitalize">{formValues.loan_type} Loan</span>
                <span className="text-slate-600">•</span>
                <span className="font-semibold text-indigo-300">{formValues.bank}</span>
                <span className="text-slate-600">•</span>
                <span className="font-semibold text-indigo-300">₹{formValues.loan_amount_lakh}L</span>
                <span className="text-slate-600">•</span>
                <span className="font-semibold text-amber-300">{formValues.offered_rate}% Offered</span>
                <span className="text-slate-600">•</span>
                <span className="font-semibold text-emerald-400">{formValues.credit_score} CIBIL</span>
              </div>

              <button
                type="button"
                onClick={() => setActiveSection("profile")}
                className="text-[11px] font-bold text-indigo-300 hover:text-white px-2.5 py-1 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/30 border border-indigo-500/30 transition-colors cursor-pointer"
              >
                ✏️ Edit Profile
              </button>
            </div>
          </div>
        )}

        <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          {error && (
            <div className="glass rounded-2xl p-4 border border-red-500/40 bg-red-500/10 mb-6 text-xs text-red-300 flex items-start gap-2.5 fade-in-up">
              <span className="text-base">❌</span>
              <div>
                <p className="font-bold mb-0.5">Request Error</p>
                <p>{error}</p>
              </div>
            </div>
          )}

          <ErrorBoundary onReset={() => setActiveSection(activeSection)} fallbackToProfile={() => setActiveSection("profile")}>
            <Suspense fallback={<SectionLoader />}>
              {/* ── 1. ANALYZE GROUP ── */}
              {activeSection === "profile" && (
                <div className="max-w-2xl mx-auto fade-in-up">
                  <div className="mb-6 text-center">
                    <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2" style={{ fontFamily: "Outfit, sans-serif" }}>
                      Loan Rate Fairness Profile
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto">
                      Enter your loan parameters, pick an archetypal persona, or upload your sanction letter to test rate fairness.
                    </p>
                  </div>
                  <div className="glass rounded-2xl p-6 sm:p-8 border border-indigo-500/25">
                    <LoanForm onSubmit={handleSubmit} loading={loading} values={formValues} />
                  </div>
                </div>
              )}

              {activeSection === "verdict" && (
                <div className="max-w-3xl mx-auto fade-in-up">
                  {!hasResult ? (
                    <PromptCard
                      onGoToProfile={() => setActiveSection("profile")}
                      title="No Rate Verdict Available Yet"
                      desc="Submit your loan profile to view the AI fairness verdict, rate spread, reducing-balance EMI impact, and bank negotiation script."
                    />
                  ) : (
                    <VerdictCard result={result} formValues={formValues} loanType={formValues.loan_type} />
                  )}
                </div>
              )}

              {activeSection === "shap" && (
                <div className="max-w-4xl mx-auto space-y-6 fade-in-up">
                  {!hasResult ? (
                    <PromptCard
                      onGoToProfile={() => setActiveSection("profile")}
                      icon="🌊"
                      title="SHAP Explainability Locked"
                      desc="Run a check on the Profile tab to view the step-by-step SHAP waterfall impact factors."
                    />
                  ) : (
                    <div className="glass rounded-2xl p-6 border border-indigo-500/25">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-xl">🌊</span>
                        <div>
                          <h3 className="text-base font-bold text-white tracking-tight" style={{ fontFamily: "Outfit, sans-serif" }}>
                            SHAP Feature Impact Waterfall
                          </h3>
                          <p className="text-xs text-slate-400">
                            Marginal contribution of each risk attribute toward your predicted fair rate
                          </p>
                        </div>
                      </div>
                      <ShapWaterfall result={result} />
                    </div>
                  )}
                </div>
              )}

              {activeSection === "compare" && (
                <div className="max-w-4xl mx-auto fade-in-up">
                  {!hasResult ? (
                    <PromptCard
                      onGoToProfile={() => setActiveSection("profile")}
                      icon="🏦"
                      title="Bank Comparison Locked"
                      desc="Submit your loan profile to compare rates across all 11 Indian banks and NBFCs."
                    />
                  ) : (
                    <BankComparison result={result} formValues={formValues} />
                  )}
                </div>
              )}

              {activeSection === "what_if" && (
                <div className="max-w-4xl mx-auto fade-in-up">
                  {!hasResult ? (
                    <PromptCard
                      onGoToProfile={() => setActiveSection("profile")}
                      icon="🎛️"
                      title="What-If Simulator Locked"
                      desc="Submit your loan profile to explore how tweaking credit score, tenure, or loan amount changes your rate."
                    />
                  ) : (
                    <WhatIfSimulator result={result} formValues={formValues} />
                  )}
                </div>
              )}

              {/* ── 2. PLAN GROUP ── */}
              {activeSection === "prepayment" && <PrepaymentCalculator formValues={formValues} />}
              {activeSection === "balance_transfer" && <BalanceTransferCalculator formValues={formValues} />}
              {activeSection === "apr" && <AprCalculator formValues={formValues} />}
              {activeSection === "repo" && <RepoSimulator formValues={formValues} />}
              {activeSection === "credit_planner" && <CreditImprovementPlanner formValues={formValues} />}

              {/* ── 3. TOOLS GROUP ── */}
              {activeSection === "upload_offer" && <OfferParser onApplyToProfile={handleApplyOffer} />}
              {activeSection === "negotiation_script" && (
                <AiNegotiationScript result={result} formValues={formValues} />
              )}
              {activeSection === "chat_assistant" && <ChatAssistant result={result} formValues={formValues} />}
              {activeSection === "share" && <ShareResultModal result={result} formValues={formValues} />}

              {/* ── 4. MODEL LAB GROUP ── */}
              {activeSection === "fairness_audit" && <FairnessAuditView />}
              {activeSection === "model_comparison" && <ModelComparisonView />}
              {activeSection === "prediction_intervals" && (
                <PredictionIntervalsView result={result} formValues={formValues} />
              )}
              {activeSection === "data_sources" && <DataSourcesView />}
              {activeSection === "drift_monitor" && <DriftMonitorView />}
            </Suspense>
          </ErrorBoundary>
        </main>

        {/* ── FOOTER WITH MODEL VERSION & PERSISTENT DISCLAIMER ── */}
        <footer className="mt-auto py-5 px-4 text-center border-t border-slate-800/80 bg-slate-950/70 text-slate-500 text-xs">
          <div className="max-w-4xl mx-auto space-y-1.5">
            <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 font-mono">
              <span>{t("common.activeVersion", "Active ML Model")}:</span>
              <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
                {modelVersion}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              ⚠️ <strong className="text-slate-300">Educational Use Only:</strong> {t("disclaimer")}
            </p>
          </div>
        </footer>
      </div>

      {/* ── MOBILE BOTTOM NAVIGATION BAR ── */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-indigo-500/20 px-2 py-1.5 flex items-center justify-around">
        {[
          { id: "profile", label: "Profile", icon: "📋" },
          { id: "verdict", label: "Verdict", icon: "⚖️" },
          { id: "prepayment", label: "Prepay", icon: "⚡" },
          { id: "apr", label: "APR", icon: "💳" },
          { id: "upload_offer", label: "Offer", icon: "📄" },
          { id: "chat_assistant", label: "Chat", icon: "💬" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveSection(tab.id)}
            className={`flex flex-col items-center p-1 rounded-lg text-[10px] font-semibold transition-all ${
              activeSection === tab.id ? "text-indigo-400 font-bold scale-105" : "text-slate-400 hover:text-white"
            }`}
          >
            <span className="text-base">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
