import { useEffect, useMemo, useState } from "react";
import {
  createUser,
  deleteUser,
  getUsers,
  resetPassword,
  updateUser,
} from "../api/userApi.js";
import DataTable from "../components/DataTable.jsx";
import DepartmentPicker from "../components/DepartmentPicker.jsx";
import Modal from "../components/Modal.jsx";
import StatusBadge from "../components/StatusBadge.jsx";

const roles = ["Admin", "Accountant", "Manager", "Analyst"];

const emptyUser = {
  fullName: "",
  username: "",
  email: "",
  role: "Accountant",
  departmentId: null,
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
  const [reveal, setReveal] = useState(null);

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
      departmentId: row.departmentId ?? null,
    });
    setModalOpen(true);
  }

  async function save(e) {
    e.preventDefault();
    if (form.role === "Manager" && form.departmentId == null) {
      setError("Select a department for Manager.");
      return;
    }
    setError("");
    try {
      if (editingId) {
        const body = {
          fullName: form.fullName,
          email: form.email,
          role: form.role,
        };
        if (form.role === "Manager") body.departmentId = form.departmentId;
        await updateUser(editingId, body);
        setModalOpen(false);
        await load();
      } else {
        const createBody = {
          fullName: form.fullName,
          username: form.username,
          email: form.email,
          role: form.role,
        };
        if (form.role === "Manager") createBody.departmentId = form.departmentId;
        const created = await createUser(createBody);
        setModalOpen(false);
        await load();
        const pw = created?.generatedTempPassword;
        if (pw) {
          setReveal({ title: "User created", password: pw });
        }
      }
    } catch {
      setError("Save failed.");
    }
  }

  async function softDelete(row) {
    if (
      !window.confirm(
        `Delete ${row.username}? The account will be deactivated; history is kept.`
      )
    )
      return;
    try {
      await deleteUser(row.id);
      await load();
    } catch {
      setError("Delete failed.");
    }
  }

  async function submitReset() {
    if (!resetId) return;
    try {
      const res = await resetPassword(resetId);
      setResetOpen(false);
      setResetId(null);
      await load();
      const pw = res?.generatedTempPassword;
      if (pw) {
        setReveal({ title: "Password reset", password: pw });
      }
    } catch {
      setError("Reset failed.");
    }
  }

  const activeRows = useMemo(() => rows.filter((r) => r.isActive), [rows]);
  const deletedRows = useMemo(() => rows.filter((r) => !r.isActive), [rows]);

  const activeColumns = [
    { key: "fullName", label: "Name" },
    { key: "username", label: "Username" },
    { key: "email", label: "Email" },
    { key: "role", label: "Role" },
    {
      key: "departmentName",
      label: "Department",
      render: (r) => r.departmentName ?? "—",
    },
    {
      key: "isActive",
      label: "Status",
      render: (r) => <StatusBadge status="Active" />,
    },
    {
      key: "actions",
      label: "",
      render: (r) => (
        <div className="flex flex-wrap gap-2">
          <button type="button" className="text-sky-700 hover:underline" onClick={() => openEdit(r)}>
            Edit
          </button>
          <button type="button" className="text-sky-700 hover:underline" onClick={() => softDelete(r)}>
            Delete
          </button>
          <button
            type="button"
            className="text-sky-700 hover:underline"
            onClick={() => {
              setResetId(r.id);
              setResetOpen(true);
            }}
          >
            Reset password
          </button>
        </div>
      ),
    },
  ];

  const deletedColumns = [
    { key: "fullName", label: "Name" },
    { key: "username", label: "Username" },
    { key: "email", label: "Email" },
    { key: "role", label: "Role" },
    {
      key: "departmentName",
      label: "Department",
      render: (r) => r.departmentName ?? "—",
    },
    {
      key: "isActive",
      label: "Status",
      render: () => <StatusBadge status="Inactive" />,
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
        <div className="mt-6 space-y-8">
          <section>
            <h2 className="text-base font-semibold text-neutral-900">Active users</h2>
            <p className="mt-1 text-sm text-neutral-600">Users who can sign in.</p>
            <div className="mt-3">
              <DataTable columns={activeColumns} rows={activeRows} />
            </div>
          </section>

          {deletedRows.length > 0 ? (
            <section className="rounded-lg border border-neutral-200 bg-neutral-50/80 p-4">
              <h2 className="text-base font-semibold text-neutral-800">Deleted users</h2>
              <p className="mt-1 text-sm text-neutral-600">
                Soft-deleted accounts (deactivated). History is kept; these users cannot sign in.
              </p>
              <div className="mt-3">
                <DataTable columns={deletedColumns} rows={deletedRows} />
              </div>
            </section>
          ) : null}
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
              onChange={(e) => {
                const role = e.target.value;
                setForm({
                  ...form,
                  role,
                  departmentId: role === "Manager" ? form.departmentId : null,
                });
              }}
            >
              {roles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          {form.role === "Manager" && (
            <DepartmentPicker
              value={form.departmentId}
              onChange={(id) => setForm({ ...form, departmentId: id })}
              required
            />
          )}
          {!editingId && (
            <p className="text-sm text-neutral-600">
              A secure temporary password will be generated automatically. Share it with the user once.
            </p>
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
          <p className="text-sm text-neutral-700">
            A new random temporary password will be generated. The user must sign in and change it.
          </p>
          <div className="flex justify-end gap-2">
            <button type="button" className="rounded-md px-3 py-2 text-sm" onClick={() => setResetOpen(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white"
              onClick={submitReset}
            >
              Generate and reset
            </button>
          </div>
        </div>
      </Modal>

      <Modal title={reveal?.title ?? "Temporary password"} open={!!reveal} onClose={() => setReveal(null)}>
        {reveal && (
          <div className="space-y-3">
            <p className="text-sm text-neutral-700">Copy this now — it will not be shown again.</p>
            <div className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 font-mono text-sm break-all">
              {reveal.password}
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(reveal.password);
                  } catch {
                    setError("Could not copy.");
                  }
                }}
              >
                Copy
              </button>
              <button type="button" className="rounded-md px-3 py-2 text-sm" onClick={() => setReveal(null)}>
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
