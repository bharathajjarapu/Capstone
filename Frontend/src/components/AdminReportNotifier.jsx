import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getReports } from "../api/reportApi.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";

/** Polls for new reports so Admin sees an in-app toast when an analyst queues a report (no extra packages). */
export default function AdminReportNotifier() {
  const { role } = useAuth();
  const { pushToast } = useToast();
  const navigate = useNavigate();
  const initialized = useRef(false);
  const seenIds = useRef(new Set());

  useEffect(() => {
    if (role !== "Admin") return;
    let cancelled = false;
    const tick = async () => {
      try {
        const list = await getReports();
        if (cancelled || !Array.isArray(list)) return;
        if (!initialized.current) {
          list.forEach((r) => seenIds.current.add(r.id));
          initialized.current = true;
          return;
        }
        for (const r of list) {
          if (seenIds.current.has(r.id)) continue;
          seenIds.current.add(r.id);
          const title = r.name?.trim() ? r.name : "Untitled report";
          pushToast({
            title: "New report",
            message: `${title} · ${r.reportType}`,
            variant: "info",
            actions: [{ label: "Open reports", onClick: () => navigate("/admin/reports") }],
          });
        }
      } catch {
        // ignore
      }
    };
    tick();
    const id = setInterval(tick, 12000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [role, navigate, pushToast]);

  return null;
}
