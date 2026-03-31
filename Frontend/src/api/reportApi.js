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

/** PDF or XLSX blob and server-suggested filename (from Content-Disposition). */
export async function downloadReport(id, format = "pdf") {
  const fmt = (format || "pdf").toLowerCase();
  const ext = fmt === "pdf" ? "pdf" : "xlsx";
  const res = await http.get(`/api/reports/${id}/download`, {
    params: { format: fmt },
    responseType: "blob",
  });
  const cd = res.headers["content-disposition"];
  let filename = `report-${id}.${ext}`;
  if (typeof cd === "string") {
    const star = /filename\*=UTF-8''([^;\n]+)/i.exec(cd);
    const quoted = /filename="([^"]+)"/i.exec(cd);
    const plain = /filename=([^;\s]+)/i.exec(cd);
    const raw = star?.[1] ?? quoted?.[1] ?? plain?.[1];
    if (raw) {
      try {
        filename = decodeURIComponent(raw.replace(/^["']|["']$/g, ""));
      } catch {
        filename = raw.replace(/^["']|["']$/g, "");
      }
    }
  }
  return { blob: res.data, filename };
}

export function triggerReportDownload(id, format = "pdf") {
  return downloadReport(id, format).then(({ blob, filename }) => {
    const fmt = (format || "pdf").toLowerCase();
    const mime =
      fmt === "pdf"
        ? "application/pdf"
        : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    const blobObj = blob instanceof Blob ? blob : new Blob([blob], { type: mime });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blobObj);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  });
}
