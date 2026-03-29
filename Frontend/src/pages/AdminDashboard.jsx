import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getReports } from "../api/reportApi.js";
import { getUsers } from "../api/userApi.js";
import { getVendors } from "../api/vendorApi.js";

export default function AdminDashboard() {
  const [counts, setCounts] = useState({ users: "—", vendors: "—", reports: "—" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [users, vendors, reports] = await Promise.all([getUsers(), getVendors(), getReports()]);
        if (!cancelled) {
          setCounts({
            users: String(users?.length ?? 0),
            vendors: String(vendors?.length ?? 0),
            reports: String(reports?.length ?? 0),
          });
        }
      } catch {
        if (!cancelled) setCounts({ users: "?", vendors: "?", reports: "?" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <h1 className="text-lg font-semibold">Admin</h1>
      <p className="mt-1 text-sm text-neutral-600">Quick links</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-neutral-200 bg-white p-4 text-sm">
          <div className="text-neutral-600">Users</div>
          <div className="mt-1 text-2xl font-semibold">{counts.users}</div>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4 text-sm">
          <div className="text-neutral-600">Active vendors</div>
          <div className="mt-1 text-2xl font-semibold">{counts.vendors}</div>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4 text-sm">
          <div className="text-neutral-600">Reports</div>
          <div className="mt-1 text-2xl font-semibold">{counts.reports}</div>
        </div>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Link
          to="/admin/users"
          className="rounded-lg border border-neutral-200 bg-white p-4 text-sm font-medium hover:bg-neutral-50"
        >
          User management
        </Link>
        <Link
          to="/admin/vendors"
          className="rounded-lg border border-neutral-200 bg-white p-4 text-sm font-medium hover:bg-neutral-50"
        >
          Vendor management
        </Link>
        <Link
          to="/admin/reports"
          className="rounded-lg border border-neutral-200 bg-white p-4 text-sm font-medium hover:bg-neutral-50"
        >
          Reports
        </Link>
      </div>
    </div>
  );
}
