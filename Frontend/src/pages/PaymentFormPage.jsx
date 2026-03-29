import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPayment } from "../api/paymentApi.js";
import { getBankAccounts } from "../api/vendorApi.js";
import LineItemsTable from "../components/LineItemsTable.jsx";
import TaxPicker from "../components/TaxPicker.jsx";
import VendorPicker from "../components/VendorPicker.jsx";

export default function PaymentFormPage() {
  const navigate = useNavigate();
  const [vendorId, setVendorId] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [vendorBankAccountId, setVendorBankAccountId] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState([{ description: "", quantity: 1, unitPrice: 0.01 }]);
  const [tax, setTax] = useState({ taxTypeId: null, taxRate: 0, taxAmount: 0, customTaxRate: undefined });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const subtotal = useMemo(
    () =>
      items.reduce((sum, it) => sum + Math.round(it.quantity * it.unitPrice * 100) / 100, 0),
    [items]
  );

  const grandTotal = useMemo(() => subtotal + (tax.taxAmount ?? 0), [subtotal, tax.taxAmount]);

  async function onVendorChange(id) {
    setVendorId(id);
    setVendorBankAccountId("");
    setAccounts([]);
    if (!id) return;
    try {
      const acc = await getBankAccounts(id);
      setAccounts(acc);
      const def = acc.find((a) => a.isDefault);
      if (def) setVendorBankAccountId(String(def.id));
      else if (acc[0]) setVendorBankAccountId(String(acc[0].id));
    } catch {
      setError("Could not load bank accounts.");
    }
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (!vendorId || !vendorBankAccountId) {
      setError("Select vendor and bank account.");
      return;
    }
    if (!dueDate) {
      setError("Due date is required.");
      return;
    }
    const badLine = items.find(
      (it) =>
        !String(it.description).trim() ||
        !(Number(it.quantity) > 0) ||
        !(Number(it.unitPrice) > 0)
    );
    if (badLine) {
      setError("Each line item needs a description, quantity > 0, and unit price > 0.");
      return;
    }
    const payload = {
      vendorId,
      vendorBankAccountId: Number(vendorBankAccountId),
      invoiceNo,
      dueDate,
      notes: notes || null,
      items: items.map((it) => ({
        description: it.description,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
      })),
    };
    if (tax.taxTypeId != null) {
      payload.taxTypeId = tax.taxTypeId;
    } else {
      payload.customTaxRate = tax.customTaxRate ?? tax.taxRate;
    }
    setLoading(true);
    try {
      await createPayment(payload);
      navigate("/accountant/payments");
    } catch {
      setError("Could not create payment.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="text-lg font-semibold">New payment request</h1>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <form className="mt-4 space-y-4" onSubmit={submit}>
        <VendorPicker value={vendorId} onChange={onVendorChange} />
        <div>
          <label className="block text-sm font-medium">Bank account</label>
          <select
            className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
            value={vendorBankAccountId}
            onChange={(e) => setVendorBankAccountId(e.target.value)}
            required
          >
            <option value="">Select…</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.bankName} — {a.accountNo}
                {a.isDefault ? " (default)" : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Invoice no</label>
          <input
            className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
            value={invoiceNo}
            onChange={(e) => setInvoiceNo(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Due date</label>
          <input
            type="date"
            className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            required
          />
        </div>
        <div>
          <div className="mb-2 text-sm font-medium">Line items</div>
          <LineItemsTable items={items} onChange={setItems} />
        </div>
        <TaxPicker subtotal={subtotal} onChange={setTax} />
        <div>
          <label className="block text-sm font-medium">Notes (optional)</label>
          <textarea
            className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm">
          Grand total: <span className="text-lg font-semibold">{grandTotal.toFixed(2)}</span>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {loading ? "Submitting…" : "Submit"}
        </button>
      </form>
    </div>
  );
}
