import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getPayments } from "../api/paymentApi.js";
import DataTable from "../components/DataTable.jsx";
import StatusBadge from "../components/StatusBadge.jsx";

export default function PaymentListPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getPayments();
        if (!cancelled) setRows(data);
      } catch {
        if (!cancelled) setError("Could not load payments.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
      key: "totalAmount",
      label: "Total",
      render: (r) => Number(r.totalAmount).toFixed(2),
    },
    {
      key: "status",
      label: "Status",
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: "submittedAt",
      label: "Submitted",
      render: (r) => new Date(r.submittedAt).toLocaleString(),
    },
  ];

  return (
    <div>
      <h1 className="text-lg font-semibold">Payment requests</h1>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {loading ? (
        <p className="mt-4 text-sm text-neutral-600">Loading…</p>
      ) : (
        <div className="mt-4">
          <DataTable
            columns={columns}
            rows={rows}
            onRowClick={(r) => navigate(`/accountant/payments/${r.id}`)}
          />
        </div>
      )}
    </div>
  );
}
