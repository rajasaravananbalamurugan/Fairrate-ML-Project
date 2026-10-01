import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: API_BASE,
  timeout: 25000,
  headers: { "Content-Type": "application/json" },
});

export async function healthCheck() {
  const { data } = await api.get("/health");
  return data;
}

export async function predictFairRate(payload) {
  const { data } = await api.post("/predict", payload);
  return data;
}

export async function predictFairRateV2(payload) {
  const { data } = await api.post("/predict-v2", payload);
  return data;
}

export async function fetchBankComparison(params) {
  const { data } = await api.get("/compare", { params });
  return data;
}

// ── Model Lab & Governance ──
export async function fetchDataSources() {
  const { data } = await api.get("/data/sources");
  return data;
}

export async function fetchModelComparison() {
  const { data } = await api.get("/model/comparison");
  return data;
}

export async function fetchFairnessAudit(threshold = 1.0) {
  const { data } = await api.get("/audit/fairness", { params: { threshold } });
  return data;
}

export async function fetchDriftMonitor() {
  const { data } = await api.get("/monitor/drift");
  return data;
}

export async function fetchModelRegistry() {
  const { data } = await api.get("/model/version");
  return data;
}

// ── Borrower Planning Suite ──
export async function planPrepayment(payload) {
  const { data } = await api.post("/plan/prepayment", payload);
  return data;
}

export async function planApr(payload) {
  const { data } = await api.post("/plan/apr", payload);
  return data;
}

export async function planRepoScenario(payload) {
  const { data } = await api.post("/plan/repo-scenario", payload);
  return data;
}

export async function planBalanceTransfer(payload) {
  const { data } = await api.post("/plan/balance-transfer", payload);
  return data;
}

export async function planCreditImprovement(payload) {
  const { data } = await api.post("/plan/credit-improvement", payload);
  return data;
}

// ── Tools Suite ──
export async function parseOfferLetter(file) {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await api.post("/tools/parse-offer", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function generateNegotiationScript(payload) {
  const { data } = await api.post("/tools/negotiation-script", payload);
  return data;
}

export async function askChatAssistant(payload) {
  const { data } = await api.post("/tools/chat", payload);
  return data;
}

export default api;
