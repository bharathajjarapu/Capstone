import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { changePassword, login } from "../api/authApi.js";
import { useAuth } from "../context/AuthContext.jsx";
import { dashboardPathForRole } from "../utils/rolePaths.js";

export default function LoginPage() {
  const navigate = useNavigate();
  const { token, tempPass, role, setAuth, markPasswordChanged, hydrated } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNew, setConfirmNew] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    if (token && !tempPass && role) {
      navigate(dashboardPathForRole(role), { replace: true });
    }
  }, [hydrated, token, tempPass, role, navigate]);

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await login(username, password);
      setAuth(data);
      if (!data.tempPass) {
        navigate(dashboardPathForRole(data.role), { replace: true });
      }
    } catch {
      setError("Invalid username or password.");
    } finally {
      setLoading(false);
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setError("");
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmNew) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const data = await changePassword(newPassword);
      markPasswordChanged(data);
      navigate(dashboardPathForRole(data.role), { replace: true });
    } catch {
      setError("Could not change password.");
    } finally {
      setLoading(false);
    }
  }

  const showStep2 = token && tempPass;

  return (
    <div className="min-h-dvh bg-neutral-50 px-4 py-10">
      <div className="mx-auto w-full max-w-md rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">VenDot</h1>
        <p className="mt-1 text-sm text-neutral-600">Sign in to continue</p>

        {!showStep2 && (
          <form className="mt-6 space-y-4" onSubmit={handleLogin}>
            <div>
              <label className="block text-sm font-medium text-neutral-800">Username</label>
              <input
                className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-800">Password</label>
              <input
                type="password"
                className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        )}

        {showStep2 && (
          <form className="mt-6 space-y-4" onSubmit={handleChangePassword}>
            <p className="text-sm text-neutral-700">You must set a new password before continuing.</p>
            <div>
              <label className="block text-sm font-medium text-neutral-800">New password</label>
              <input
                type="password"
                className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-800">Confirm password</label>
              <input
                type="password"
                className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
                value={confirmNew}
                onChange={(e) => setConfirmNew(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60"
            >
              {loading ? "Saving…" : "Save password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
