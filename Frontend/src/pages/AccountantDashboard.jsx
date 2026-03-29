import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getPayments } from "../api/paymentApi.js";

function countBy(list, status) {
  return list.filter((p) => p.status === status).length;
}

export default function AccountantDashboard() {
  const [stats, setStats] = useState({ total: "—", pending: "—", approved: "—", rejected: "—" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getPayments();
        const list = Array.isArray(data) ? data : [];
        if (!cancelled) {
          setStats({
            total: String(list.length),
            pending: String(countBy(list, "PENDING")),
            approved: String(countBy(list, "APPROVED")),
            rejected: String(countBy(list, "REJECTED")),
          });
        }
      } catch {
        if (!cancelled) setStats({ total: "?", pending: "?", approved: "?", rejected: "?" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <h1 className="text-lg font-semibold">Accountant</h1>
      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-neutral-200 bg-white p-4 text-sm">
          <div className="text-neutral-600">Total</div>
          <div className="mt-1 text-xl font-semibold">{stats.total}</div>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4 text-sm">
          <div className="text-neutral-600">Pending</div>
          <div className="mt-1 text-xl font-semibold">{stats.pending}</div>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4 text-sm">
          <div className="text-neutral-600">Approved</div>
          <div className="mt-1 text-xl font-semibold">{stats.approved}</div>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4 text-sm">
          <div className="text-neutral-600">Rejected</div>
          <div className="mt-1 text-xl font-semibold">{stats.rejected}</div>
        </div>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Link
          to="/accountant/payments/new"
          className="rounded-lg border border-neutral-200 bg-white p-4 text-sm font-medium hover:bg-neutral-50"
        >
          New payment request
        </Link>
        <Link
          to="/accountant/payments"
          className="rounded-lg border border-neutral-200 bg-white p-4 text-sm font-medium hover:bg-neutral-50"
        >
          View all requests
        </Link>
      </div>
    </div>
  );
}
