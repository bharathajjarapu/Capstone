import { Link, Outlet, useNavigate } from "react-router-dom";
import AdminReportNotifier from "./AdminReportNotifier.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const navByRole = {
  Admin: [
    { to: "/admin/dashboard", label: "Dashboard" },
    { to: "/admin/users", label: "Users" },
    { to: "/admin/vendors", label: "Vendors" },
    { to: "/admin/reports", label: "Reports" },
  ],
  Accountant: [
    { to: "/accountant/dashboard", label: "Dashboard" },
    { to: "/accountant/payments/new", label: "New Payment" },
    { to: "/accountant/payments", label: "Payments" },
  ],
  Manager: [{ to: "/manager/payments", label: "Payments" }],
  Analyst: [{ to: "/analyst/dashboard", label: "Dashboard" }],
};

export default function Layout() {
  const { name, role, clearAuth } = useAuth();
  const navigate = useNavigate();

  const links = navByRole[role] ?? [];

  return (
    <div className="min-h-dvh bg-neutral-50 text-neutral-900">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-baseline gap-3">
            <Link to="/" className="text-lg font-semibold tracking-tight">
              Ven<span className="text-neutral-400">.</span>Dot
            </Link>
            <span className="text-sm text-neutral-600">{name}</span>
          </div>
          <button
            type="button"
            className="rounded-md border border-neutral-200 px-3 py-1.5 text-sm hover:bg-neutral-50"
            onClick={() => {
              clearAuth();
              navigate("/login");
            }}
          >
            Log out
          </button>
        </div>
      </header>
      <div className="mx-auto flex max-w-6xl gap-6 px-4 py-6">
        <aside className="w-56 shrink-0">
          <nav className="space-y-1">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="block rounded-md px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-100"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="min-w-0 flex-1">
          {role === "Admin" ? <AdminReportNotifier /> : null}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
