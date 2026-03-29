import { useEffect, useMemo, useState } from "react";
import { downloadReport, generateReport, getReportById, getReports } from "../api/reportApi.js";
import { getTaxTypes } from "../api/taxApi.js";
import { getVendors } from "../api/vendorApi.js";
import { useAuth } from "../context/AuthContext.jsx";
import DataTable from "../components/DataTable.jsx";
import StatusBadge from "../components/StatusBadge.jsx";

const reportTypes = ["Summary", "ByVendor", "ByStatus", "ByAccountant", "ByMonth"];
const statusOptions = ["PENDING", "APPROVED", "REJECTED"];

function parseCommaInts(text) {
  if (!text?.trim()) return undefined;
  const nums = text
    .split(",")
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !Number.isNaN(n));
  return nums.length ? nums : undefined;
}

function parseDecimal(text) {
  if (text == null || text === "") return undefined;
  const n = Number(text);
  return Number.isNaN(n) ? undefined : n;
}

function buildFilters(form) {
  const f = {};
  if (form.dateFrom) f.dateFrom = form.dateFrom;
  if (form.dateTo) f.dateTo = form.dateTo;
  if (form.dueDateFrom) f.dueDateFrom = form.dueDateFrom;
  if (form.dueDateTo) f.dueDateTo = form.dueDateTo;
  if (form.vendorIds?.length) f.vendorIds = form.vendorIds;
  if (form.statuses?.length) f.statuses = form.statuses;
  const sub = parseCommaInts(form.submittedByIdsText);
  if (sub) f.submittedByIds = sub;
  const rev = parseCommaInts(form.reviewedByIdsText);
  if (rev) f.reviewedByIds = rev;
  const minA = parseDecimal(form.minAmount);
  if (minA !== undefined) f.minAmount = minA;
  const maxA = parseDecimal(form.maxAmount);
  if (maxA !== undefined) f.maxAmount = maxA;
  if (form.taxTypeIds?.length) f.taxTypeIds = form.taxTypeIds;
  return f;
}

export default function ReportListPage() {
  const { role } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState("Summary");
  const [error, setError] = useState("");
  const [vendors, setVendors] = useState([]);
  const [taxTypes, setTaxTypes] = useState([]);
  const [filterForm, setFilterForm] = useState({
    dateFrom: "",
    dateTo: "",
    dueDateFrom: "",
    dueDateTo: "",
    vendorIds: [],
    statuses: [],
    submittedByIdsText: "",
    reviewedByIdsText: "",
    minAmount: "",
    maxAmount: "",
    taxTypeIds: [],
  });

  async function load() {
    setLoading(true);
    try {
      const data = await getReports();
      setRows(data);
    } catch {
      setError("Could not load reports.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (role !== "Analyst") return;
    let cancelled = false;
    (async () => {
      try {
        const [vList, taxList] = await Promise.all([getVendors(), getTaxTypes()]);
        if (!cancelled) {
          setVendors(vList ?? []);
          setTaxTypes(taxList ?? []);
        }
      } catch {
        // optional for report filters
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [role]);

  const processingKey = rows
    .filter((r) => r.status === "PROCESSING")
    .map((r) => r.id)
    .sort((a, b) => a - b)
    .join(",");

  useEffect(() => {
    if (!processingKey) return;
    const ids = processingKey.split(",").map(Number);
    const timer = setInterval(async () => {
      try {
        const updates = await Promise.all(ids.map((id) => getReportById(id)));
        setRows((prev) => {
          const map = new Map(updates.map((u) => [u.id, u]));
          return prev.map((r) => map.get(r.id) ?? r);
        });
      } catch {
        // ignore polling errors
      }
    }, 3000);
    return () => clearInterval(timer);
  }, [processingKey]);

  async function generate() {
    setError("");
    try {
      const filters = buildFilters(filterForm);
      const { id } = await generateReport({ reportType, filters });
      const row = await getReportById(id);
      setRows((prev) => [row, ...prev]);
    } catch {
      setError("Could not queue report.");
    }
  }

  async function download(id) {
    try {
      const text = await downloadReport(id);
      const blob = new Blob([text], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `report-${id}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Download failed.");
    }
  }

  function toggleVendor(id) {
    setFilterForm((prev) => {
      const set = new Set(prev.vendorIds);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      return { ...prev, vendorIds: [...set] };
    });
  }

  function toggleStatus(s) {
    setFilterForm((prev) => {
      const set = new Set(prev.statuses);
      if (set.has(s)) set.delete(s);
      else set.add(s);
      return { ...prev, statuses: [...set] };
    });
  }

  function toggleTax(id) {
    setFilterForm((prev) => {
      const set = new Set(prev.taxTypeIds);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      return { ...prev, taxTypeIds: [...set] };
    });
  }

  const columns = useMemo(
    () => [
      { key: "reportType", label: "Type" },
      {
        key: "filterJson",
        label: "Filters",
        render: (r) => {
          const raw = r.filterJson;
          if (!raw || typeof raw !== "string") return "—";
          const short = raw.length > 72 ? `${raw.slice(0, 72)}…` : raw;
          return (
            <span className="block max-w-xs truncate text-neutral-600" title={raw}>
              {short}
            </span>
          );
        },
      },
      {
        key: "requestedAt",
        label: "Requested",
        render: (r) => new Date(r.requestedAt).toLocaleString(),
      },
      {
        key: "status",
        label: "Status",
        render: (r) => <StatusBadge status={r.status} />,
      },
      {
        key: "actions",
        label: "",
        render: (r) =>
          r.status === "READY" ? (
            <button type="button" className="text-sky-700 hover:underline" onClick={() => download(r.id)}>
              Download
            </button>
          ) : null,
      },
    ],
    []
  );

  return (
    <div>
      <h1 className="text-lg font-semibold">Reports</h1>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {role === "Analyst" && (
        <div className="mt-4 space-y-4 rounded-lg border border-neutral-200 bg-white p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-sm font-medium">Report type</label>
              <select
                className="mt-1 rounded-md border border-neutral-200 px-3 py-2 text-sm"
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
              >
                {reportTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white"
              onClick={generate}
            >
              Generate
            </button>
          </div>

          <details className="text-sm">
            <summary className="cursor-pointer font-medium text-neutral-700">Filters (optional)</summary>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <label className="block">
                Submitted from
                <input
                  type="date"
                  className="mt-1 w-full rounded border border-neutral-200 px-2 py-1"
                  value={filterForm.dateFrom}
                  onChange={(e) => setFilterForm((p) => ({ ...p, dateFrom: e.target.value }))}
                />
              </label>
              <label className="block">
                Submitted to
                <input
                  type="date"
                  className="mt-1 w-full rounded border border-neutral-200 px-2 py-1"
                  value={filterForm.dateTo}
                  onChange={(e) => setFilterForm((p) => ({ ...p, dateTo: e.target.value }))}
                />
              </label>
              <label className="block">
                Due from
                <input
                  type="date"
                  className="mt-1 w-full rounded border border-neutral-200 px-2 py-1"
                  value={filterForm.dueDateFrom}
                  onChange={(e) => setFilterForm((p) => ({ ...p, dueDateFrom: e.target.value }))}
                />
              </label>
              <label className="block">
                Due to
                <input
                  type="date"
                  className="mt-1 w-full rounded border border-neutral-200 px-2 py-1"
                  value={filterForm.dueDateTo}
                  onChange={(e) => setFilterForm((p) => ({ ...p, dueDateTo: e.target.value }))}
                />
              </label>
              <label className="block">
                Min amount
                <input
                  type="number"
                  step="0.01"
                  className="mt-1 w-full rounded border border-neutral-200 px-2 py-1"
                  value={filterForm.minAmount}
                  onChange={(e) => setFilterForm((p) => ({ ...p, minAmount: e.target.value }))}
                />
              </label>
              <label className="block">
                Max amount
                <input
                  type="number"
                  step="0.01"
                  className="mt-1 w-full rounded border border-neutral-200 px-2 py-1"
                  value={filterForm.maxAmount}
                  onChange={(e) => setFilterForm((p) => ({ ...p, maxAmount: e.target.value }))}
                />
              </label>
            </div>
            <div className="mt-3">
              <span className="text-neutral-600">Status</span>
              <div className="mt-1 flex flex-wrap gap-2">
                {statusOptions.map((s) => (
                  <label key={s} className="inline-flex items-center gap-1 text-sm">
                    <input
                      type="checkbox"
                      checked={filterForm.statuses.includes(s)}
                      onChange={() => toggleStatus(s)}
                    />
                    {s}
                  </label>
                ))}
              </div>
            </div>
            <div className="mt-3">
              <span className="text-neutral-600">Vendors</span>
              <div className="mt-1 max-h-32 overflow-y-auto rounded border border-neutral-100 p-2">
                {vendors.map((v) => (
                  <label key={v.id} className="mr-3 inline-flex items-center gap-1 text-sm">
                    <input type="checkbox" checked={filterForm.vendorIds.includes(v.id)} onChange={() => toggleVendor(v.id)} />
                    {v.name}
                  </label>
                ))}
              </div>
            </div>
            <div className="mt-3">
              <span className="text-neutral-600">Tax types</span>
              <div className="mt-1 flex flex-wrap gap-2">
                {taxTypes.map((t) => (
                  <label key={t.id} className="inline-flex items-center gap-1 text-sm">
                    <input type="checkbox" checked={filterForm.taxTypeIds.includes(t.id)} onChange={() => toggleTax(t.id)} />
                    {t.name}
                  </label>
                ))}
              </div>
            </div>
            <label className="mt-3 block">
              Submitted by user IDs (comma-separated)
              <input
                type="text"
                placeholder="e.g. 2,3"
                className="mt-1 w-full max-w-md rounded border border-neutral-200 px-2 py-1"
                value={filterForm.submittedByIdsText}
                onChange={(e) => setFilterForm((p) => ({ ...p, submittedByIdsText: e.target.value }))}
              />
            </label>
            <label className="mt-3 block">
              Reviewed by user IDs (comma-separated)
              <input
                type="text"
                placeholder="e.g. 4"
                className="mt-1 w-full max-w-md rounded border border-neutral-200 px-2 py-1"
                value={filterForm.reviewedByIdsText}
                onChange={(e) => setFilterForm((p) => ({ ...p, reviewedByIdsText: e.target.value }))}
              />
            </label>
          </details>
        </div>
      )}

      {loading ? (
        <p className="mt-4 text-sm text-neutral-600">Loading…</p>
      ) : (
        <div className="mt-4">
          <DataTable columns={columns} rows={rows} />
        </div>
      )}
    </div>
  );
}
