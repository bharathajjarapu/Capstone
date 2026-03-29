import http from "./http.js";

export async function generateReport(payload) {
  const { data } = await http.post("/api/reports/generate", payload);
  return data;
}

export async function getReports() {
  const { data } = await http.get("/api/reports");
  return data;
}

export async function getReportById(id) {
  const { data } = await http.get(`/api/reports/${id}`);
  return data;
}

export async function downloadReport(id) {
  const { data } = await http.get(`/api/reports/${id}/download`, { responseType: "text" });
  return data;
}
