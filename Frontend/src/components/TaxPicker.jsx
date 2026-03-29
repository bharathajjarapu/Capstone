import { useEffect, useMemo, useRef, useState } from "react";
import { getTaxTypes } from "../api/taxApi.js";

export default function TaxPicker({ subtotal, onChange }) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const [taxTypes, setTaxTypes] = useState([]);
  const [mode, setMode] = useState("preset");
  const [taxTypeId, setTaxTypeId] = useState(null);
  const [customRate, setCustomRate] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getTaxTypes();
        if (!cancelled) {
          setTaxTypes(data);
          const none = data.find((t) => t.name === "None");
          if (none) setTaxTypeId(none.id);
        }
      } catch {
        if (!cancelled) setTaxTypes([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedRate = useMemo(() => {
    if (mode === "custom") return customRate / 100;
    const t = taxTypes.find((x) => x.id === taxTypeId);
    return t ? t.rate : 0;
  }, [mode, taxTypeId, taxTypes, customRate]);

  const taxAmount = useMemo(() => Math.round(subtotal * selectedRate * 100) / 100, [subtotal, selectedRate]);

  useEffect(() => {
    onChangeRef.current({
      taxTypeId: mode === "custom" ? null : taxTypeId,
      taxRate: selectedRate,
      taxAmount,
      customTaxRate: mode === "custom" ? selectedRate : undefined,
    });
  }, [mode, taxTypeId, selectedRate, taxAmount, subtotal]);

  return (
    <div className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4">
      <div className="text-sm font-medium">Tax</div>
      <div className="flex gap-3 text-sm">
        <label className="flex items-center gap-2">
          <input type="radio" checked={mode === "preset"} onChange={() => setMode("preset")} />
          Preset
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" checked={mode === "custom"} onChange={() => setMode("custom")} />
          Custom %
        </label>
      </div>
      {mode === "preset" ? (
        <select
          className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
          value={taxTypeId ?? ""}
          onChange={(e) => setTaxTypeId(Number(e.target.value))}
        >
          {taxTypes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} ({(t.rate * 100).toFixed(2)}%)
            </option>
          ))}
        </select>
      ) : (
        <div>
          <label className="block text-sm text-neutral-700">Custom rate (%)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
            value={customRate}
            onChange={(e) => setCustomRate(Number(e.target.value))}
          />
        </div>
      )}
      <div className="text-sm">
        Tax amount: <span className="font-medium">{taxAmount.toFixed(2)}</span>
      </div>
    </div>
  );
}
