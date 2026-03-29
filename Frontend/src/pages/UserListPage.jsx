import { useEffect, useState } from "react";
import {
  createUser,
  deactivateUser,
  getUsers,
  resetPassword,
  updateUser,
} from "../api/userApi.js";
import DataTable from "../components/DataTable.jsx";
import Modal from "../components/Modal.jsx";
import StatusBadge from "../components/StatusBadge.jsx";

const roles = ["Admin", "Accountant", "Manager", "Analyst"];

const emptyUser = {
  fullName: "",
  username: "",
  email: "",
  role: "Accountant",
  tempPassword: "",
};

export default function UserListPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyUser);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetId, setResetId] = useState(null);
  const [resetPass, setResetPass] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await getUsers();
      setRows(data);
    } catch {
      setError("Could not load users.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditingId(null);
    setForm(emptyUser);
    setModalOpen(true);
  }

  function openEdit(row) {
    setEditingId(row.id);
    setForm({
      fullName: row.fullName,
      username: row.username,
      email: row.email,
      role: row.role,
      tempPassword: "",
    });
    setModalOpen(true);
  }

  async function save(e) {
    e.preventDefault();
    try {
      if (editingId) {
        await updateUser(editingId, {
          fullName: form.fullName,
          email: form.email,
          role: form.role,
        });
      } else {
        await createUser({
          fullName: form.fullName,
          username: form.username,
          email: form.email,
          role: form.role,
          tempPassword: form.tempPassword,
        });
      }
      setModalOpen(false);
      await load();
    } catch {
      setError("Save failed.");
    }
  }

  async function deactivate(row) {
    if (!window.confirm(`Deactivate ${row.username}?`)) return;
    try {
      await deactivateUser(row.id);
      await load();
    } catch {
      setError("Deactivate failed.");
    }
  }

  async function submitReset() {
    if (!resetId) return;
    try {
      await resetPassword(resetId, resetPass);
      setResetOpen(false);
      setResetPass("");
      await load();
    } catch {
      setError("Reset failed.");
    }
  }

  const columns = [
    { key: "fullName", label: "Name" },
    { key: "username", label: "Username" },
    { key: "email", label: "Email" },
    { key: "role", label: "Role" },
    {
      key: "isActive",
      label: "Status",
      render: (r) => <StatusBadge status={r.isActive ? "Active" : "Inactive"} />,
    },
    {
      key: "actions",
      label: "",
      render: (r) => (
        <div className="flex flex-wrap gap-2">
          <button type="button" className="text-sky-700 hover:underline" onClick={() => openEdit(r)}>
            Edit
          </button>
          <button type="button" className="text-sky-700 hover:underline" onClick={() => deactivate(r)}>
            Deactivate
          </button>
          <button
            type="button"
            className="text-sky-700 hover:underline"
            onClick={() => {
              setResetId(r.id);
              setResetPass("");
              setResetOpen(true);
            }}
          >
            Reset password
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">Users</h1>
        <button
          type="button"
          className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white"
          onClick={openCreate}
        >
          Add user
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

      <Modal title={editingId ? "Edit user" : "Add user"} open={modalOpen} onClose={() => setModalOpen(false)}>
        <form className="space-y-3" onSubmit={save}>
          <div>
            <label className="block text-sm font-medium">Full name</label>
            <input
              className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              required
            />
          </div>
          {!editingId && (
            <div>
              <label className="block text-sm font-medium">Username</label>
              <input
                className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                required
              />
            </div>
          )}
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
            <label className="block text-sm font-medium">Role</label>
            <select
              className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              {roles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          {!editingId && (
            <div>
              <label className="block text-sm font-medium">Temp password</label>
              <input
                type="password"
                className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
                value={form.tempPassword}
                onChange={(e) => setForm({ ...form, tempPassword: e.target.value })}
                required
              />
            </div>
          )}
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

      <Modal title="Reset password" open={resetOpen} onClose={() => setResetOpen(false)}>
        <div className="space-y-3">
          <input
            type="password"
            className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
            placeholder="New temp password"
            value={resetPass}
            onChange={(e) => setResetPass(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <button type="button" className="rounded-md px-3 py-2 text-sm" onClick={() => setResetOpen(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white"
              onClick={submitReset}
            >
              Reset
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
