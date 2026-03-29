import http from "./http.js";

export async function generateReport(payload) {
  const { data } = await http.post("/api/reports/generate", payload);
  return data;
}

export async function previewReport(filters) {
  const { data } = await http.post("/api/reports/preview", { filters });
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

/** PDF or XLSX blob. */
export async function downloadReport(id, format = "pdf") {
  const fmt = (format || "pdf").toLowerCase();
  const { data } = await http.get(`/api/reports/${id}/download`, {
    params: { format: fmt },
    responseType: "blob",
  });
  return data;
}

export function triggerReportDownload(id, format = "pdf") {
  return downloadReport(id, format).then((data) => {
    const fmt = (format || "pdf").toLowerCase();
    const ext = fmt === "pdf" ? "pdf" : "xlsx";
    const mime =
      fmt === "pdf"
        ? "application/pdf"
        : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    const blob = data instanceof Blob ? data : new Blob([data], { type: mime });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `report-${id}.${ext}`;
    a.click();
    URL.revokeObjectURL(a.href);
  });
}
