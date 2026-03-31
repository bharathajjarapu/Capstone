import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getPayments } from "../api/paymentApi.js";
import DataTable from "../components/DataTable.jsx";
import StatusBadge from "../components/StatusBadge.jsx";

export default function ManagerDashboard() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("PENDING");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({ pending: "—", approved: "—", rejected: "—" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getPayments();
        const list = Array.isArray(data) ? data : [];
        if (!cancelled) {
          setCounts({
            pending: String(list.filter((p) => p.status === "PENDING").length),
            approved: String(list.filter((p) => p.status === "APPROVED").length),
            rejected: String(list.filter((p) => p.status === "REJECTED").length),
          });
        }
      } catch {
        if (!cancelled) setCounts({ pending: "?", approved: "?", rejected: "?" });
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
        const data = await getPayments(tab);
        const list = Array.isArray(data) ? data : [];
        if (!cancelled) setRows(list.filter((p) => p.status === tab));
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
      key: "department",
      label: "Department",
      render: (r) => r.department?.name ?? "—",
    },
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
          Pending: <strong>{counts.pending}</strong>
        </span>
        <span className="rounded-md border border-neutral-200 bg-white px-3 py-1.5">
          Approved: <strong>{counts.approved}</strong>
        </span>
        <span className="rounded-md border border-neutral-200 bg-white px-3 py-1.5">
          Rejected: <strong>{counts.rejected}</strong>
        </span>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className={`rounded-md px-3 py-1.5 text-sm ${tab === "PENDING" ? "bg-neutral-900 text-white" : "bg-white border border-neutral-200"}`}
          onClick={() => setTab("PENDING")}
        >
          Pending
        </button>
        <button
          type="button"
          className={`rounded-md px-3 py-1.5 text-sm ${tab === "APPROVED" ? "bg-neutral-900 text-white" : "bg-white border border-neutral-200"}`}
          onClick={() => setTab("APPROVED")}
        >
          Approved
        </button>
        <button
          type="button"
          className={`rounded-md px-3 py-1.5 text-sm ${tab === "REJECTED" ? "bg-neutral-900 text-white" : "bg-white border border-neutral-200"}`}
          onClick={() => setTab("REJECTED")}
        >
          Rejected
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
