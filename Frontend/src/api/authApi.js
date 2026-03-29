import http from "./http.js";

export async function login(email, password) {
  const { data } = await http.post("/api/auth/login", { email, password });
  return data;
}

export async function changePassword(newPassword) {
  const { data } = await http.post("/api/auth/change-password", { newPassword });
  return data;
}
