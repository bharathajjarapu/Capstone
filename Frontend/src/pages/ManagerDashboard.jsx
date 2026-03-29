import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getPayments } from "../api/paymentApi.js";
import DataTable from "../components/DataTable.jsx";
import StatusBadge from "../components/StatusBadge.jsx";

export default function ManagerDashboard() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("pending");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({ pending: "—", reviewed: "—" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getPayments();
        const list = Array.isArray(data) ? data : [];
        if (!cancelled) {
          setCounts({
            pending: String(list.filter((p) => p.status === "PENDING").length),
            reviewed: String(list.filter((p) => p.status !== "PENDING").length),
          });
        }
      } catch {
        if (!cancelled) setCounts({ pending: "?", reviewed: "?" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const status = tab === "pending" ? "PENDING" : undefined;
        const data = await getPayments(status);
        if (!cancelled) {
          if (tab === "history") {
            setRows(data.filter((p) => p.status !== "PENDING"));
          } else {
            setRows(data);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab]);

  const columns = [
    { key: "invoiceNo", label: "Invoice" },
    {
      key: "vendor",
      label: "Vendor",
      render: (r) => r.vendor?.name ?? "",
    },
    {
      key: "submittedBy",
      label: "Accountant",
      render: (r) => r.submittedBy?.fullName ?? "",
    },
    {
      key: "totalAmount",
      label: "Total",
      render: (r) => Number(r.totalAmount).toFixed(2),
    },
    {
      key: "submittedAt",
      label: "Submitted",
      render: (r) => new Date(r.submittedAt).toLocaleString(),
    },
    {
      key: "status",
      label: "Status",
      render: (r) => <StatusBadge status={r.status} />,
    },
  ];

  return (
    <div>
      <h1 className="text-lg font-semibold">Manager</h1>
      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        <span className="rounded-md border border-neutral-200 bg-white px-3 py-1.5">
          Pending queue: <strong>{counts.pending}</strong>
        </span>
        <span className="rounded-md border border-neutral-200 bg-white px-3 py-1.5">
          Reviewed: <strong>{counts.reviewed}</strong>
        </span>
      </div>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          className={`rounded-md px-3 py-1.5 text-sm ${tab === "pending" ? "bg-neutral-900 text-white" : "bg-white border border-neutral-200"}`}
          onClick={() => setTab("pending")}
        >
          Pending
        </button>
        <button
          type="button"
          className={`rounded-md px-3 py-1.5 text-sm ${tab === "history" ? "bg-neutral-900 text-white" : "bg-white border border-neutral-200"}`}
          onClick={() => setTab("history")}
        >
          History
        </button>
      </div>
      {loading ? (
        <p className="mt-4 text-sm text-neutral-600">Loading…</p>
      ) : (
        <div className="mt-4">
          <DataTable
            columns={columns}
            rows={rows}
            onRowClick={(r) => navigate(`/manager/payments/${r.id}`)}
          />
        </div>
      )}
    </div>
  );
}
