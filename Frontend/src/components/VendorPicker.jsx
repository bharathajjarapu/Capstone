import { useEffect, useMemo, useState } from "react";
import { getVendors } from "../api/vendorApi.js";

export default function VendorPicker({ value, onChange }) {
  const [vendors, setVendors] = useState([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getVendors();
        if (!cancelled) setVendors(data);
      } catch {
        if (!cancelled) setVendors([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = useMemo(() => vendors.find((v) => v.id === value), [vendors, value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return vendors;
    return vendors.filter((v) => v.name.toLowerCase().includes(q));
  }, [vendors, query]);

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-neutral-800">Vendor</label>
      <button
        type="button"
        className="mt-1 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-left text-sm"
        onClick={() => setOpen((o) => !o)}
      >
        {selected ? selected.name : "Select vendor…"}
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
            {filtered.map((v) => (
              <button
                key={v.id}
                type="button"
                className="block w-full rounded px-2 py-1 text-left text-sm hover:bg-neutral-50"
                onClick={() => {
                  onChange(v.id);
                  setOpen(false);
                  setQuery("");
                }}
              >
                {v.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
