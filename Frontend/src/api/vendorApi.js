import http from "./http.js";

export async function getVendors() {
  const { data } = await http.get("/api/vendors");
  return data;
}

export async function createVendor(payload) {
  const { data } = await http.post("/api/vendors", payload);
  return data;
}

export async function updateVendor(id, payload) {
  const { data } = await http.put(`/api/vendors/${id}`, payload);
  return data;
}

export async function deactivateVendor(id) {
  await http.patch(`/api/vendors/${id}/deactivate`);
}

export async function getBankAccounts(vendorId) {
  const { data } = await http.get(`/api/vendors/${vendorId}/accounts`);
  return data;
}

export async function addBankAccount(vendorId, payload) {
  const { data } = await http.post(`/api/vendors/${vendorId}/accounts`, payload);
  return data;
}

export async function updateBankAccount(vendorId, accountId, payload) {
  const { data } = await http.put(`/api/vendors/${vendorId}/accounts/${accountId}`, payload);
  return data;
}

export async function setDefaultAccount(vendorId, accountId) {
  await http.patch(`/api/vendors/${vendorId}/accounts/${accountId}/default`);
}
