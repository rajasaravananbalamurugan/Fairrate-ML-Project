import React, { useState, useEffect } from "react";
import { fetchDataSources } from "../api";

export default function DataSourcesView() {
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetchDataSources()
      .then((data) => {
        setSources(data.sources || []);
      })
      .catch((err) => {
        setError(err.message || "Failed to load data sources");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const filteredSources = sources.filter((s) => {
    if (filter === "verified") return s.is_verified;
    if (filter === "placeholder") return !s.is_verified;
    return true;
  });

  const verifiedCount = sources.filter((s) => s.is_verified).length;
  const placeholderCount = sources.filter((s) => !s.is_verified).length;

  return (
    <div className="space-y-6 fade-in-up">
      {/* Title */}
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-white" style={{ fontFamily: "Outfit, sans-serif" }}>
          📊 Data Sources & Published Rate Cards
        </h2>
        <p className="text-xs sm:text-sm text-slate-400">
          Transparent data provenance. View all 11 lenders and rate benchmarks used to calibrate model training.
        </p>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass p-4 rounded-xl text-center border-l-4 border-indigo-500">
          <span className="text-xs text-slate-400 uppercase font-semibold">Total Rate Cards</span>
          <div className="text-2xl font-black text-white mt-1">{sources.length}</div>
          <span className="text-[10px] text-slate-500">Across 11 banks & NBFCs</span>
        </div>

        <div className="glass p-4 rounded-xl text-center border-l-4 border-teal-500">
          <span className="text-xs text-slate-400 uppercase font-semibold">Verified Official URLs</span>
          <div className="text-2xl font-black text-teal-400 mt-1">{verifiedCount}</div>
          <span className="text-[10px] text-teal-300/80">From official bank portals & RBI</span>
        </div>

        <div className="glass p-4 rounded-xl text-center border-l-4 border-amber-500">
          <span className="text-xs text-slate-400 uppercase font-semibold">Marked Placeholders</span>
          <div className="text-2xl font-black text-amber-400 mt-1">{placeholderCount}</div>
          <span className="text-[10px] text-amber-300/80">Pending manual human verification</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {["all", "verified", "placeholder"].map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setFilter(tab)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
              filter === tab
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/25"
                : "bg-slate-800/80 text-slate-400 hover:text-white"
            }`}
          >
            {tab === "all" ? `All (${sources.length})` : tab === "verified" ? `Verified (${verifiedCount})` : `Placeholders (${placeholderCount})`}
          </button>
        ))}
      </div>

      {loading && (
        <div className="glass p-8 text-center rounded-xl space-y-2">
          <div className="spinner mx-auto" />
          <p className="text-xs text-slate-300">Loading catalog provenance data...</p>
        </div>
      )}

      {error && <div className="p-3 bg-red-500/20 border border-red-500 text-red-200 text-xs rounded-xl">{error}</div>}

      {/* Sources Table */}
      {!loading && !error && (
        <div className="glass rounded-xl overflow-hidden border border-indigo-500/20">
          <div className="overflow-x-auto">
            <table className="rate-table">
              <thead>
                <tr>
                  <th>Bank</th>
                  <th>Loan Type</th>
                  <th>Published Range</th>
                  <th>Status</th>
                  <th>Date Collected</th>
                  <th>Source Reference</th>
                </tr>
              </thead>
              <tbody>
                {filteredSources.map((row, idx) => (
                  <tr key={idx}>
                    <td className="font-bold text-white">{row.bank}</td>
                    <td className="capitalize text-slate-300">{row.loan_type}</td>
                    <td className="font-mono text-xs text-teal-400">
                      {row.min_rate}% – {row.max_rate}%
                    </td>
                    <td>
                      {row.is_verified ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                          VERIFIED
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          TODO: VERIFY
                        </span>
                      )}
                    </td>
                    <td className="text-xs text-slate-400">{row.date_collected || "2026-03-01"}</td>
                    <td className="text-xs">
                      {row.source_url?.startsWith("http") ? (
                        <a
                          href={row.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-400 hover:text-indigo-300 underline truncate max-w-xs block"
                        >
                          {row.source_url}
                        </a>
                      ) : (
                        <span className="text-slate-500 italic">{row.notes || "Official Portal"}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
