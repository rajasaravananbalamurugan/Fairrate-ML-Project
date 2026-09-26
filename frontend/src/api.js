import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

export async function predictFairRate(payload) {
  const { data } = await api.post("/predict", payload);
  return data;
}

export async function fetchBanks() {
  const { data } = await api.get("/banks");
  return data.banks;
}

export async function fetchLoanTypes() {
  const { data } = await api.get("/loan-types");
  return data.loan_types;
}

export async function healthCheck() {
  const { data } = await api.get("/health");
  return data;
}

export async function fetchBankComparison(params) {
  const { data } = await api.get("/compare", { params });
  return data;
}

export default api;
