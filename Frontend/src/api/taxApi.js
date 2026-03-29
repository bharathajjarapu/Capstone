import http from "./http.js";

export async function getTaxTypes() {
  const { data } = await http.get("/api/tax-types");
  return data;
}
