"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  buttonPrimaryClass,
  buttonSecondaryClass,
  inputClass,
} from "@/components/admin/ui";
import { RowActions } from "@/components/admin/row-actions";
import type { ResourceGrants } from "@/lib/permissions/grants";

type Role = { id: string; name: string };
type UserRow = {
  id: string;
  username: string;
  email: string;
  accountStatus: string;
  userRoles: { role: Role }[];
};

export function UsersAdmin({ grants }: { grants: ResourceGrants }) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    roleIds: [] as string[],
    accountStatus: "ACTIVE",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersRes, rolesRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/admin/roles"),
      ]);
      if (!usersRes.ok) throw new Error((await usersRes.json()).error);
      if (!rolesRes.ok) throw new Error((await rolesRes.json()).error);
      setUsers(await usersRes.json());
      setRoles(await rolesRes.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function resetForm() {
    setEditing(null);
    setForm({
      username: "",
      email: "",
      password: "",
      roleIds: [],
      accountStatus: "ACTIVE",
    });
  }

  function startEdit(user: UserRow) {
    if (!grants.canUpdate) return;
    setEditing(user);
    setForm({
      username: user.username,
      email: user.email,
      password: "",
      roleIds: user.userRoles.map((ur) => ur.role.id),
      accountStatus: user.accountStatus,
    });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const username = form.username.trim();
    const email = form.email.trim();

    if (username.length < 2) {
      setError("Username must be at least 2 characters");
      return;
    }

    if (!editing && form.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (editing && form.password && form.password.length < 8) {
      setError("New password must be at least 8 characters");
      return;
    }

    const payload = editing
      ? {
          username,
          email,
          accountStatus: form.accountStatus,
          roleIds: form.roleIds,
          ...(form.password ? { password: form.password } : {}),
        }
      : {
          username,
          email,
          password: form.password,
          roleIds: form.roleIds,
        };

    const response = await fetch(
      editing ? `/api/admin/users/${editing.id}` : "/api/admin/users",
      {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    if (!response.ok) {
      const data = await response.json();
      setError(data.error ?? "Save failed");
      return;
    }

    resetForm();
    await load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this user?")) return;
    const response = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    if (!response.ok) {
      const data = await response.json();
      setError(data.error ?? "Delete failed");
      return;
    }
    await load();
  }

  function toggleRole(roleId: string) {
    setForm((current) => ({
      ...current,
      roleIds: current.roleIds.includes(roleId)
        ? current.roleIds.filter((id) => id !== roleId)
        : [...current.roleIds, roleId],
    }));
  }

  const showForm = grants.canCreate || (editing !== null && grants.canUpdate);
  const canSubmit = editing ? grants.canUpdate : grants.canCreate;
  const canEditRoles = editing ? grants.canUpdate : grants.canCreate;

  if (loading) {
    return <p className="text-slate-400">Loading users...</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold">Users</h1>
        <p className="mt-2 text-slate-400">Create, update, and delete user accounts.</p>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      {showForm ? (
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4"
      >
        <h2 className="text-lg font-medium">{editing ? "Edit User" : "Create User"}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <input
            className={inputClass}
            placeholder="Username"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            required
          />
          <input
            className={inputClass}
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <input
            className={inputClass}
            type="password"
            placeholder={editing ? "New password (optional, min 8 chars)" : "Password (min 8 characters)"}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required={!editing}
            minLength={editing ? undefined : 8}
          />
          {editing ? (
            <select
              className={inputClass}
              value={form.accountStatus}
              onChange={(e) => setForm({ ...form, accountStatus: e.target.value })}
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="LOCKED">LOCKED</option>
              <option value="DISABLED">DISABLED</option>
              <option value="EXPIRED">EXPIRED</option>
            </select>
          ) : null}
        </div>

        <div>
          <p className="mb-2 text-sm text-slate-400">Roles</p>
          <div className="flex flex-wrap gap-2">
            {roles.map((role) => (
              <label
                key={role.id}
                className={`flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm ${
                  canEditRoles ? "cursor-pointer" : "cursor-not-allowed opacity-70"
                }`}
              >
                <input
                  type="checkbox"
                  checked={form.roleIds.includes(role.id)}
                  onChange={() => toggleRole(role.id)}
                  disabled={!canEditRoles}
                />
                {role.name}
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          {canSubmit ? (
            <button type="submit" className={buttonPrimaryClass}>
              {editing ? "Update" : "Create"}
            </button>
          ) : null}
          {editing ? (
            <button type="button" className={buttonSecondaryClass} onClick={resetForm}>
              Cancel
            </button>
          ) : null}
        </div>
      </form>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-slate-800">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-900 text-slate-400">
            <tr>
              <th className="px-4 py-3">Username</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Roles</th>
              {grants.canUpdate || grants.canDelete ? (
                <th className="px-4 py-3">Actions</th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t border-slate-800">
                <td className="px-4 py-3">{user.username}</td>
                <td className="px-4 py-3">{user.email}</td>
                <td className="px-4 py-3">{user.accountStatus}</td>
                <td className="px-4 py-3">
                  {user.userRoles.map((ur) => ur.role.name).join(", ") || "—"}
                </td>
                {grants.canUpdate || grants.canDelete ? (
                <td className="px-4 py-3">
                  <RowActions
                    canUpdate={grants.canUpdate}
                    canDelete={grants.canDelete}
                    onEdit={() => startEdit(user)}
                    onDelete={() => handleDelete(user.id)}
                  />
                </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
