import React, { useState } from "react";

const DEMO_USERS = [
  {
    name: "Rahul Sharma",
    email: "rahul.sharma@example.com",
    role: "Salaried Borrower",
    cibil: 750,
    avatar: "👨‍💼",
  },
  {
    name: "Priya Patel",
    email: "priya.patel@example.com",
    role: "Business Entrepreneur",
    cibil: 690,
    avatar: "👩‍💼",
  },
];

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("rahul.sharma@example.com");
  const [password, setPassword] = useState("password123");
  const [selectedUser, setSelectedUser] = useState(DEMO_USERS[0]);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please provide an email and password.");
      return;
    }
    setLoading(true);
    setError(null);

    // Simulate authenticating session
    setTimeout(() => {
      setLoading(false);
      onLogin({
        name: selectedUser?.email === email ? selectedUser.name : email.split("@")[0],
        email,
        role: selectedUser?.email === email ? selectedUser.role : "Borrower",
        avatar: selectedUser?.email === email ? selectedUser.avatar : "👤",
        rememberMe,
      });
    }, 400);
  };

  const handleSelectDemo = (u) => {
    setSelectedUser(u);
    setEmail(u.email);
    setPassword("password123");
    setError(null);
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      {/* Dynamic Animated Blobs */}
      <div className="animated-bg" />

      {/* Floating accent elements */}
      <div className="absolute top-10 left-10 hidden lg:flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-slate-900/60 border border-indigo-500/20 backdrop-blur-xl">
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-xs font-semibold text-slate-300">RBI Repo Rate: 6.50% Active</span>
      </div>

      <div className="absolute bottom-8 right-8 hidden lg:flex items-center gap-3 px-4 py-2 rounded-2xl bg-slate-900/60 border border-indigo-500/20 backdrop-blur-xl text-xs text-slate-400">
        <span>🤖 Gradient Boosting ML Engine</span>
        <span>•</span>
        <span>🏛️ 5 Major Banks</span>
      </div>

      <div className="w-full max-w-md relative z-10 fade-in-up">
        {/* Main Login Card */}
        <div
          className="glass rounded-3xl p-6 sm:p-8 border shadow-2xl relative overflow-hidden"
          style={{ borderColor: "rgba(99,102,241,0.25)" }}
        >
          {/* Subtle Top Glowing Line */}
          <div
            className="absolute top-0 left-0 right-0 h-1"
            style={{
              background: "linear-gradient(90deg, #6366f1, #a855f7, #ec4899)",
            }}
          />

          {/* Logo & Brand Header */}
          <div className="text-center mb-6">
            <div
              className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center text-3xl shadow-xl shadow-indigo-500/20 mb-3"
              style={{
                background: "linear-gradient(135deg, #6366f1, #a855f7, #ec4899)",
              }}
            >
              ⚖️
            </div>
            <h1
              className="text-2xl sm:text-3xl font-black gradient-text tracking-tight mb-1"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              FAIRRATE
            </h1>
            <p className="text-xs text-slate-400 font-medium">
              ML-Powered Loan Rate Fairness & Explainability
            </p>
          </div>

          {/* Demo Account Quick Switcher */}
          <div className="mb-6">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2 text-center">
              Quick 1-Click Demo Profiles
            </span>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_USERS.map((u) => {
                const isSelected = email === u.email;
                return (
                  <button
                    key={u.email}
                    type="button"
                    onClick={() => handleSelectDemo(u)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2 ${
                      isSelected
                        ? "bg-indigo-600/25 border-indigo-500/60 shadow-md shadow-indigo-950/40"
                        : "bg-slate-900/60 border-slate-800 hover:border-indigo-500/30 hover:bg-slate-800/50"
                    }`}
                  >
                    <span className="text-xl">{u.avatar}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-white truncate">{u.name.split(" ")[0]}</div>
                      <div className="text-[10px] text-indigo-300 font-medium truncate">{u.cibil} CIBIL</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
              ⚠️ {error}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Work or Personal Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                className="form-input text-xs sm:text-sm py-2.5"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Password
                </label>
                <span className="text-[11px] text-slate-500">demo: password123</span>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="form-input text-xs sm:text-sm py-2.5"
              />
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-slate-400 hover:text-slate-200">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                />
                <span>Keep me signed in</span>
              </label>
              <button
                type="button"
                onClick={() => setError("Demo account: Any password works!")}
                className="text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Forgot?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 rounded-xl font-bold text-sm text-white shadow-xl shadow-indigo-600/30 cursor-pointer flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] transition-all"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>🚀</span>
                  <span>Enter FAIRRATE Dashboard</span>
                </>
              )}
            </button>
          </form>

          {/* Bottom Security Assurance */}
          <div className="mt-6 pt-5 border-t border-slate-800/80 text-center">
            <div className="flex items-center justify-center gap-4 text-[11px] text-slate-500">
              <span className="flex items-center gap-1">
                <span>🔒</span> SSL 256-bit
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <span>🏛️</span> RBI Guidelines
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <span>⚡</span> Scikit-Learn ML
              </span>
            </div>
          </div>
        </div>

        {/* Footer info below card */}
        <p className="text-center text-xs text-slate-500 mt-4">
          FAIRRATE AI © 2025 · Transparent Borrowing Platform
        </p>
      </div>
    </div>
  );
}
