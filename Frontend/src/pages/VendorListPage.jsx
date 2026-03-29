import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  createVendor,
  deactivateVendor,
  getVendors,
  updateVendor,
} from "../api/vendorApi.js";
import DataTable from "../components/DataTable.jsx";
import Modal from "../components/Modal.jsx";
import StatusBadge from "../components/StatusBadge.jsx";

const emptyForm = {
  name: "",
  contactName: "",
  email: "",
  phone: "",
  address: "",
};

export default function VendorListPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await getVendors();
      setRows(data);
    } catch {
      setError("Could not load vendors.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(row) {
    setEditingId(row.id);
    setForm({
      name: row.name,
      contactName: row.contactName,
      email: row.email,
      phone: row.phone,
      address: row.address,
    });
    setModalOpen(true);
  }

  async function save(e) {
    e.preventDefault();
    setError("");
    try {
      if (editingId) await updateVendor(editingId, form);
      else await createVendor(form);
      setModalOpen(false);
      await load();
    } catch {
      setError("Save failed.");
    }
  }

  async function deactivate(row) {
    if (!window.confirm(`Deactivate vendor "${row.name}"?`)) return;
    try {
      await deactivateVendor(row.id);
      await load();
    } catch {
      setError("Deactivate failed.");
    }
  }

  const columns = [
    { key: "name", label: "Name" },
    { key: "contactName", label: "Contact" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    {
      key: "isActive",
      label: "Status",
      render: (r) => <StatusBadge status={r.isActive ? "Active" : "Inactive"} />,
    },
    {
      key: "actions",
      label: "",
      render: (r) => (
        <div className="flex gap-2">
          <button
            type="button"
            className="text-sky-700 hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              openEdit(r);
            }}
          >
            Edit
          </button>
          <button
            type="button"
            className="text-sky-700 hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/admin/vendors/${r.id}/banks`);
            }}
          >
            Banks
          </button>
          <button
            type="button"
            className="text-red-700 hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              deactivate(r);
            }}
          >
            Deactivate
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">Vendors</h1>
        <button
          type="button"
          className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          onClick={openCreate}
        >
          Add vendor
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {loading ? (
        <p className="mt-4 text-sm text-neutral-600">Loading…</p>
      ) : (
        <div className="mt-4">
          <DataTable columns={columns} rows={rows} />
        </div>
      )}

      <Modal title={editingId ? "Edit vendor" : "Add vendor"} open={modalOpen} onClose={() => setModalOpen(false)}>
        <form className="space-y-3" onSubmit={save}>
          <div>
            <label className="block text-sm font-medium">Name</label>
            <input
              className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Contact name</label>
            <input
              className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
              value={form.contactName}
              onChange={(e) => setForm({ ...form, contactName: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Email</label>
            <input
              className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Phone</label>
            <input
              className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Address</label>
            <textarea
              className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
              rows={3}
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              required
            />
          </div>
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
