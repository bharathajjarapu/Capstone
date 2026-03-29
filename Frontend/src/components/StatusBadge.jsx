const styles = {
  PENDING: "bg-amber-100 text-amber-900",
  APPROVED: "bg-emerald-100 text-emerald-900",
  REJECTED: "bg-red-100 text-red-900",
  PROCESSING: "bg-sky-100 text-sky-900",
  READY: "bg-emerald-100 text-emerald-900",
  FAILED: "bg-red-100 text-red-900",
  Active: "bg-emerald-100 text-emerald-900",
  Inactive: "bg-neutral-200 text-neutral-700",
};

export default function StatusBadge({ status }) {
  const key = status ?? "";
  const cls = styles[key] ?? "bg-neutral-100 text-neutral-800";
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {key}
    </span>
  );
}
