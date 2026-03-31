import { createContext, useCallback, useContext, useState } from "react";

const ToastContext = createContext(null);

let idSeq = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const pushToast = useCallback(
    (opts) => {
      const id = ++idSeq;
      const duration = opts.duration ?? 6500;
      const toast = {
        id,
        title: opts.title,
        message: opts.message,
        variant: opts.variant ?? "info",
        actions: opts.actions,
      };
      setToasts((t) => [...t, toast]);
      if (duration > 0) {
        setTimeout(() => dismiss(id), duration);
      }
      return id;
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ pushToast, dismiss }}>
      {children}
      <div
        className="pointer-events-none fixed right-4 top-[4.5rem] z-[200] flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2"
        aria-live="polite"
      >
        {toasts.map((t) => {
          const border =
            t.variant === "success"
              ? "border-emerald-200"
              : t.variant === "error"
                ? "border-red-200"
                : "border-neutral-200";
          return (
            <div
              key={t.id}
              className={`pointer-events-auto rounded-lg border ${border} bg-white p-3 shadow-md`}
            >
              <div className="flex justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-neutral-900">{t.title}</p>
                  {t.message ? <p className="mt-0.5 text-xs text-neutral-600">{t.message}</p> : null}
                </div>
                <button
                  type="button"
                  className="shrink-0 rounded px-1.5 text-xs text-neutral-500 hover:bg-neutral-100"
                  onClick={() => dismiss(t.id)}
                  aria-label="Dismiss"
                >
                  ×
                </button>
              </div>
              {t.actions?.length ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {t.actions.map((a, i) => (
                    <button
                      key={i}
                      type="button"
                      className="rounded-md bg-neutral-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-neutral-800"
                      onClick={() => {
                        a.onClick();
                        dismiss(t.id);
                      }}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
