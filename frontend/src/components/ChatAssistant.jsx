import React, { useState } from "react";
import { askChatAssistant } from "../api";

const SUGGESTIONS = [
  "Why is my quoted rate considered high?",
  "What is the single biggest factor driving up my rate?",
  "How much could I save if I improve my CIBIL score to 780?",
  "Which alternative lender in your comparison offers the best rate?",
  "Can I negotiate the processing fees or insurance bundling?",
];

export default function ChatAssistant({ result, formValues }) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Hello! I am your FAIRRATE AI advisor. Ask me questions about your loan rate verdict, SHAP risk drivers, or how you compare to other banks.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async (textToSend) => {
    const q = textToSend || input;
    if (!q.trim() || loading) return;

    const userMsg = { role: "user", text: q };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const context = {
        verdict: result?.verdict || "HIGH",
        fair_rate: result?.fair_rate || 10.5,
        offered_rate: result?.offered_rate || 13.5,
        difference: result?.difference || 3.0,
        bank: formValues?.bank || "HDFC",
        loan_type: formValues?.loan_type || "personal",
        credit_score: formValues?.credit_score || 720,
        loan_amount_lakh: formValues?.loan_amount_lakh || 5,
        reasons: result?.explainer?.reasons || [],
        comparison: result?.comparison || [],
      };

      const data = await askChatAssistant({
        message: q,
        context: context,
      });

      const replyText =
        data?.reply ||
        data?.answer ||
        data?.message ||
        data?.text ||
        "I could not retrieve an answer at this time. Please try again.";

      setMessages((prev) => [...prev, { role: "assistant", text: replyText }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text:
            "I encountered a temporary connection issue. Please make sure the backend server is running and try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 fade-in-up">
      {/* Title */}
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-white" style={{ fontFamily: "Outfit, sans-serif" }}>
          💬 Rate Fairness Chat Assistant
        </h2>
        <p className="text-xs sm:text-sm text-slate-400">
          Inquire into your ML predictions, SHAP attribution values, and lender negotiation strategies.
        </p>
      </div>

      {/* Suggested Questions */}
      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((s, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => sendMessage(s)}
            className="text-[11px] px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 transition-colors cursor-pointer text-left"
          >
            💡 {s}
          </button>
        ))}
      </div>

      {/* Chat Window */}
      <div className="glass rounded-2xl p-4 sm:p-5 flex flex-col h-[420px] border border-indigo-500/20">
        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${
                m.role === "user" ? "items-end" : "items-start"
              }`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
                  m.role === "user"
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/20"
                    : "bg-slate-800/90 text-slate-200 border border-white/5"
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-xs text-indigo-300">
              <div className="spinner !w-4 !h-4" />
              <span>Analyzing contextual SHAP data...</span>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="mt-3 flex gap-2 pt-3 border-t border-white/5"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything about your loan rate..."
            className="form-input text-xs flex-1"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="btn-primary !w-auto px-5 py-2 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-40"
          >
            <span>Send</span>
          </button>
        </form>
      </div>

      {/* Disclaimer */}
      <p className="text-[10px] text-slate-500 text-center italic">
        ⚠️ AI responses are derived strictly from model predictions and synthetic reference baselines. Not licensed financial advice.
      </p>
    </div>
  );
}
