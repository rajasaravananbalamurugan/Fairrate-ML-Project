import React, { useState, useCallback, useEffect } from "react";

const LOAN_TYPES = [
  { value: "personal",  label: "Personal",   icon: "👤" },
  { value: "home",      label: "Home",        icon: "🏠" },
  { value: "car",       label: "Car",         icon: "🚗" },
  { value: "education", label: "Education",   icon: "🎓" },
];
const BANKS = ["SBI", "HDFC", "ICICI", "Axis", "Kotak"];
const EMPLOYMENT_TYPES = [
  { value: "salaried",      label: "Salaried",      icon: "💼" },
  { value: "self_employed",  label: "Self-Employed", icon: "🧑‍💻" },
  { value: "business",      label: "Business",      icon: "🏢" },
];

const DEFAULTS = {
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
};

function Label({ children, sub }) {
  return (
    <div className="mb-1.5">
      <label className="text-sm font-semibold text-slate-200">{children}</label>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

function FieldGroup({ children }) {
  return <div className="mb-5">{children}</div>;
}

/* ── Prominent money input card ── */
function MoneyInputCard({ id, label, sub, value, onChange, unit, min, max, step, accentFrom, accentTo }) {
  return (
    <FieldGroup>
      <Label sub={sub}>{label}</Label>
      <div className="money-input-card">
        <div className="flex items-center gap-3">
          <span className="money-symbol">₹</span>
          <input
            id={id}
            type="number"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={e => onChange(Number(e.target.value))}
            placeholder="0"
          />
          <span className="money-unit">{unit}</span>
        </div>
        {/* Visual bar showing relative magnitude */}
        <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(((value - min) / (max - min)) * 100, 100)}%`,
              background: `linear-gradient(to right, ${accentFrom}, ${accentTo})`,
            }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-xs text-slate-600">₹{min}L</span>
          <span className="text-xs text-slate-600">₹{max}L</span>
        </div>
      </div>
    </FieldGroup>
  );
}

export default function LoanForm({ onSubmit, loading, values }) {
  const [form, setForm] = useState(values || DEFAULTS);

  useEffect(() => {
    if (values) {
      setForm((prev) => ({ ...prev, ...values }));
    }
  }, [values]);

  const set = useCallback((key, val) => {
    setForm(prev => ({ ...prev, [key]: val }));
  }, []);

  const showLTV = form.loan_type === "home" || form.loan_type === "car";

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { ...form };
    if (!showLTV) payload.ltv_ratio = null;
    onSubmit(payload);
  };

  const creditColor =
    form.credit_score >= 750 ? "#2dd4bf" :
    form.credit_score >= 650 ? "#fbbf24" : "#f87171";

  return (
    <form onSubmit={handleSubmit} id="loan-form">
      {/* ── Loan Type ── */}
      <FieldGroup>
        <Label sub="What kind of loan are you evaluating?">Loan Type</Label>
        <div className="grid grid-cols-2 gap-2">
          {LOAN_TYPES.map(lt => (
            <button
              key={lt.value}
              type="button"
              id={`loan-type-${lt.value}`}
              onClick={() => set("loan_type", lt.value)}
              className={`radio-option ${form.loan_type === lt.value ? "selected" : ""}`}
            >
              <span className="text-lg">{lt.icon}</span>
              <span>{lt.label}</span>
            </button>
          ))}
        </div>
      </FieldGroup>

      {/* ── Bank ── */}
      <FieldGroup>
        <Label sub="Which bank is offering you this loan?">Bank</Label>
        <select
          id="bank-select"
          className="form-input"
          value={form.bank}
          onChange={e => set("bank", e.target.value)}
        >
          {BANKS.map(b => (
            <option key={b} value={b}>{b} Bank</option>
          ))}
        </select>
      </FieldGroup>

      {/* ── Credit Score ── */}
      <FieldGroup>
        <Label sub="Your CIBIL / credit score">Credit Score</Label>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl font-black" style={{ color: creditColor, fontFamily: "Outfit, sans-serif" }}>
            {form.credit_score}
          </span>
          <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{
            background: `${creditColor}18`,
            color: creditColor,
            border: `1px solid ${creditColor}40`,
          }}>
            {form.credit_score >= 750 ? "Excellent" : form.credit_score >= 650 ? "Good" : "Poor"}
          </span>
        </div>
        <input
          id="credit-score-slider"
          type="range"
          min={300}
          max={900}
          step={5}
          value={form.credit_score}
          onChange={e => set("credit_score", Number(e.target.value))}
          style={{
            background: `linear-gradient(to right, ${creditColor} ${((form.credit_score - 300) / 600) * 100}%, rgba(255,255,255,0.08) ${((form.credit_score - 300) / 600) * 100}%)`,
          }}
        />
        <div className="flex justify-between text-xs text-slate-500 mt-1">
          <span>300</span><span>900</span>
        </div>
      </FieldGroup>

      {/* ── Annual Income — PROMINENT CARD ── */}
      <MoneyInputCard
        id="annual-income-input"
        label="Annual Income (₹ Lakhs)"
        sub="Your total annual income before tax"
        value={form.annual_income_lakh}
        onChange={v => set("annual_income_lakh", v)}
        unit="LAKHS / YEAR"
        min={2}
        max={500}
        step={0.5}
        accentFrom="#6366f1"
        accentTo="#22d3ee"
      />

      {/* ── Employment Type ── */}
      <FieldGroup>
        <Label sub="Your current employment status">Employment Type</Label>
        <div className="radio-group">
          {EMPLOYMENT_TYPES.map(et => (
            <button
              key={et.value}
              type="button"
              id={`emp-type-${et.value}`}
              onClick={() => set("employment_type", et.value)}
              className={`radio-option ${form.employment_type === et.value ? "selected" : ""}`}
            >
              <span>{et.icon}</span>
              <span>{et.label}</span>
            </button>
          ))}
        </div>
      </FieldGroup>

      {/* ── Loan Amount — PROMINENT CARD ── */}
      <MoneyInputCard
        id="loan-amount-input"
        label="Loan Amount (₹ Lakhs)"
        sub="How much loan are you taking?"
        value={form.loan_amount_lakh}
        onChange={v => set("loan_amount_lakh", v)}
        unit="LAKHS"
        min={1}
        max={200}
        step={0.5}
        accentFrom="#a855f7"
        accentTo="#f472b6"
      />

      {/* ── Tenure ── */}
      <FieldGroup>
        <Label sub="For how many years?">Loan Tenure</Label>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl font-black" style={{ color: "#818cf8", fontFamily: "Outfit, sans-serif" }}>{form.tenure_years}</span>
          <span className="text-sm font-medium text-slate-400">years</span>
        </div>
        <input
          id="tenure-slider"
          type="range"
          min={1}
          max={30}
          step={1}
          value={form.tenure_years}
          onChange={e => set("tenure_years", Number(e.target.value))}
          style={{
            background: `linear-gradient(to right, #6366f1 ${((form.tenure_years - 1) / 29) * 100}%, rgba(255,255,255,0.08) ${((form.tenure_years - 1) / 29) * 100}%)`,
          }}
        />
        <div className="flex justify-between text-xs text-slate-500 mt-1">
          <span>1 yr</span><span>30 yrs</span>
        </div>
      </FieldGroup>

      {/* ── LTV Ratio (conditional) ── */}
      {showLTV && (
        <FieldGroup>
          <Label sub="Loan value ÷ property/car value (e.g. 0.75 = 75%)">LTV Ratio</Label>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl font-black" style={{ color: "#c084fc", fontFamily: "Outfit, sans-serif" }}>
              {(form.ltv_ratio * 100).toFixed(0)}%
            </span>
          </div>
          <input
            id="ltv-slider"
            type="range"
            min={0.50}
            max={0.90}
            step={0.01}
            value={form.ltv_ratio}
            onChange={e => set("ltv_ratio", Number(e.target.value))}
            style={{
              background: `linear-gradient(to right, #a855f7 ${((form.ltv_ratio - 0.5) / 0.4) * 100}%, rgba(255,255,255,0.08) ${((form.ltv_ratio - 0.5) / 0.4) * 100}%)`,
            }}
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>50%</span><span>90%</span>
          </div>
        </FieldGroup>
      )}

      {/* ── Existing EMI obligations ── */}
      <FieldGroup>
        <Label sub="What % of your income goes to existing EMIs?">Existing EMI Obligations</Label>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl font-black" style={{ color: "#fb923c", fontFamily: "Outfit, sans-serif" }}>
            {form.existing_obligations_pct.toFixed(0)}%
          </span>
          <span className="text-xs text-slate-500">of income</span>
        </div>
        <input
          id="obligations-slider"
          type="range"
          min={0}
          max={60}
          step={1}
          value={form.existing_obligations_pct}
          onChange={e => set("existing_obligations_pct", Number(e.target.value))}
          style={{
            background: `linear-gradient(to right, #fb923c ${(form.existing_obligations_pct / 60) * 100}%, rgba(255,255,255,0.08) ${(form.existing_obligations_pct / 60) * 100}%)`,
          }}
        />
        <div className="flex justify-between text-xs text-slate-500 mt-1">
          <span>0%</span><span>60%</span>
        </div>
      </FieldGroup>

      <div className="section-divider" />

      {/* ── Offered Rate — highlight card ── */}
      <FieldGroup>
        <Label sub="The interest rate (% p.a.) your bank is offering you">
          Your Offered Rate (% p.a.)
        </Label>
        <div className="money-input-card" style={{
          background: "linear-gradient(135deg, rgba(244,114,182,0.10), rgba(251,146,60,0.06))",
          borderColor: "rgba(244,114,182,0.3)",
        }}>
          <div className="flex items-center gap-3">
            <span className="money-symbol" style={{
              background: "linear-gradient(135deg, #f472b6, #fb923c)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}>%</span>
            <input
              id="offered-rate-input"
              type="number"
              min={5}
              max={36}
              step={0.05}
              value={form.offered_rate}
              onChange={e => set("offered_rate", Number(e.target.value))}
              placeholder="0.00"
            />
            <span className="money-unit">PER ANNUM</span>
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
          <span className="text-amber-400">💡</span> Check your loan offer letter or bank app for this number.
        </p>
      </FieldGroup>

      {/* ── Submit ── */}
      <button
        type="submit"
        id="check-fairness-btn"
        className="btn-primary mt-2"
        disabled={loading}
      >
        <span>
          {loading ? (
            <span className="flex items-center justify-center gap-3">
              <span className="spinner" /> Analyzing your loan...
            </span>
          ) : "🔍  Check Rate Fairness"}
        </span>
      </button>
    </form>
  );
}
