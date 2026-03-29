import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getReports } from "../api/reportApi.js";

export default function AnalystDashboard() {
  const [stats, setStats] = useState({ total: "—", ready: "—", processing: "—", failed: "—" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getReports();
        const list = Array.isArray(data) ? data : [];
        if (!cancelled) {
          setStats({
            total: String(list.length),
            ready: String(list.filter((r) => r.status === "READY").length),
            processing: String(list.filter((r) => r.status === "PROCESSING").length),
            failed: String(list.filter((r) => r.status === "FAILED").length),
          });
        }
      } catch {
        if (!cancelled) setStats({ total: "?", ready: "?", processing: "?", failed: "?" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
      <div className="mt-6">
        <Link
          to="/analyst/reports"
          className="inline-flex rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm font-medium hover:bg-neutral-50"
        >
          Open reports
        </Link>
      </div>
    </div>
  );
}
