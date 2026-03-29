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

/** Soft-delete user (sets inactive). */
export async function deleteUser(id) {
  await http.delete(`/api/users/${id}`);
}

/** Server generates temp password when omitted. */
export async function resetPassword(id, tempPassword) {
  const body = tempPassword ? { tempPassword } : {};
  const { data } = await http.patch(`/api/users/${id}/reset-password`, body);
  return data;
}
