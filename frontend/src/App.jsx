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
import LoginPage from "./components/LoginPage";
import DashboardHome from "./components/DashboardHome";
import { predictFairRate, healthCheck } from "./api";
import "./index.css";

const MENU_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: "📊", desc: "Executive metrics, arbitrage & launchpad", badge: "Home" },
  { id: "profile", label: "Loan Profile", icon: "📋", desc: "Borrower profile, income & bank rate form", badge: "Form" },
  { id: "verdict", label: "Rate Verdict", icon: "⚖️", desc: "Fairness, confidence interval & PDF report", badge: "ML" },
  { id: "waterfall", label: "SHAP Waterfall", icon: "🌊", desc: "Step-by-step explainability impact factors", badge: "Explain" },
  { id: "compare", label: "Bank Compare", icon: "🏦", desc: "5 major Indian banks comparison & savings", badge: "5 Banks" },
  { id: "simulator", label: "What-If Simulator", icon: "🎛️", desc: "Interactive credit & tenure sliders", badge: "Live" },
  { id: "emi", label: "EMI vs Tenure", icon: "📈", desc: "1–30 years repayment curve & excess cost", badge: "30 Yrs" },
  { id: "history", label: "Recent Checks", icon: "📜", desc: "Past checks history & instant replay", badge: null },
];

function LeftCornerSidebar({
  isOpen,
  onClose,
  isPinned,
  onTogglePin,
  activeTab,
  onSelectTab,
  historyCount = 0,
  formValues,
  apiStatus,
  onRunForm,
  loading,
  user,
  onLogout,
}) {
  return (
    <>
      {/* Backdrop Overlay when opened and not pinned */}
      {isOpen && !isPinned && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm transition-opacity"
        />
      )}

      {/* ── Left Corner Separated Menu Section (Hidden into top-left corner when closed) ── */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 w-72 xl:w-80 left-corner-menu flex flex-col transition-transform duration-300 ease-out shadow-2xl ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand & System Status */}
        <div className="p-4 border-b border-indigo-500/15 flex items-center justify-between shrink-0">
          <button
            onClick={() => {
              onSelectTab("dashboard");
              if (!isPinned) onClose();
            }}
            className="flex items-center gap-2.5 bg-transparent border-none text-left cursor-pointer group p-0"
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-lg group-hover:scale-105 transition-transform"
              style={{ background: "linear-gradient(135deg, #6366f1, #a855f7, #ec4899)" }}
            >
              ⚖️
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span
                  className="font-black text-xl gradient-text tracking-tight"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  FAIRRATE
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  ML
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Interest Fairness Suite</p>
            </div>
          </button>

          {/* Action buttons: Pin + Hide */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={onTogglePin}
              className={`hidden lg:flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg border font-semibold transition-colors cursor-pointer ${
                isPinned
                  ? "bg-indigo-600/30 text-indigo-200 border-indigo-500/40"
                  : "bg-slate-800 text-slate-400 border-slate-700 hover:text-white"
              }`}
              title={isPinned ? "Unpin menu" : "Pin menu to screen"}
            >
              <span>📌</span>
              <span>{isPinned ? "Pinned" : "Pin"}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 cursor-pointer flex items-center gap-1 text-xs"
              aria-label="Hide sections menu"
              title="Hide menu to top-left corner"
            >
              <span>✕</span>
              <span className="text-[10px] hidden sm:inline font-bold">Hide</span>
            </button>
          </div>
        </div>

        {/* Engine Status Banner */}
        <div className="px-4 py-2 bg-slate-950/40 border-b border-slate-800/50 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                apiStatus === "ok"
                  ? "bg-emerald-400 animate-pulse"
                  : apiStatus === "loading"
                  ? "bg-amber-400 animate-pulse"
                  : "bg-red-400"
              }`}
            />
            <span className="text-slate-400 font-medium text-[11px]">
              {apiStatus === "ok"
                ? "Engine Online (GBR)"
                : apiStatus === "loading"
                ? "Connecting..."
                : "Engine Offline"}
            </span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">v1.0.0</span>
        </div>

        {/* Menu Section Header */}
        <div className="px-4 pt-3.5 pb-1.5 flex items-center justify-between shrink-0">
          <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">
            Analysis Menus
          </span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800/80 text-indigo-300 border border-slate-700/60">
            {MENU_ITEMS.length} Sections
          </span>
        </div>

        {/* ── Scrollable Separated Menu Cards ── */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 scrollbar-thin">
          {MENU_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            const badgeValue =
              item.id === "history"
                ? historyCount > 0
                  ? historyCount
                  : null
                : item.badge;

            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  if (!isPinned) onClose();
                }}
                className={`menu-card-item w-full text-left p-2.5 flex items-start gap-3 cursor-pointer group ${
                  isActive ? "active" : ""
                }`}
              >
                {/* Icon Box */}
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 transition-transform group-hover:scale-105 ${
                    isActive
                      ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/30"
                      : "bg-slate-800/90 text-slate-300 border border-slate-700/70 group-hover:border-indigo-500/40"
                  }`}
                >
                  {item.icon}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0 pr-1">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span
                      className={`text-xs font-bold truncate ${
                        isActive ? "text-white" : "text-slate-300 group-hover:text-white"
                      }`}
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      {item.label}
                    </span>
                    {badgeValue && (
                      <span
                        className={`text-[9px] font-black px-1.5 py-0.2 rounded shrink-0 uppercase tracking-wider ${
                          isActive
                            ? "bg-indigo-500/40 text-indigo-200 border border-indigo-400/40"
                            : "bg-slate-800 text-slate-400 border border-slate-700/50"
                        }`}
                      >
                        {badgeValue}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug line-clamp-1 group-hover:text-slate-300">
                    {item.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Profile Snapshot Widget (Bottom of Left Menu Section) */}
        <div className="p-3 border-t border-indigo-500/15 shrink-0 bg-slate-950/60">
          <div className="rounded-xl p-2.5 bg-slate-900/80 border border-indigo-500/20">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Current Input
              </span>
              <button
                onClick={() => {
                  onSelectTab("profile");
                  if (!isPinned) onClose();
                }}
                className="text-[10px] font-bold text-indigo-400 hover:text-indigo-200 transition-colors cursor-pointer flex items-center gap-1"
              >
                <span>✏️</span>
                <span>Edit</span>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-xs mb-2">
              <div className="bg-slate-950/60 rounded p-1 border border-slate-800">
                <span className="text-[9px] text-slate-500 block">Bank</span>
                <span className="font-bold text-slate-200 text-[11px]">{formValues.bank}</span>
              </div>
              <div className="bg-slate-950/60 rounded p-1 border border-slate-800">
                <span className="text-[9px] text-slate-500 block">Amount</span>
                <span className="font-bold text-indigo-300 text-[11px]">
                  ₹{formValues.loan_amount_lakh}L
                </span>
              </div>
              <div className="bg-slate-950/60 rounded p-1 border border-slate-800">
                <span className="text-[9px] text-slate-500 block">Offered</span>
                <span className="font-bold text-amber-300 text-[11px]">
                  {formValues.offered_rate}%
                </span>
              </div>
              <div className="bg-slate-950/60 rounded p-1 border border-slate-800">
                <span className="text-[9px] text-slate-500 block">Credit</span>
                <span className="font-bold text-emerald-400 text-[11px]">
                  {formValues.credit_score}
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                onRunForm();
                if (!isPinned) onClose();
              }}
              disabled={loading}
              className="w-full py-1.5 px-3 rounded-lg text-xs font-bold bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500 hover:from-indigo-600 hover:to-purple-700 text-white shadow-md shadow-indigo-950/60 cursor-pointer flex items-center justify-center gap-1.5 transition-all"
            >
              {loading ? (
                <>
                  <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>Evaluating...</span>
                </>
              ) : (
                <>
                  <span>⚡</span>
                  <span>Evaluate Rate Now</span>
                </>
              )}
            </button>
          </div>

          {/* User profile & sign out at bottom of sidebar */}
          {user && (
            <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between text-xs px-1">
              <div className="flex items-center gap-2 truncate">
                <span className="text-base">{user.avatar || "👤"}</span>
                <div className="truncate">
                  <span className="font-bold text-white text-[11px] block truncate">{user.name}</span>
                  <span className="text-[9px] text-slate-400 block truncate">{user.role}</span>
                </div>
              </div>
              <button
                onClick={onLogout}
                className="text-[10px] text-red-400 hover:text-red-300 font-bold px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20 cursor-pointer shrink-0 transition-colors"
              >
                Sign Out
              </button>
            </div>
          )}

          <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500 px-1">
            <a
              href="http://localhost:8000/docs"
              target="_blank"
              rel="noreferrer"
              className="hover:text-indigo-300 transition-colors"
            >
              📚 API Docs
            </a>
            <span>RBI Base Rate Aligned</span>
          </div>
        </div>
      </aside>
    </>
  );
}


function HeroSection() {
  return (
    <div className="mb-6 pt-2">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-2"
            style={{
              background: "rgba(99,102,241,0.1)",
              border: "1px solid rgba(99,102,241,0.3)",
              color: "#a78bfa",
            }}
          >
            <span
              className="w-2 h-2 rounded-full animate-pulse inline-block"
              style={{ background: "linear-gradient(135deg, #6366f1, #ec4899)" }}
            />
            5,000+ Indian Bank Benchmark Records • RBI Spread Logic
          </div>

          <h1
            className="text-2xl sm:text-3xl lg:text-4xl font-black leading-tight"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Is your <span className="gradient-text">loan rate fair?</span>
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-xl">
            Input your borrower profile to predict true fair interest rates with SHAP explainability
            and 5-bank market benchmarks.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs text-slate-400">
          <span className="px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-800">
            🏛️ 5 Major Banks
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-800">
            📊 SHAP Drivers
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-800">
            ⚡ Instant PDF
          </span>
        </div>
      </div>
    </div>
  );
}

function APIStatusBanner({ status }) {
  if (status === "ok") return null;
  if (status === "loading") return null;

  return (
    <div className="mb-4">
      <div className="rounded-xl p-3 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs text-center">
        ⚠️ Backend not connected. Run <code className="bg-black/30 px-1 rounded">uvicorn backend.main:app --reload</code> then train the model.
      </div>
    </div>
  );
}

function FeaturePlaceholder({ item, formValues, onRun, onEditProfile, loading }) {
  return (
    <div className="glass rounded-2xl p-8 text-center border border-indigo-500/20 fade-in-up">
      <div className="text-5xl mb-3">{item.icon}</div>
      <h3
        className="text-xl font-bold text-white mb-2"
        style={{ fontFamily: "Outfit, sans-serif" }}
      >
        {item.label}
      </h3>
      <p className="text-slate-400 text-sm max-w-md mx-auto mb-6 leading-relaxed">
        {item.desc}. Run a rate fairness check for your profile to activate this feature with live predictions and ML insights.
      </p>

      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900/80 border border-slate-700/60 text-xs text-slate-300 mb-6 flex-wrap justify-center">
        <span className="text-slate-500">Current Profile:</span>
        <span className="font-semibold text-indigo-300 capitalize">{formValues.loan_type} Loan</span>
        <span>•</span>
        <span className="font-semibold text-indigo-300">{formValues.bank}</span>
        <span>•</span>
        <span className="font-semibold text-indigo-300">₹{formValues.loan_amount_lakh} Lakhs</span>
        <span>•</span>
        <span className="font-semibold text-indigo-300">{formValues.offered_rate}% Offered</span>
      </div>

      <div className="flex items-center justify-center gap-3 flex-wrap">
        <button
          onClick={onRun}
          disabled={loading}
          className="btn-primary px-6 py-3 rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/25 cursor-pointer inline-flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-transform"
        >
          {loading ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Analyzing profile...</span>
            </>
          ) : (
            <>
              <span>⚡</span>
              <span>Run Check to Open {item.label}</span>
            </>
          )}
        </button>
        {onEditProfile && (
          <button
            onClick={onEditProfile}
            className="px-5 py-3 rounded-xl font-bold text-xs bg-slate-900/90 hover:bg-slate-800 text-indigo-300 hover:text-white border border-indigo-500/30 cursor-pointer inline-flex items-center gap-1.5 transition-all"
          >
            <span>📋</span>
            <span>Edit Profile</span>
          </button>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem("fairrate_user");
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

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
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isPinned, setIsPinned] = useState(false);

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

  const handleLogin = (userData) => {
    setUser(userData);
    try {
      localStorage.setItem("fairrate_user", JSON.stringify(userData));
    } catch (e) {}
    setActiveTab("dashboard");
  };

  const handleLogout = () => {
    setUser(null);
    try {
      localStorage.removeItem("fairrate_user");
    } catch (e) {}
  };

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

  const handleSelectTab = (tabId) => {
    setActiveTab(tabId);
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  // If not authenticated, display login screen
  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const currentTabItem = MENU_ITEMS.find((m) => m.id === activeTab) || MENU_ITEMS[0];

  return (
    <div style={{ minHeight: "100vh", position: "relative" }}>
      {/* Animated background blobs */}
      <div className="animated-bg" />

      {/* ── SEPARATED SECTION ON THE LEFT CORNER OF WEB (HIDDEN BY DEFAULT) ── */}
      <LeftCornerSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isPinned={isPinned}
        onTogglePin={() => setIsPinned(!isPinned)}
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        historyCount={history.length}
        formValues={formValues}
        apiStatus={apiStatus}
        onRunForm={() => handleSubmit(formValues)}
        loading={loading}
        user={user}
        onLogout={handleLogout}
      />

      {/* ── MAIN CONTENT WORKSPACE (FULL WIDTH WHEN UNPINNED) ── */}
      <div
        className={`${
          isPinned && sidebarOpen ? "lg:pl-72 xl:pl-80" : "w-full"
        } flex flex-col min-h-screen relative z-10 transition-all duration-300`}
      >
        {/* Sticky Top Header with "left above corner" Menu Toggle Button */}
        <header className="sticky top-0 z-30 px-4 sm:px-6 py-3 bg-slate-950/85 backdrop-blur-2xl border-b border-indigo-500/15 flex items-center justify-between gap-4">
          {/* LEFT ABOVE CORNER: Button to open hidden sections menu */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-indigo-500/35 hover:border-indigo-400 text-white shadow-lg shadow-indigo-950/40 backdrop-blur-xl transition-all cursor-pointer group shrink-0"
              title="Toggle All Sections Menu"
            >
              <span className="w-5 h-5 rounded-md bg-indigo-500/20 text-indigo-300 flex items-center justify-center text-xs group-hover:scale-110 transition-transform">
                ☰
              </span>
              <span className="text-xs font-bold tracking-tight">All Sections</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-500/25 text-indigo-300 font-extrabold">
                {MENU_ITEMS.length}
              </span>
            </button>

            {/* Brand Logo & Active Section Chip */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleSelectTab("dashboard")}
                className="flex items-center gap-1.5 bg-transparent border-none cursor-pointer p-0 text-left"
              >
                <span className="text-lg">⚖️</span>
                <span
                  className="font-black text-sm sm:text-base gradient-text hidden sm:inline"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  FAIRRATE
                </span>
              </button>

              <span className="text-slate-600 hidden sm:inline">•</span>

              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-800 text-xs">
                <span>{currentTabItem.icon}</span>
                <span className="font-bold text-white text-xs truncate max-w-[120px] sm:max-w-none">
                  {currentTabItem.label}
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE: User Profile & Actions */}
          <div className="flex items-center gap-3">
            {activeTab !== "dashboard" && (
              <button
                onClick={() => handleSelectTab("dashboard")}
                className="hidden md:flex items-center gap-1.5 text-xs text-indigo-300 hover:text-white px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-indigo-600/30 border border-indigo-500/30 font-semibold transition-all cursor-pointer"
              >
                <span>📊</span>
                <span>Dashboard</span>
              </button>
            )}

            <div className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
              <span className="text-base">{user.avatar || "👤"}</span>
              <div className="hidden sm:block text-left">
                <span className="font-bold text-white block text-[11px] leading-tight">
                  {user.name}
                </span>
                <span className="text-[9px] text-indigo-300 leading-tight block">
                  {user.role}
                </span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="px-2.5 py-1 text-xs rounded-lg font-bold bg-slate-800/80 hover:bg-red-500/20 text-slate-300 hover:text-red-300 border border-slate-700/60 hover:border-red-500/30 transition-colors cursor-pointer"
              title="Sign Out"
            >
              <span className="sm:hidden">🚪</span>
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </header>

        {/* Workspace Body */}
        <div className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto">
          <APIStatusBanner status={apiStatus} />

          {/* Active Profile Context Strip (displayed across analytics tabs) */}
          {activeTab !== "profile" && activeTab !== "dashboard" && (
            <div className="mb-5 flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-slate-900/60 border border-indigo-500/15 text-xs text-slate-300 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-slate-500">Active Profile:</span>
                <span className="font-bold text-white capitalize">{formValues.loan_type} Loan</span>
                <span className="text-slate-600">•</span>
                <span className="font-semibold text-indigo-300">{formValues.bank}</span>
                <span className="text-slate-600">•</span>
                <span className="font-semibold text-indigo-300">₹{formValues.loan_amount_lakh} Lakhs</span>
                <span className="text-slate-600">•</span>
                <span className="font-semibold text-amber-300">{formValues.offered_rate}% Offered</span>
                <span className="text-slate-600">•</span>
                <span className="font-semibold text-emerald-400">{formValues.credit_score} CIBIL</span>
              </div>
              <button
                onClick={() => handleSelectTab("profile")}
                className="text-xs text-indigo-300 hover:text-white flex items-center gap-1.5 font-bold transition-colors cursor-pointer px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20"
              >
                <span>📋</span>
                <span>Edit Profile</span>
              </button>
            </div>
          )}

          {/* ── Main Results & Feature Workspace ── */}
          <div ref={resultsRef} className="w-full">
            {error && (
              <div className="glass rounded-2xl p-6 border border-red-500/30 bg-red-500/5 mb-6 fade-in-up">
                <div className="text-3xl mb-3">❌</div>
                <h3 className="text-base font-bold text-red-400 mb-1">Prediction Error</h3>
                <p className="text-sm text-slate-400">{error}</p>
                <p className="text-xs text-slate-500 mt-3">
                  Make sure the backend is running and the model is trained.
                </p>
              </div>
            )}

            {/* TAB: DASHBOARD HOME */}
            {activeTab === "dashboard" && (
              <DashboardHome
                user={user}
                formValues={formValues}
                result={result}
                onNavigate={handleSelectTab}
                onRunCheck={() => handleSubmit(formValues)}
                loading={loading}
                history={history}
              />
            )}


            {/* ────────────────────────────────────────────────────────── */}
            {/* TAB 0: DEDICATED LOAN PROFILE SECTION                     */}
            {/* ────────────────────────────────────────────────────────── */}
            {activeTab === "profile" && (
              <div className="max-w-3xl mx-auto space-y-6 fade-in-up">
                <div
                  className="glass rounded-2xl p-6 sm:p-8"
                  style={{ borderColor: "rgba(99,102,241,0.2)" }}
                >
                  <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                        style={{
                          background:
                            "linear-gradient(135deg, rgba(99,102,241,0.3), rgba(168,85,247,0.2))",
                        }}
                      >
                        📋
                      </div>
                      <div>
                        <h2
                          className="text-lg sm:text-xl font-bold text-white"
                          style={{ fontFamily: "Outfit, sans-serif" }}
                        >
                          Borrower Loan Profile
                        </h2>
                        <p className="text-xs text-slate-400">
                          Configure your financial profile and bank loan offer to evaluate rate fairness.
                        </p>
                      </div>
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-semibold capitalize">
                      {formValues.bank} • {formValues.loan_type}
                    </span>
                  </div>

                  <LoanForm onSubmit={handleSubmit} loading={loading} values={formValues} />
                </div>

                {result && (
                  <div className="glass rounded-2xl p-5 flex items-center justify-between gap-4 bg-emerald-500/5 border-emerald-500/20">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{result.verdict_emoji}</span>
                      <div>
                        <span className="text-sm font-bold text-white block">
                          Current Verdict: {result.verdict} (Fair: {result.fair_rate}% vs Offered: {result.offered_rate}%)
                        </span>
                        <p className="text-xs text-slate-400">
                          Fairness analysis calculated. View full breakdowns in the analytics menus.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleSelectTab("verdict")}
                      className="text-xs px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold transition-all cursor-pointer whitespace-nowrap"
                    >
                      View Verdict →
                    </button>
                  </div>
                )}
              </div>
            )}



            {/* ────────────────────────────────────────────────────────── */}
            {/* TAB 2: RATE VERDICT                                       */}
            {/* ────────────────────────────────────────────────────────── */}
            {activeTab === "verdict" && (
              <>
                {!result && !loading && (
                  <FeaturePlaceholder
                    item={currentTabItem}
                    formValues={formValues}
                    onRun={() => handleSubmit(formValues)}
                    onEditProfile={() => handleSelectTab("profile")}
                    loading={loading}
                  />
                )}
                {result && (
                  <div className="space-y-6 fade-in-up">
                    <div className="glass rounded-2xl p-6">
                      <VerdictCard result={result} loanType={loanType} />
                    </div>
                    {result.top_reasons?.length > 0 && (
                      <div className="glass rounded-2xl p-6">
                        <ReasonsList reasons={result.top_reasons} />
                      </div>
                    )}
                    {result.benchmark_rates?.length > 0 && (
                      <div className="glass rounded-2xl p-6">
                        <RateTable
                          benchmarkRates={result.benchmark_rates}
                          loanType={loanType}
                          offeredRate={result.offered_rate}
                        />
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* ────────────────────────────────────────────────────────── */}
            {/* TAB 3: SHAP WATERFALL CHART                               */}
            {/* ────────────────────────────────────────────────────────── */}
            {activeTab === "waterfall" && (
              <>
                {!result && !loading && (
                  <FeaturePlaceholder
                    item={currentTabItem}
                    formValues={formValues}
                    onRun={() => handleSubmit(formValues)}
                    onEditProfile={() => handleSelectTab("profile")}
                    loading={loading}
                  />
                )}
                {result && (
                  <div className="space-y-6 fade-in-up">
                    <ShapWaterfall result={result} />
                    {result.top_reasons?.length > 0 && (
                      <div className="glass rounded-2xl p-6">
                        <ReasonsList reasons={result.top_reasons} />
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* ────────────────────────────────────────────────────────── */}
            {/* TAB 4: MULTI-BANK COMPARISON                               */}
            {/* ────────────────────────────────────────────────────────── */}
            {activeTab === "compare" && (
              <div className="space-y-6 fade-in-up">
                <BankComparison result={result} formValues={formValues} />
                {result?.benchmark_rates?.length > 0 && (
                  <div className="glass rounded-2xl p-6">
                    <RateTable
                      benchmarkRates={result.benchmark_rates}
                      loanType={loanType}
                      offeredRate={result.offered_rate}
                    />
                  </div>
                )}
              </div>
            )}

            {/* ────────────────────────────────────────────────────────── */}
            {/* TAB 5: WHAT-IF SIMULATOR                                  */}
            {/* ────────────────────────────────────────────────────────── */}
            {activeTab === "simulator" && (
              <>
                {!result && !loading && (
                  <FeaturePlaceholder
                    item={currentTabItem}
                    formValues={formValues}
                    onRun={() => handleSubmit(formValues)}
                    onEditProfile={() => handleSelectTab("profile")}
                    loading={loading}
                  />
                )}
                {result && (
                  <div className="space-y-6 fade-in-up">
                    <WhatIfSimulator result={result} formValues={formValues} />
                  </div>
                )}
              </>
            )}

            {/* ────────────────────────────────────────────────────────── */}
            {/* TAB 6: EMI VS TENURE LINE CHART                           */}
            {/* ────────────────────────────────────────────────────────── */}
            {activeTab === "emi" && (
              <>
                {!result && !loading && (
                  <FeaturePlaceholder
                    item={currentTabItem}
                    formValues={formValues}
                    onRun={() => handleSubmit(formValues)}
                    onEditProfile={() => handleSelectTab("profile")}
                    loading={loading}
                  />
                )}
                {result && (
                  <div className="space-y-6 fade-in-up">
                    <EmiTenureChart result={result} formValues={formValues} />
                  </div>
                )}
              </>
            )}

            {/* ────────────────────────────────────────────────────────── */}
            {/* TAB 7: RECENT CHECKS HISTORY                              */}
            {/* ────────────────────────────────────────────────────────── */}
            {activeTab === "history" && (
              <div className="space-y-6 fade-in-up">
                <HistoryPanel
                  onReplay={handleReplay}
                  currentHistory={history}
                  onClearHistory={handleClearHistory}
                  standalone={true}
                  forceOpen={true}
                />
              </div>
            )}
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
