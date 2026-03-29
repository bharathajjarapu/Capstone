import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { registerSessionClearHandler } from "../api/authSession.js";

const AuthContext = createContext(undefined);

const STORAGE_KEY = "venauth";

function readStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeStored(state) {
  if (!state) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      token: state.token,
      role: state.role,
      name: state.name,
      tempPass: state.tempPass,
    })
  );
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [role, setRole] = useState(null);
  const [name, setName] = useState(null);
  const [tempPass, setTempPass] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const s = readStored();
    if (s?.token) {
      setToken(s.token);
      setRole(s.role ?? null);
      setName(s.name ?? null);
      setTempPass(!!s.tempPass);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    registerSessionClearHandler(() => {
      setToken(null);
      setRole(null);
      setName(null);
      setTempPass(false);
      writeStored(null);
      window.location.assign("/login");
    });
  }, []);

  const setAuth = useCallback((loginResponse) => {
    setToken(loginResponse.token);
    setRole(loginResponse.role);
    setName(loginResponse.name);
    setTempPass(!!loginResponse.tempPass);
    writeStored({
      token: loginResponse.token,
      role: loginResponse.role,
      name: loginResponse.name,
      tempPass: !!loginResponse.tempPass,
    });
  }, []);

  const clearAuth = useCallback(() => {
    setToken(null);
    setRole(null);
    setName(null);
    setTempPass(false);
    writeStored(null);
  }, []);

  const markPasswordChanged = useCallback((loginResponse) => {
    setToken(loginResponse.token);
    setRole(loginResponse.role);
    setName(loginResponse.name);
    setTempPass(false);
    writeStored({
      token: loginResponse.token,
      role: loginResponse.role,
      name: loginResponse.name,
      tempPass: false,
    });
  }, []);

  const value = useMemo(
    () => ({
      token,
      role,
      name,
      tempPass,
      hydrated,
      setAuth,
      clearAuth,
      markPasswordChanged,
    }),
    [token, role, name, tempPass, hydrated, setAuth, clearAuth, markPasswordChanged]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
