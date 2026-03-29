import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { dashboardPathForRole } from "../utils/rolePaths.js";

export default function RequireAuth({ children, roles }) {
  const { token, tempPass, role, hydrated } = useAuth();
  const location = useLocation();

  if (!hydrated) {
    return <div className="p-6 text-sm text-neutral-600">Loading…</div>;
  }

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (tempPass) {
    return <Navigate to="/login" replace />;
  }

  if (roles && role && !roles.includes(role)) {
    const home = dashboardPathForRole(role);
    return <Navigate to={home === "/" ? "/login" : home} replace />;
  }

  return children;
}
