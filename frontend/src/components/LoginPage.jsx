import React, { useState } from "react";

const FEATURES = [
  { icon: "⚖️", label: "ML Rate Fairness Verdict", desc: "Know if your bank rate is fair or inflated" },
  { icon: "🌊", label: "SHAP Explainability", desc: "See exactly why your rate was determined" },
  { icon: "🏦", label: "11-Bank Comparison", desc: "Compare rates across India top lenders" },
  { icon: "📈", label: "EMI and Prepayment Planning", desc: "Optimize your loan with smart simulations" },
  { icon: "✍️", label: "AI Negotiation Script", desc: "Get a personalized script to negotiate lower rates" },
  { icon: "💬", label: "AI Chat Assistant", desc: "Ask anything about your loan in plain language" },
];

export default function LoginPage({ onLogin }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [nameError, setNameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [loading, setLoading] = useState(false);

  const validate = () => {
    let ok = true;
    if (!name.trim() || name.trim().length < 2) {
      setNameError("Please enter your full name (at least 2 characters).");
      ok = false;
    } else {
      setNameError("");
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      setEmailError("Please enter a valid email address.");
      ok = false;
    } else {
      setEmailError("");
    }
    return ok;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setTimeout(() => {
      onLogin({ name: name.trim(), email: email.trim() });
    }, 900);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
        background: "linear-gradient(135deg, #0a0a1a 0%, #0d0d2b 40%, #0a0a1a 100%)",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      {/* Animated gradient blobs */}
      <div
        style={{
          position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
          background:
            "radial-gradient(ellipse 60% 60% at 20% 30%, rgba(99,102,241,0.18) 0%, transparent 70%), " +
            "radial-gradient(ellipse 50% 50% at 80% 70%, rgba(168,85,247,0.14) 0%, transparent 70%)",
        }}
      />

      <div style={{ position: "relative", zIndex: 10, width: "100%", maxWidth: "1024px", margin: "0 auto", padding: "40px 16px", display: "flex", flexWrap: "wrap", gap: "40px", alignItems: "center", justifyContent: "center" }}>
        
        {/* Left: Branding */}
        <div style={{ flex: "1 1 320px", maxWidth: "440px", color: "#fff" }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "28px" }}>
            <div style={{ width: "56px", height: "56px", borderRadius: "16px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px", background: "linear-gradient(135deg, #6366f1, #a855f7)", boxShadow: "0 8px 24px rgba(99,102,241,0.4)" }}>
              ⚖️
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontFamily: "Outfit, sans-serif", fontWeight: 900, fontSize: "28px", background: "linear-gradient(135deg, #818cf8, #c084fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  FAIRRATE
                </span>
                <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "6px", fontWeight: 700, background: "rgba(99,102,241,0.2)", color: "#a5b4fc", border: "1px solid rgba(99,102,241,0.3)" }}>
                  PRO
                </span>
              </div>
              <p style={{ fontSize: "13px", color: "#94a3b8", margin: 0 }}>AI-Powered Loan Rate Fairness Suite</p>
            </div>
          </div>

          <h1 style={{ fontFamily: "Outfit, sans-serif", fontWeight: 900, fontSize: "clamp(26px, 5vw, 38px)", lineHeight: 1.15, marginBottom: "12px" }}>
            Is your bank&apos;s rate
            <br />
            <span style={{ background: "linear-gradient(135deg, #818cf8, #f472b6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              fair or inflated?
            </span>
          </h1>
          <p style={{ fontSize: "13px", color: "#94a3b8", lineHeight: 1.6, marginBottom: "32px" }}>
            Enter your loan details and let our ML model — trained on Indian lending data — tell you exactly where you stand.
          </p>

          {/* Feature Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            {FEATURES.map((f, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "10px", padding: "12px", borderRadius: "12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(99,102,241,0.15)" }}>
                <span style={{ fontSize: "18px", flexShrink: 0, marginTop: "2px" }}>{f.icon}</span>
                <div>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "#e2e8f0" }}>{f.label}</div>
                  <div style={{ fontSize: "11px", color: "#64748b", lineHeight: 1.4, marginTop: "2px" }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Login Card */}
        <div style={{ width: "100%", maxWidth: "360px", background: "rgba(15,15,35,0.8)", border: "1px solid rgba(99,102,241,0.25)", borderRadius: "24px", backdropFilter: "blur(24px)", boxShadow: "0 32px 80px rgba(0,0,0,0.5)", padding: "40px 32px" }}>
          
          <div style={{ textAlign: "center", marginBottom: "32px" }}>
            <div style={{ width: "64px", height: "64px", borderRadius: "50%", margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px", background: "linear-gradient(135deg, rgba(99,102,241,0.3), rgba(168,85,247,0.3))", border: "1px solid rgba(99,102,241,0.4)" }}>
              👤
            </div>
            <h2 style={{ fontFamily: "Outfit, sans-serif", fontWeight: 900, fontSize: "20px", color: "#fff", margin: "0 0 6px" }}>
              Get Started
            </h2>
            <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0 }}>
              Enter your details to access the full suite
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            {/* Name */}
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#cbd5e1", marginBottom: "6px" }}>
                Full Name
              </label>
              <input
                id="login-name"
                type="text"
                placeholder="e.g. Arun Sharma"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                style={{
                  width: "100%", padding: "12px 16px", borderRadius: "12px",
                  background: "rgba(255,255,255,0.05)",
                  border: `1.5px solid ${nameError ? "rgba(248,113,113,0.7)" : "rgba(99,102,241,0.25)"}`,
                  color: "#e2e8f0", fontSize: "14px", outline: "none", boxSizing: "border-box",
                }}
              />
              {nameError && <p style={{ fontSize: "11px", color: "#f87171", marginTop: "4px" }}>⚠️ {nameError}</p>}
            </div>

            {/* Email */}
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#cbd5e1", marginBottom: "6px" }}>
                Email Address
              </label>
              <input
                id="login-email"
                type="email"
                placeholder="e.g. arun@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                style={{
                  width: "100%", padding: "12px 16px", borderRadius: "12px",
                  background: "rgba(255,255,255,0.05)",
                  border: `1.5px solid ${emailError ? "rgba(248,113,113,0.7)" : "rgba(168,85,247,0.25)"}`,
                  color: "#e2e8f0", fontSize: "14px", outline: "none", boxSizing: "border-box",
                }}
              />
              {emailError && <p style={{ fontSize: "11px", color: "#f87171", marginTop: "4px" }}>⚠️ {emailError}</p>}
            </div>

            <p style={{ fontSize: "11px", color: "#475569", textAlign: "center", marginBottom: "20px", lineHeight: 1.5 }}>
              🔒 Your data stays in your browser session only. No account required.
            </p>

            <button
              type="submit"
              id="login-submit-btn"
              disabled={loading}
              style={{
                width: "100%", padding: "14px", borderRadius: "14px", border: "none",
                background: loading ? "rgba(99,102,241,0.5)" : "linear-gradient(135deg, #6366f1, #a855f7)",
                color: "#fff", fontWeight: 800, fontSize: "14px", fontFamily: "Outfit, sans-serif",
                cursor: loading ? "not-allowed" : "pointer",
                boxShadow: loading ? "none" : "0 8px 32px rgba(99,102,241,0.35)",
                transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              }}
            >
              {loading ? "Loading your workspace..." : "🚀  Enter FAIRRATE Suite"}
            </button>
          </form>

          <p style={{ textAlign: "center", fontSize: "11px", color: "#475569", marginTop: "24px", lineHeight: 1.5 }}>
            ⚠️ For educational purposes only. Not financial advice.
          </p>
        </div>
      </div>
    </div>
  );
}
