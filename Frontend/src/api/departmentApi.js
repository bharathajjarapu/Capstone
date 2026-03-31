import http from "./http.js";

export async function getDepartments() {
  const { data } = await http.get("/api/departments");
  return data;
}
