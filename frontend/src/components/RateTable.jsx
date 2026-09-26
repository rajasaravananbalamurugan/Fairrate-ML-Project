import React from "react";

const LOAN_TYPE_LABELS = {
  personal:  "Personal Loan",
  home:      "Home Loan",
  car:       "Car Loan",
  education: "Education Loan",
};

const BANK_FLAGS = {
  SBI:   "🏦",
  HDFC:  "🔷",
  ICICI: "🟠",
  Axis:  "🟣",
  Kotak: "🔴",
};

export default function RateTable({ benchmarkRates, loanType, offeredRate }) {
  if (!benchmarkRates || benchmarkRates.length === 0) return null;

  return (
    <div className="fade-in-up">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1 h-5 bg-blue-500 rounded-full"></div>
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wide">
          Rate Benchmark — {LOAN_TYPE_LABELS[loanType] || loanType}
        </h3>
      </div>

      <div className="glass rounded-xl overflow-hidden">
        <table className="rate-table">
          <thead>
            <tr>
              <th>Bank</th>
              <th>Min Rate</th>
              <th>Max Rate</th>
              <th>Typical</th>
              <th>Your Rate</th>
            </tr>
          </thead>
          <tbody>
            {benchmarkRates.map((row) => {
              const isAboveMax = offeredRate > row.max_rate;
              const isOffered = offeredRate >= row.min_rate && offeredRate <= row.max_rate;
              return (
                <tr key={row.bank}>
                  <td>
                    <span className="mr-1.5">{BANK_FLAGS[row.bank] || "🏦"}</span>
                    <span className="font-semibold text-slate-200">{row.bank}</span>
                  </td>
                  <td className="text-emerald-400 font-medium">{row.min_rate.toFixed(2)}%</td>
                  <td className="text-slate-400">{row.max_rate.toFixed(2)}%</td>
                  <td className="text-blue-400 font-semibold">{row.typical_rate.toFixed(2)}%</td>
                  <td>
                    {isAboveMax ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/30 font-medium">
                        {offeredRate.toFixed(2)}% ↑
                      </span>
                    ) : isOffered ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-medium">
                        {offeredRate.toFixed(2)}% ✓
                      </span>
                    ) : (
                      <span className="text-slate-600 text-xs">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-600 mt-2 text-center">
        Rates sourced from published bank rate cards. Subject to change.
      </p>
    </div>
  );
}
