import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import RequireAuth from "./components/RequireAuth.jsx";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import AccountantDashboard from "./pages/AccountantDashboard.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import AnalystDashboard from "./pages/AnalystDashboard.jsx";
import BankAccountPage from "./pages/BankAccountPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import ManagerDashboard from "./pages/ManagerDashboard.jsx";
import PaymentDetailPage from "./pages/PaymentDetailPage.jsx";
import PaymentFormPage from "./pages/PaymentFormPage.jsx";
import PaymentListPage from "./pages/PaymentListPage.jsx";
import ReportListPage from "./pages/ReportListPage.jsx";
import UserListPage from "./pages/UserListPage.jsx";
import VendorListPage from "./pages/VendorListPage.jsx";

function HomeRedirect() {
  const { token, tempPass, role, hydrated } = useAuth();
  if (!hydrated) return <div className="p-6 text-sm text-neutral-600">Loading…</div>;
  if (!token || tempPass) return <Navigate to="/login" replace />;
  const map = {
    Admin: "/admin/dashboard",
    Accountant: "/accountant/dashboard",
    Manager: "/manager/payments",
    Analyst: "/analyst/dashboard",
  };
  return <Navigate to={map[role] ?? "/login"} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <div className="min-h-dvh bg-neutral-50 text-neutral-900">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<HomeRedirect />} />

          <Route
            element={
              <RequireAuth>
                <Layout />
              </RequireAuth>
            }
          >
            <Route
              path="/admin/dashboard"
              element={
                <RequireAuth roles={["Admin"]}>
                  <AdminDashboard />
                </RequireAuth>
              }
            />
            <Route
              path="/admin/users"
              element={
                <RequireAuth roles={["Admin"]}>
                  <UserListPage />
                </RequireAuth>
              }
            />
            <Route
              path="/admin/vendors"
              element={
                <RequireAuth roles={["Admin"]}>
                  <VendorListPage />
                </RequireAuth>
              }
            />
            <Route
              path="/admin/vendors/:id/banks"
              element={
                <RequireAuth roles={["Admin"]}>
                  <BankAccountPage />
                </RequireAuth>
              }
            />
            <Route
              path="/admin/reports"
              element={
                <RequireAuth roles={["Admin"]}>
                  <ReportListPage />
                </RequireAuth>
              }
            />

            <Route
              path="/accountant/dashboard"
              element={
                <RequireAuth roles={["Accountant"]}>
                  <AccountantDashboard />
                </RequireAuth>
              }
            />
            <Route
              path="/accountant/payments/new"
              element={
                <RequireAuth roles={["Accountant"]}>
                  <PaymentFormPage />
                </RequireAuth>
              }
            />
            <Route
              path="/accountant/payments"
              element={
                <RequireAuth roles={["Accountant"]}>
                  <PaymentListPage />
                </RequireAuth>
              }
            />
            <Route
              path="/accountant/payments/:id"
              element={
                <RequireAuth roles={["Accountant"]}>
                  <PaymentDetailPage />
                </RequireAuth>
              }
            />

            <Route
              path="/manager/payments"
              element={
                <RequireAuth roles={["Manager"]}>
                  <ManagerDashboard />
                </RequireAuth>
              }
            />
            <Route
              path="/manager/payments/:id"
              element={
                <RequireAuth roles={["Manager"]}>
                  <PaymentDetailPage />
                </RequireAuth>
              }
            />

            <Route
              path="/analyst/dashboard"
              element={
                <RequireAuth roles={["Analyst"]}>
                  <AnalystDashboard />
                </RequireAuth>
              }
            />
            <Route
              path="/analyst/reports"
              element={
                <RequireAuth roles={["Analyst"]}>
                  <ReportListPage />
                </RequireAuth>
              }
            />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </AuthProvider>
  );
}
