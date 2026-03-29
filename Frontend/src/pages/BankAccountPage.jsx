import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  addBankAccount,
  getBankAccounts,
  getVendors,
  setDefaultAccount,
  updateBankAccount,
} from "../api/vendorApi.js";
import DataTable from "../components/DataTable.jsx";
import Modal from "../components/Modal.jsx";

const emptyAccount = {
  bankName: "",
  accountName: "",
  accountNo: "",
  routingNo: "",
  swiftCode: "",
  isDefault: false,
};

export default function BankAccountPage() {
  const { id } = useParams();
  const vendorId = Number(id);
  const [vendorName, setVendorName] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyAccount);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const vendors = await getVendors();
      const v = vendors.find((x) => x.id === vendorId);
      setVendorName(v?.name ?? "Vendor");
      const accounts = await getBankAccounts(vendorId);
      setRows(accounts);
    } catch {
      setError("Could not load bank accounts.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!Number.isFinite(vendorId)) return;
    load();
  }, [vendorId]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyAccount);
    setModalOpen(true);
  }

  function openEdit(row) {
    setEditingId(row.id);
    setForm({
      bankName: row.bankName,
      accountName: row.accountName,
      accountNo: row.accountNo,
      routingNo: row.routingNo,
      swiftCode: row.swiftCode ?? "",
      isDefault: row.isDefault,
    });
    setModalOpen(true);
  }

  async function save(e) {
    e.preventDefault();
    try {
      if (editingId) await updateBankAccount(vendorId, editingId, form);
      else await addBankAccount(vendorId, form);
      setModalOpen(false);
      await load();
    } catch {
      setError("Save failed.");
    }
  }

  async function setDefault(accountId) {
    try {
      await setDefaultAccount(vendorId, accountId);
      await load();
    } catch {
      setError("Could not set default.");
    }
  }

  const columns = [
    { key: "bankName", label: "Bank" },
    { key: "accountName", label: "Account name" },
    { key: "accountNo", label: "Account no" },
    { key: "routingNo", label: "Routing" },
    { key: "swiftCode", label: "SWIFT" },
    {
      key: "isDefault",
      label: "Default",
      render: (r) => (r.isDefault ? "Yes" : "No"),
    },
    {
      key: "actions",
      label: "",
      render: (r) => (
        <div className="flex gap-2">
          <button type="button" className="text-sky-700 hover:underline" onClick={() => openEdit(r)}>
            Edit
          </button>
          <button type="button" className="text-sky-700 hover:underline" onClick={() => setDefault(r.id)}>
            Set default
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <h1 className="text-lg font-semibold">Bank accounts</h1>
      <p className="mt-1 text-sm text-neutral-600">{vendorName}</p>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <div className="mt-4 flex justify-end">
        <button
          type="button"
          className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white"
          onClick={openCreate}
        >
          Add account
        </button>
      </div>
      {loading ? (
        <p className="mt-4 text-sm text-neutral-600">Loading…</p>
      ) : (
        <div className="mt-4">
          <DataTable columns={columns} rows={rows} />
        </div>
      )}

      <Modal title={editingId ? "Edit account" : "Add account"} open={modalOpen} onClose={() => setModalOpen(false)}>
        <form className="space-y-3" onSubmit={save}>
          <div>
            <label className="block text-sm font-medium">Bank name</label>
            <input
              className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
              value={form.bankName}
              onChange={(e) => setForm({ ...form, bankName: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Account name</label>
            <input
              className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
              value={form.accountName}
              onChange={(e) => setForm({ ...form, accountName: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Account no</label>
            <input
              className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
              value={form.accountNo}
              onChange={(e) => setForm({ ...form, accountNo: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Routing no</label>
            <input
              className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
              value={form.routingNo}
              onChange={(e) => setForm({ ...form, routingNo: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium">SWIFT (optional)</label>
            <input
              className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
              value={form.swiftCode}
              onChange={(e) => setForm({ ...form, swiftCode: e.target.value })}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
            />
            Default account
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="rounded-md px-3 py-2 text-sm" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white">
              Save
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
