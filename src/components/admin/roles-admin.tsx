"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  buttonPrimaryClass,
  buttonSecondaryClass,
  inputClass,
} from "@/components/admin/ui";
import { RowActions } from "@/components/admin/row-actions";
import type { ResourceGrants } from "@/lib/permissions/grants";

type Permission = {
  id: string;
  resource: string;
  action: string;
  name: string;
};

type RoleRow = {
  id: string;
  name: string;
  description: string | null;
  rolePermissions: { permission: Permission }[];
  _count: { userRoles: number };
};

export function RolesAdmin({ grants }: { grants: ResourceGrants }) {
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<RoleRow | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    permissionIds: [] as string[],
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rolesRes, permsRes] = await Promise.all([
        fetch("/api/admin/roles"),
        fetch("/api/admin/permissions"),
      ]);
      if (!rolesRes.ok) throw new Error((await rolesRes.json()).error);
      if (!permsRes.ok) throw new Error((await permsRes.json()).error);
      setRoles(await rolesRes.json());
      setPermissions(await permsRes.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load roles");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function resetForm() {
    setEditing(null);
    setForm({ name: "", description: "", permissionIds: [] });
  }

  function startEdit(role: RoleRow) {
    if (!grants.canUpdate) return;
    setEditing(role);
    setForm({
      name: role.name,
      description: role.description ?? "",
      permissionIds: role.rolePermissions.map((rp) => rp.permission.id),
    });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const payload = {
      name: form.name,
      description: form.description || undefined,
      permissionIds: form.permissionIds,
    };

    const response = await fetch(
      editing ? `/api/admin/roles/${editing.id}` : "/api/admin/roles",
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
    if (!confirm("Delete this role?")) return;
    const response = await fetch(`/api/admin/roles/${id}`, { method: "DELETE" });
    if (!response.ok) {
      const data = await response.json();
      setError(data.error ?? "Delete failed");
      return;
    }
    await load();
  }

  function togglePermission(permissionId: string) {
    setForm((current) => ({
      ...current,
      permissionIds: current.permissionIds.includes(permissionId)
        ? current.permissionIds.filter((id) => id !== permissionId)
        : [...current.permissionIds, permissionId],
    }));
  }

  const showForm = grants.canCreate || (editing !== null && grants.canUpdate);
  const canSubmit = editing ? grants.canUpdate : grants.canCreate;
  const canEditCheckboxes = editing ? grants.canUpdate : grants.canCreate;

  if (loading) {
    return <p className="text-slate-400">Loading roles...</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold">Roles</h1>
        <p className="mt-2 text-slate-400">
          Create roles and assign permissions to each role.
        </p>
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
        <h2 className="text-lg font-medium">{editing ? "Edit Role" : "Create Role"}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <input
            className={inputClass}
            placeholder="Role name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            disabled={editing?.name === "super_admin"}
          />
          <input
            className={inputClass}
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>

        <div>
          <p className="mb-2 text-sm text-slate-400">Permissions</p>
          <div className="grid max-h-48 gap-2 overflow-y-auto md:grid-cols-3">
            {permissions.map((permission) => (
              <label
                key={permission.id}
                className={`flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm ${
                  canEditCheckboxes ? "cursor-pointer" : "cursor-not-allowed opacity-70"
                }`}
              >
                <input
                  type="checkbox"
                  checked={form.permissionIds.includes(permission.id)}
                  onChange={() => togglePermission(permission.id)}
                  disabled={!canEditCheckboxes}
                />
                {permission.name}
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
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Permissions</th>
              <th className="px-4 py-3">Users</th>
              {grants.canUpdate || grants.canDelete ? (
                <th className="px-4 py-3">Actions</th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {roles.map((role) => (
              <tr key={role.id} className="border-t border-slate-800">
                <td className="px-4 py-3 font-medium">{role.name}</td>
                <td className="px-4 py-3">{role.description ?? "—"}</td>
                <td className="px-4 py-3 max-w-md">
                  <span className="line-clamp-2 text-slate-400">
                    {role.rolePermissions.map((rp) => rp.permission.name).join(", ") ||
                      "—"}
                  </span>
                </td>
                <td className="px-4 py-3">{role._count.userRoles}</td>
                {grants.canUpdate || grants.canDelete ? (
                <td className="px-4 py-3">
                  <RowActions
                    canUpdate={grants.canUpdate}
                    canDelete={grants.canDelete}
                    onEdit={() => startEdit(role)}
                    onDelete={() => handleDelete(role.id)}
                    hideDelete={role.name === "super_admin"}
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
