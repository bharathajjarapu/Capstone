import { useEffect, useMemo, useRef, useState } from "react";
import {
  generateReport,
  getReportById,
  getReports,
  previewReport,
  triggerReportDownload,
} from "../api/reportApi.js";
import { getTaxTypes } from "../api/taxApi.js";
import { getVendors } from "../api/vendorApi.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import DataTable from "../components/DataTable.jsx";
import StatusBadge from "../components/StatusBadge.jsx";

const reportTypes = ["Summary", "ByVendor", "ByStatus", "ByAccountant", "ByMonth"];
const statusOptions = ["PENDING", "APPROVED", "REJECTED"];

const filterBtn =
  "rounded-lg border px-3 py-2 text-sm font-medium transition-colors shadow-sm";
const filterBtnOff = `${filterBtn} border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-50`;
const filterBtnOn = `${filterBtn} border-neutral-300 bg-neutral-50 text-neutral-900 ring-2 ring-neutral-900/10`;

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

export default function AnalystDashboard() {
  const { role } = useAuth();
  const { pushToast } = useToast();
  const [activeTab, setActiveTab] = useState("explorer");
  const [reportRows, setReportRows] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [reportType, setReportType] = useState("Summary");
  const [reportName, setReportName] = useState("");
  const [error, setError] = useState("");
  const [vendors, setVendors] = useState([]);
  const [taxTypes, setTaxTypes] = useState([]);
  const [openFilter, setOpenFilter] = useState(null);
  const [readyBanner, setReadyBanner] = useState(null);
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
  const [previewResult, setPreviewResult] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const reportRowsRef = useRef(reportRows);
  reportRowsRef.current = reportRows;
  const readyToastSentForId = useRef(new Set());

  const toggleFilter = (key) => {
    setOpenFilter((prev) => (prev === key ? null : key));
  };

  const stats = useMemo(() => {
    const list = Array.isArray(reportRows) ? reportRows : [];
    return {
      total: String(list.length),
      ready: String(list.filter((r) => r.status === "READY").length),
      processing: String(list.filter((r) => r.status === "PROCESSING").length),
      failed: String(list.filter((r) => r.status === "FAILED").length),
    };
  }, [reportRows]);

  async function loadReports() {
    setReportsLoading(true);
    try {
      const data = await getReports();
      setReportRows(Array.isArray(data) ? data : []);
    } catch {
      setError("Could not load reports.");
    } finally {
      setReportsLoading(false);
    }
  }

  useEffect(() => {
    loadReports();
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
        // optional
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [role]);

  const processingKey = reportRows
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
        const prevSnapshot = reportRowsRef.current;
        for (const u of updates) {
          const old = prevSnapshot.find((r) => r.id === u.id);
          if (old?.status !== "PROCESSING" || u.status !== "READY") continue;
          if (readyToastSentForId.current.has(u.id)) continue;
          readyToastSentForId.current.add(u.id);
          const label = u.name?.trim() ? u.name : "Untitled";
          pushToast({
            title: "Report ready",
            message: `${label} · ${u.reportType}`,
            variant: "success",
            actions: [
              { label: "PDF", onClick: () => triggerReportDownload(u.id, "pdf") },
              { label: "XLSX", onClick: () => triggerReportDownload(u.id, "xlsx") },
            ],
          });
          setReadyBanner({
            id: u.id,
            name: label,
            reportType: u.reportType,
          });
        }
        setReportRows((prev) => {
          const map = new Map(updates.map((x) => [x.id, x]));
          return prev.map((r) => map.get(r.id) ?? r);
        });
      } catch {
        // ignore
      }
    }, 3000);
    return () => clearInterval(timer);
  }, [processingKey, pushToast]);

  useEffect(() => {
    if (role !== "Analyst") return;
    let cancelled = false;
    const handle = setTimeout(() => {
      (async () => {
        setPreviewLoading(true);
        try {
          const filters = buildFilters(filterForm);
          const res = await previewReport(filters);
          if (!cancelled) setPreviewResult(res);
        } catch {
          if (!cancelled) setPreviewResult(null);
        } finally {
          if (!cancelled) setPreviewLoading(false);
        }
      })();
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [filterForm, role]);

  async function generate() {
    setError("");
    try {
      const filters = buildFilters(filterForm);
      const name = reportName.trim();
      const { id } = await generateReport({
        reportType,
        filters,
        ...(name ? { name } : {}),
      });
      const row = await getReportById(id);
      setReportRows((prev) => [row, ...prev]);
      pushToast({
        title: "Report queued",
        message: "We'll notify you when the export is ready.",
        variant: "info",
      });
    } catch {
      setError("Could not queue report.");
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

  const previewColumns = useMemo(
    () => [
      { key: "id", label: "ID" },
      { key: "invoiceNo", label: "Invoice" },
      { key: "vendorName", label: "Vendor" },
      { key: "status", label: "Status" },
      {
        key: "totalAmount",
        label: "Amount",
        render: (r) => (r.totalAmount != null ? Number(r.totalAmount).toFixed(2) : "—"),
      },
      {
        key: "submittedAt",
        label: "Submitted",
        render: (r) => (r.submittedAt ? new Date(r.submittedAt).toLocaleString() : "—"),
      },
      {
        key: "dueDate",
        label: "Due",
        render: (r) => (r.dueDate ? String(r.dueDate) : "—"),
      },
      { key: "submittedByName", label: "Submitted by" },
      { key: "taxTypeName", label: "Tax" },
    ],
    []
  );

  const historyColumns = useMemo(
    () => [
      {
        key: "name",
        label: "Report",
        render: (r) => (
          <div>
            <div className="text-base font-semibold text-neutral-900">{r.name?.trim() ? r.name : "Untitled"}</div>
            <div className="text-xs text-neutral-500">{r.reportType}</div>
          </div>
        ),
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
            <div className="flex flex-wrap gap-2 text-sm">
              <button
                type="button"
                className="text-sky-700 hover:underline"
                onClick={() => triggerReportDownload(r.id, "pdf")}
              >
                PDF
              </button>
              <button
                type="button"
                className="text-sky-700 hover:underline"
                onClick={() => triggerReportDownload(r.id, "xlsx")}
              >
                XLSX
              </button>
            </div>
          ) : null,
      },
    ],
    []
  );

  const previewItems = previewResult?.items ?? previewResult?.Items ?? [];
  const previewTotal = previewResult?.totalCount ?? previewResult?.TotalCount ?? 0;

  const dateSummary =
    filterForm.dateFrom || filterForm.dateTo
      ? `${filterForm.dateFrom || "…"} → ${filterForm.dateTo || "…"}`
      : "Any";

  return (
    <div>
      <h1 className="text-lg font-semibold">Analyst</h1>

      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-neutral-200 bg-white p-4 text-sm">
          <div className="text-neutral-600">Total reports</div>
          <div className="mt-1 text-xl font-semibold">{stats.total}</div>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4 text-sm">
          <div className="text-neutral-600">Ready</div>
          <div className="mt-1 text-xl font-semibold">{stats.ready}</div>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4 text-sm">
          <div className="text-neutral-600">Processing</div>
          <div className="mt-1 text-xl font-semibold">{stats.processing}</div>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4 text-sm">
          <div className="text-neutral-600">Failed</div>
          <div className="mt-1 text-xl font-semibold">{stats.failed}</div>
        </div>
      </div>

      <div className="mt-6 flex gap-1 border-b border-neutral-200">
        <button
          type="button"
          className={`rounded-t-md px-4 py-2 text-sm font-medium ${
            activeTab === "explorer"
              ? "border border-b-0 border-neutral-200 bg-white text-neutral-900"
              : "text-neutral-600 hover:text-neutral-900"
          }`}
          onClick={() => setActiveTab("explorer")}
        >
          Data Explorer
        </button>
        <button
          type="button"
          className={`rounded-t-md px-4 py-2 text-sm font-medium ${
            activeTab === "past"
              ? "border border-b-0 border-neutral-200 bg-white text-neutral-900"
              : "text-neutral-600 hover:text-neutral-900"
          }`}
          onClick={() => setActiveTab("past")}
        >
          Past Reports
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {role === "Analyst" && activeTab === "explorer" && (
        <div className="space-y-4 rounded-b-lg rounded-tr-lg border border-t-0 border-neutral-200 bg-white p-4">
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <label className="block text-xs font-medium text-neutral-600">Report type</label>
              <select
                className="mt-0.5 rounded-md border border-neutral-200 px-2 py-1.5 text-sm"
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
            <div className="min-w-[12rem] flex-1">
              <label className="block text-xs font-medium text-neutral-600">Report name</label>
              <input
                type="text"
                placeholder="Report name"
                className="mt-0.5 w-full rounded-md border border-neutral-200 px-2 py-1.5 text-sm"
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
              />
            </div>
            <button
              type="button"
              className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white"
              onClick={generate}
            >
              Generate report
            </button>
          </div>

          {openFilter !== null ? (
            <button
              type="button"
              className="fixed inset-0 z-[100] cursor-default bg-black/20"
              aria-label="Close filters"
              onClick={() => setOpenFilter(null)}
            />
          ) : null}

          <div className="relative z-[110] flex flex-wrap items-stretch gap-2">
            <div className="relative">
              <button
                type="button"
                className={openFilter === "submitted" ? filterBtnOn : filterBtnOff}
                onClick={() => toggleFilter("submitted")}
              >
                Submitted dates
                <span className="ml-1 text-xs font-normal text-neutral-500">({dateSummary})</span>
              </button>
              {openFilter === "submitted" ? (
                <div
                  className="absolute left-0 z-[120] mt-1 w-64 space-y-2 rounded-lg border border-neutral-200 bg-white p-3 shadow-lg"
                  onClick={(e) => e.stopPropagation()}
                >
                  <label className="block text-xs font-medium text-neutral-700">
                    From
                    <input
                      type="date"
                      className="mt-0.5 w-full rounded border border-neutral-200 px-2 py-1.5 text-sm"
                      value={filterForm.dateFrom}
                      onChange={(e) => setFilterForm((p) => ({ ...p, dateFrom: e.target.value }))}
                    />
                  </label>
                  <label className="block text-xs font-medium text-neutral-700">
                    To
                    <input
                      type="date"
                      className="mt-0.5 w-full rounded border border-neutral-200 px-2 py-1.5 text-sm"
                      value={filterForm.dateTo}
                      onChange={(e) => setFilterForm((p) => ({ ...p, dateTo: e.target.value }))}
                    />
                  </label>
                </div>
              ) : null}
            </div>

            <div className="relative">
              <button type="button" className={openFilter === "due" ? filterBtnOn : filterBtnOff} onClick={() => toggleFilter("due")}>
                Due dates
              </button>
              {openFilter === "due" ? (
                <div
                  className="absolute left-0 z-[120] mt-1 w-64 space-y-2 rounded-lg border border-neutral-200 bg-white p-3 shadow-lg"
                  onClick={(e) => e.stopPropagation()}
                >
                  <label className="block text-xs font-medium text-neutral-700">
                    From
                    <input
                      type="date"
                      className="mt-0.5 w-full rounded border border-neutral-200 px-2 py-1.5 text-sm"
                      value={filterForm.dueDateFrom}
                      onChange={(e) => setFilterForm((p) => ({ ...p, dueDateFrom: e.target.value }))}
                    />
                  </label>
                  <label className="block text-xs font-medium text-neutral-700">
                    To
                    <input
                      type="date"
                      className="mt-0.5 w-full rounded border border-neutral-200 px-2 py-1.5 text-sm"
                      value={filterForm.dueDateTo}
                      onChange={(e) => setFilterForm((p) => ({ ...p, dueDateTo: e.target.value }))}
                    />
                  </label>
                </div>
              ) : null}
            </div>

            <div className="relative">
              <button
                type="button"
                className={openFilter === "status" ? filterBtnOn : filterBtnOff}
                onClick={() => toggleFilter("status")}
              >
                Statuses ({filterForm.statuses.length})
              </button>
              {openFilter === "status" ? (
                <div
                  className="absolute left-0 z-[120] mt-1 max-h-52 min-w-[11rem] overflow-y-auto rounded-lg border border-neutral-200 bg-white p-2 shadow-lg"
                  onClick={(e) => e.stopPropagation()}
                >
                  {statusOptions.map((s) => (
                    <label key={s} className="flex cursor-pointer items-center gap-2 py-1.5 text-sm">
                      <input type="checkbox" checked={filterForm.statuses.includes(s)} onChange={() => toggleStatus(s)} />
                      {s}
                    </label>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="relative">
              <button
                type="button"
                className={openFilter === "vendor" ? filterBtnOn : filterBtnOff}
                onClick={() => toggleFilter("vendor")}
              >
                Vendors ({filterForm.vendorIds.length})
              </button>
              {openFilter === "vendor" ? (
                <div
                  className="absolute left-0 z-[120] mt-1 max-h-52 w-72 overflow-y-auto rounded-lg border border-neutral-200 bg-white p-2 shadow-lg"
                  onClick={(e) => e.stopPropagation()}
                >
                  {vendors.map((v) => (
                    <label key={v.id} className="flex cursor-pointer items-center gap-2 py-1 text-sm">
                      <input type="checkbox" checked={filterForm.vendorIds.includes(v.id)} onChange={() => toggleVendor(v.id)} />
                      {v.name}
                    </label>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="relative">
              <button type="button" className={openFilter === "tax" ? filterBtnOn : filterBtnOff} onClick={() => toggleFilter("tax")}>
                Tax types ({filterForm.taxTypeIds.length})
              </button>
              {openFilter === "tax" ? (
                <div
                  className="absolute left-0 z-[120] mt-1 max-h-52 min-w-[12rem] overflow-y-auto rounded-lg border border-neutral-200 bg-white p-2 shadow-lg"
                  onClick={(e) => e.stopPropagation()}
                >
                  {taxTypes.map((t) => (
                    <label key={t.id} className="flex cursor-pointer items-center gap-2 py-1 text-sm">
                      <input type="checkbox" checked={filterForm.taxTypeIds.includes(t.id)} onChange={() => toggleTax(t.id)} />
                      {t.name}
                    </label>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="relative">
              <button
                type="button"
                className={openFilter === "amount" ? filterBtnOn : filterBtnOff}
                onClick={() => toggleFilter("amount")}
              >
                Amounts
              </button>
              {openFilter === "amount" ? (
                <div
                  className="absolute right-0 z-[120] mt-1 w-56 space-y-2 rounded-lg border border-neutral-200 bg-white p-3 shadow-lg"
                  onClick={(e) => e.stopPropagation()}
                >
                  <label className="block text-xs font-medium text-neutral-700">
                    Min
                    <input
                      type="number"
                      step="0.01"
                      className="mt-0.5 w-full rounded border border-neutral-200 px-2 py-1.5 text-sm"
                      value={filterForm.minAmount}
                      onChange={(e) => setFilterForm((p) => ({ ...p, minAmount: e.target.value }))}
                    />
                  </label>
                  <label className="block text-xs font-medium text-neutral-700">
                    Max
                    <input
                      type="number"
                      step="0.01"
                      className="mt-0.5 w-full rounded border border-neutral-200 px-2 py-1.5 text-sm"
                      value={filterForm.maxAmount}
                      onChange={(e) => setFilterForm((p) => ({ ...p, maxAmount: e.target.value }))}
                    />
                  </label>
                </div>
              ) : null}
            </div>

            <div className="relative">
              <button
                type="button"
                className={openFilter === "advanced" ? filterBtnOn : filterBtnOff}
                onClick={() => toggleFilter("advanced")}
              >
                Advanced
              </button>
              {openFilter === "advanced" ? (
                <div
                  className="absolute right-0 z-[120] mt-1 w-72 space-y-2 rounded-lg border border-neutral-200 bg-white p-3 shadow-lg"
                  onClick={(e) => e.stopPropagation()}
                >
                  <label className="block text-xs font-medium text-neutral-700">
                    Submitted by user IDs
                    <input
                      type="text"
                      placeholder="e.g. 2,3"
                      className="mt-0.5 w-full rounded border border-neutral-200 px-2 py-1.5 text-sm"
                      value={filterForm.submittedByIdsText}
                      onChange={(e) => setFilterForm((p) => ({ ...p, submittedByIdsText: e.target.value }))}
                    />
                  </label>
                  <label className="block text-xs font-medium text-neutral-700">
                    Reviewed by user IDs
                    <input
                      type="text"
                      placeholder="e.g. 4"
                      className="mt-0.5 w-full rounded border border-neutral-200 px-2 py-1.5 text-sm"
                      value={filterForm.reviewedByIdsText}
                      onChange={(e) => setFilterForm((p) => ({ ...p, reviewedByIdsText: e.target.value }))}
                    />
                  </label>
                </div>
              ) : null}
            </div>
          </div>

          <div className="space-y-2 border-t border-neutral-100 pt-3">
            <p className="text-sm text-neutral-700">
              {previewLoading ? (
                <span className="text-neutral-500">Loading preview…</span>
              ) : (
                <>
                  <span className="font-medium">{previewTotal}</span> payment(s) matched
                  {previewTotal > 500 ? <span className="text-amber-700"> (showing first 500)</span> : null}
                </>
              )}
            </p>
            <div className="max-h-96 overflow-auto rounded border border-neutral-100">
              <DataTable columns={previewColumns} rows={previewItems} />
            </div>

            {readyBanner ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50/80 px-3 py-2.5 text-sm">
                <div>
                  <p className="font-medium text-emerald-950">Latest report ready</p>
                  <p className="text-xs text-emerald-900/80">
                    {readyBanner.name} · {readyBanner.reportType} · ID {readyBanner.id}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="rounded-md bg-emerald-800 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-900"
                    onClick={() => triggerReportDownload(readyBanner.id, "pdf")}
                  >
                    PDF
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-emerald-700 bg-white px-2.5 py-1 text-xs font-medium text-emerald-900 hover:bg-emerald-100"
                    onClick={() => triggerReportDownload(readyBanner.id, "xlsx")}
                  >
                    XLSX
                  </button>
                  <button type="button" className="text-xs text-emerald-800/80 underline hover:text-emerald-950" onClick={() => setReadyBanner(null)}>
                    Dismiss
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {role === "Analyst" && activeTab === "past" && (
        <div className="rounded-b-lg rounded-tr-lg border border-t-0 border-neutral-200 bg-white p-4">
          {reportsLoading ? (
            <p className="text-sm text-neutral-600">Loading…</p>
          ) : (
            <DataTable columns={historyColumns} rows={reportRows} />
          )}
        </div>
      )}
    </div>
  );
}
