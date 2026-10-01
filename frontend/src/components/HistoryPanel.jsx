import React, { useState, useEffect } from "react";

const LOAN_EMOJIS = {
  personal: "👤",
  home: "🏠",
  car: "🚗",
  education: "🎓",
};

export default function HistoryPanel({ onReplay, currentHistory, onClearHistory, forceOpen = false, standalone = false }) {
  const [isOpen, setIsOpen] = useState(forceOpen);
  const [history, setHistory] = useState(currentHistory || []);

  useEffect(() => {
    if (currentHistory) {
      setHistory(currentHistory);
    }
  }, [currentHistory]);

  useEffect(() => {
    if (forceOpen) {
      setIsOpen(true);
    }
  }, [forceOpen]);

  const count = history.length;

  if (count === 0 && !standalone) return null;

  if (count === 0 && standalone) {
    return (
      <div className="glass rounded-2xl p-8 text-center border border-indigo-500/20 fade-in-up">
        <div className="text-4xl mb-3">🕒</div>
        <h3 className="text-base font-bold text-white mb-2" style={{ fontFamily: "Outfit, sans-serif" }}>
          No Recent Checks Yet
        </h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
          Checks you perform will automatically be saved to your browser's local storage (up to 5 recent queries).
          Fill out your profile and click "Check Rate Fairness" to get started!
        </p>
      </div>
    );
  }

  const containerClasses = standalone
    ? "glass rounded-2xl border border-indigo-500/20 overflow-hidden shadow-lg fade-in-up"
    : "max-w-6xl mx-auto px-4 mb-6";

  return (
    <div className={containerClasses}>
      <div className={standalone ? "" : "glass rounded-2xl border border-indigo-500/20 overflow-hidden shadow-lg"}>
        {/* Accordion Toggle Header */}
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-slate-800/40 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-lg">🕒</span>
            <span
              className="text-sm font-bold text-white tracking-wide"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              Recent Checks ({count})
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30">
              Click any to replay
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">
              {isOpen ? "Hide" : "Show"}
            </span>
            <span className="text-slate-400 text-sm transform transition-transform duration-200">
              {isOpen ? "▲" : "▼"}
            </span>
          </div>
        </button>

        {/* Collapsible List */}
        {isOpen && (
          <div className="p-4 pt-2 border-t border-slate-800/80 space-y-2">
            <div className="grid gap-2">
              {history.map((item) => {
                const emoji = LOAN_EMOJIS[item.loan_type?.toLowerCase()] || "📄";
                const verdictClass =
                  item.verdict === "FAIR"
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                    : item.verdict === "HIGH"
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                    : "bg-red-500/20 text-red-300 border-red-500/30";

                return (
                  <div
                    key={item.id}
                    onClick={() => onReplay && onReplay(item.formValues || item)}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 rounded-xl bg-slate-900/60 hover:bg-indigo-950/40 border border-slate-800 hover:border-indigo-500/40 cursor-pointer transition-all duration-150 group gap-2"
                  >
                    {/* Left: Type, Bank, Timestamp */}
                    <div className="flex items-center gap-3">
                      <span className="text-2xl p-1 rounded-lg bg-slate-800/70">{emoji}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white capitalize">
                            {item.loan_type} Loan
                          </span>
                          <span className="text-xs text-slate-400 font-medium">
                            • {item.bank} Bank
                          </span>
                          <span className="text-[11px] text-slate-500 font-normal">
                            (CIBIL: {item.credit_score})
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {item.timestamp ? new Date(item.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "Recently"}
                        </div>
                      </div>
                    </div>

                    {/* Right: Rates & Verdict chip */}
                    <div className="flex items-center gap-4 self-end sm:self-auto">
                      <div className="text-right text-xs">
                        <span className="text-slate-400">Offer: </span>
                        <strong className="text-white">{item.offered_rate}%</strong>
                        <span className="mx-1 text-slate-600">vs</span>
                        <span className="text-indigo-400">Fair: </span>
                        <strong className="text-indigo-300">{item.predicted_rate}%</strong>
                      </div>

                      <span
                        className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border ${verdictClass}`}
                      >
                        {item.verdict}
                      </span>

                      <span className="text-xs text-indigo-400 group-hover:translate-x-1 transition-transform hidden sm:inline">
                        ➜
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Clear History Button */}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={onClearHistory}
                className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-red-950/60 text-slate-400 hover:text-red-300 border border-slate-700/60 hover:border-red-500/40 transition-colors font-medium"
              >
                Clear history
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
