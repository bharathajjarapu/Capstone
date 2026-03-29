import { useMemo } from "react";

function lineTotal(item) {
  return Math.round(item.quantity * item.unitPrice * 100) / 100;
}

export default function LineItemsTable({ items, onChange }) {
  const subtotal = useMemo(
    () => items.reduce((sum, it) => sum + lineTotal(it), 0),
    [items]
  );

  function updateRow(index, patch) {
    const next = items.map((it, i) => (i === index ? { ...it, ...patch } : it));
    onChange(next);
  }

  function addRow() {
    onChange([...items, { description: "", quantity: 1, unitPrice: 0.01 }]);
  }

  function removeRow(index) {
    onChange(items.filter((_, i) => i !== index));
  }

  return (
    <div>
      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-50">
            <tr>
              <th className="px-3 py-2 text-left">Description</th>
              <th className="px-3 py-2 text-left">Qty</th>
              <th className="px-3 py-2 text-left">Unit price</th>
              <th className="px-3 py-2 text-left">Line total</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => (
              <tr key={idx} className="border-t border-neutral-100">
                <td className="px-3 py-2">
                  <input
                    className="w-full rounded border border-neutral-200 px-2 py-1"
                    value={it.description}
                    onChange={(e) => updateRow(idx, { description: e.target.value })}
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    className="w-28 rounded border border-neutral-200 px-2 py-1"
                    value={it.quantity}
                    onChange={(e) => updateRow(idx, { quantity: Number(e.target.value) })}
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    className="w-32 rounded border border-neutral-200 px-2 py-1"
                    value={it.unitPrice}
                    onChange={(e) => updateRow(idx, { unitPrice: Number(e.target.value) })}
                  />
                </td>
                <td className="px-3 py-2">{lineTotal(it).toFixed(2)}</td>
                <td className="px-3 py-2 text-right">
                  <button type="button" className="text-red-700" onClick={() => removeRow(idx)}>
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <button type="button" className="text-sm text-sky-700 hover:underline" onClick={addRow}>
          Add row
        </button>
        <div className="text-sm font-medium">Subtotal: {subtotal.toFixed(2)}</div>
      </div>
    </div>
  );
}
