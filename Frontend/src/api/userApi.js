import http from "./http.js";

export async function getUsers() {
  const { data } = await http.get("/api/users");
  return data;
}

export async function createUser(payload) {
  const { data } = await http.post("/api/users", payload);
  return data;
}

export async function updateUser(id, payload) {
  const { data } = await http.put(`/api/users/${id}`, payload);
  return data;
}

export async function deactivateUser(id) {
  await http.patch(`/api/users/${id}/deactivate`);
}

export async function resetPassword(id, tempPassword) {
  await http.patch(`/api/users/${id}/reset-password`, { tempPassword });
}
