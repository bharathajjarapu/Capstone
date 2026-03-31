import { useEffect, useMemo, useState } from "react";
import { getDepartments } from "../api/departmentApi.js";

export default function DepartmentPicker({ value, onChange, required }) {
  const [departments, setDepartments] = useState([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getDepartments();
        if (!cancelled) setDepartments(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setDepartments([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = useMemo(() => departments.find((d) => d.id === value), [departments, value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return departments;
    return departments.filter((d) => d.name.toLowerCase().includes(q));
  }, [departments, query]);

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-neutral-800">
        Department{required ? " *" : ""}
      </label>
      <button
        type="button"
        className="mt-1 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-left text-sm"
        onClick={() => setOpen((o) => !o)}
      >
        {selected ? selected.name : "Select department…"}
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-md border border-neutral-200 bg-white p-2 shadow">
          <input
            className="w-full rounded-md border border-neutral-200 px-2 py-1 text-sm"
            placeholder="Search…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="mt-2 max-h-48 overflow-auto">
            {filtered.map((d) => (
              <button
                key={d.id}
                type="button"
                className="block w-full rounded px-2 py-1 text-left text-sm hover:bg-neutral-50"
                onClick={() => {
                  onChange(d.id);
                  setOpen(false);
                  setQuery("");
                }}
              >
                {d.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
