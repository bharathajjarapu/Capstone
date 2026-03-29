import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { approvePayment, getPaymentById, rejectPayment } from "../api/paymentApi.js";
import { useAuth } from "../context/AuthContext.jsx";
import StatusBadge from "../components/StatusBadge.jsx";

export default function PaymentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { role } = useAuth();
  const [payment, setPayment] = useState(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const isManager = role === "Manager";

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await getPaymentById(Number(id));
      setPayment(data);
    } catch {
      setError("Could not load payment.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  async function approve() {
    try {
      await approvePayment(Number(id), note);
      navigate(isManager ? "/manager/payments" : "/accountant/payments");
    } catch {
      setError("Approve failed.");
    }
  }

  async function reject() {
    try {
      await rejectPayment(Number(id), note);
      navigate(isManager ? "/manager/payments" : "/accountant/payments");
    } catch {
      setError("Reject failed.");
    }
  }

  if (loading) return <p className="text-sm text-neutral-600">Loading…</p>;
  if (!payment) return <p className="text-sm text-red-600">{error || "Not found."}</p>;

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">Payment #{payment.id}</h1>
          <p className="mt-1 text-sm text-neutral-600">Invoice {payment.invoiceNo}</p>
        </div>
        <StatusBadge status={payment.status} />
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-neutral-200 bg-white p-4 text-sm">
          <div className="font-medium">Vendor</div>
          <div className="mt-1">{payment.vendor?.name}</div>
          <div className="text-neutral-600">{payment.vendor?.email}</div>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4 text-sm">
          <div className="font-medium">Bank snapshot</div>
          <div className="mt-1">{payment.snapshotBankName}</div>
          <div>{payment.snapshotAccountName}</div>
          <div>{payment.snapshotAccountNo}</div>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-50">
            <tr>
              <th className="px-3 py-2 text-left">Description</th>
              <th className="px-3 py-2 text-left">Qty</th>
              <th className="px-3 py-2 text-left">Unit</th>
              <th className="px-3 py-2 text-left">Line</th>
            </tr>
          </thead>
          <tbody>
            {payment.items?.map((it) => (
              <tr key={it.id} className="border-t border-neutral-100">
                <td className="px-3 py-2">{it.description}</td>
                <td className="px-3 py-2">{it.quantity}</td>
                <td className="px-3 py-2">{Number(it.unitPrice).toFixed(2)}</td>
                <td className="px-3 py-2">{Number(it.lineTotal).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 space-y-1 text-sm">
        <div>Subtotal: {Number(payment.subTotal).toFixed(2)}</div>
        <div>
          Tax ({payment.taxType?.name ?? "Custom"} · {(Number(payment.taxRate) * 100).toFixed(2)}%):{" "}
          {Number(payment.taxAmount).toFixed(2)}
        </div>
        <div className="text-base font-semibold">Total: {Number(payment.totalAmount).toFixed(2)}</div>
        {payment.notes && <div className="pt-2 text-neutral-700">Notes: {payment.notes}</div>}
        {payment.reviewNote && <div className="pt-2 text-neutral-700">Manager note: {payment.reviewNote}</div>}
      </div>

      {isManager && payment.status === "PENDING" && (
        <div className="mt-6 space-y-3 rounded-lg border border-neutral-200 bg-white p-4">
          <label className="block text-sm font-medium">Review note (optional)</label>
          <textarea
            className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white"
              onClick={approve}
            >
              Approve
            </button>
            <button
              type="button"
              className="rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white"
              onClick={reject}
            >
              Reject
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
