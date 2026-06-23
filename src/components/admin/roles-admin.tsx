"use client";

import { FormEvent, useState } from "react";
import {
  buttonPrimaryClass,
  buttonSecondaryClass,
  inputClass,
  saveButtonLabel,
} from "@/components/admin/ui";
import { RowActions } from "@/components/admin/row-actions";
import { useCachedFetch } from "@/hooks/use-cached-fetch";
import { useCachedList } from "@/hooks/use-cached-list";
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
  const [editing, setEditing] = useState<RoleRow | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    permissionIds: [] as string[],
  });

  const {
    items: roles,
    loading,
    error,
    submitting,
    deletingId,
    setError,
    save,
    remove,
  } = useCachedList<RoleRow>("/api/admin/roles");
  const { data: permissions = [] } = useCachedFetch<Permission[]>("/api/admin/permissions");

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
    if (submitting) return;
    setError(null);

    const payload = {
      name: form.name,
      description: form.description || undefined,
      permissionIds: form.permissionIds,
    };

    try {
      await save({
        url: editing ? `/api/admin/roles/${editing.id}` : "/api/admin/roles",
        method: editing ? "PATCH" : "POST",
        body: payload,
      });
      resetForm();
    } catch {
      // Error message is set by the cache hook.
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this role?")) return;
    setError(null);
    try {
      await remove(`/api/admin/roles/${id}`, id);
    } catch {
      // Error message is set by the cache hook.
    }
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

  if (loading && roles.length === 0) {
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
            disabled={editing?.name === "super_admin" || submitting}
          />
          <input
            className={inputClass}
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            disabled={submitting}
          />
        </div>

        <div>
          <p className="mb-2 text-sm text-slate-400">Permissions</p>
          <div className="grid max-h-48 gap-2 overflow-y-auto md:grid-cols-3">
            {permissions.map((permission) => (
              <label
                key={permission.id}
                className={`flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm ${
                  canEditCheckboxes && !submitting ? "cursor-pointer" : "cursor-not-allowed opacity-70"
                }`}
              >
                <input
                  type="checkbox"
                  checked={form.permissionIds.includes(permission.id)}
                  onChange={() => togglePermission(permission.id)}
                  disabled={!canEditCheckboxes || submitting}
                />
                {permission.name}
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          {canSubmit ? (
            <button type="submit" className={buttonPrimaryClass} disabled={submitting}>
              {saveButtonLabel({ submitting, isEdit: !!editing })}
            </button>
          ) : null}
          {editing ? (
            <button
              type="button"
              className={buttonSecondaryClass}
              onClick={resetForm}
              disabled={submitting}
            >
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
                    onDelete={() => void handleDelete(role.id)}
                    hideDelete={role.name === "super_admin"}
                    deleting={deletingId === role.id}
                    disabled={submitting}
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
