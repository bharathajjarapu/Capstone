import http from "./http.js";

export async function getPayments(status) {
  const { data } = await http.get("/api/payments", { params: status ? { status } : {} });
  return data;
}

export async function createPayment(payload) {
  const { data } = await http.post("/api/payments", payload);
  return data;
}

export async function getPaymentById(id) {
  const { data } = await http.get(`/api/payments/${id}`);
  return data;
}

export async function approvePayment(id, note) {
  const { data } = await http.post(`/api/payments/${id}/approve`, { note });
  return data;
}

export async function rejectPayment(id, note) {
  const { data } = await http.post(`/api/payments/${id}/reject`, { note });
  return data;
}
