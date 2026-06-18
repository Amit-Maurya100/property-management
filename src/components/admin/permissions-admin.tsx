"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { SearchableSelect } from "@/components/admin/searchable-select";
import {
  buttonPrimaryClass,
  buttonSecondaryClass,
  inputClass,
} from "@/components/admin/ui";
import { RowActions } from "@/components/admin/row-actions";
import type { ResourceGrants } from "@/lib/permissions/grants";

type CatalogOption = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
};

type PermissionRow = {
  id: string;
  resourceId: string;
  actionId: string;
  resource: string;
  action: string;
  name: string;
  description: string | null;
  _count: { rolePermissions: number; policies: number };
};

export function PermissionsAdmin({
  grants,
  canViewResources,
  canViewActions,
}: {
  grants: ResourceGrants;
  canViewResources: boolean;
  canViewActions: boolean;
}) {
  const [permissions, setPermissions] = useState<PermissionRow[]>([]);
  const [resources, setResources] = useState<CatalogOption[]>([]);
  const [actions, setActions] = useState<CatalogOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<PermissionRow | null>(null);
  const [form, setForm] = useState({
    resourceId: "",
    actionId: "",
    description: "",
  });

  const needsCatalogs = grants.canCreate || grants.canUpdate;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const permissionsRes = await fetch("/api/admin/permissions");
      if (!permissionsRes.ok) throw new Error((await permissionsRes.json()).error);
      setPermissions(await permissionsRes.json());

      if (needsCatalogs) {
        const [resourcesRes, actionsRes] = await Promise.all([
          fetch("/api/admin/resources?active=true"),
          fetch("/api/admin/actions?active=true"),
        ]);
        if (!resourcesRes.ok) throw new Error((await resourcesRes.json()).error);
        if (!actionsRes.ok) throw new Error((await actionsRes.json()).error);
        setResources(await resourcesRes.json());
        setActions(await actionsRes.json());
      } else {
        setResources([]);
        setActions([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load permissions");
    } finally {
      setLoading(false);
    }
  }, [needsCatalogs]);

  useEffect(() => {
    load();
  }, [load]);

  function resetForm() {
    setEditing(null);
    setForm({ resourceId: "", actionId: "", description: "" });
  }

  function startEdit(permission: PermissionRow) {
    if (!grants.canUpdate) return;
    setEditing(permission);
    setForm({
      resourceId: permission.resourceId,
      actionId: permission.actionId,
      description: permission.description ?? "",
    });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!form.resourceId || !form.actionId) {
      setError("Select both a resource and an action");
      return;
    }

    const payload = {
      resourceId: form.resourceId,
      actionId: form.actionId,
      description: form.description || undefined,
    };

    const response = await fetch(
      editing ? `/api/admin/permissions/${editing.id}` : "/api/admin/permissions",
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
    if (!confirm("Delete this permission?")) return;
    const response = await fetch(`/api/admin/permissions/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      const data = await response.json();
      setError(data.error ?? "Delete failed");
      return;
    }
    await load();
  }

  const resourceOptions = resources.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
  }));

  const actionOptions = actions.map((a) => ({
    id: a.id,
    name: a.name,
    description: a.description,
  }));

  const showForm = grants.canCreate || (editing !== null && grants.canUpdate);
  const canSubmit = editing ? grants.canUpdate : grants.canCreate;

  if (loading) {
    return <p className="text-slate-400">Loading permissions...</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold">Permissions</h1>
        <p className="mt-2 text-slate-400">
          Define resource:action permissions for the RBAC system.
          {canViewResources || canViewActions ? (
            <>
              {" "}
              Manage catalogs in{" "}
              {canViewResources ? (
                <Link href="/admin/resources" className="text-emerald-400 hover:underline">
                  Resources
                </Link>
              ) : null}
              {canViewResources && canViewActions ? " and " : null}
              {canViewActions ? (
                <Link href="/admin/actions" className="text-emerald-400 hover:underline">
                  Actions
                </Link>
              ) : null}
              .
            </>
          ) : null}
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
        <h2 className="text-lg font-medium">
          {editing ? "Edit Permission" : "Create Permission"}
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          <SearchableSelect
            label="Resource"
            placeholder="Search resources..."
            options={resourceOptions}
            value={form.resourceId}
            onChange={(resourceId) => setForm((prev) => ({ ...prev, resourceId }))}
            required
          />
          <SearchableSelect
            label="Action"
            placeholder="Search actions..."
            options={actionOptions}
            value={form.actionId}
            onChange={(actionId) => setForm((prev) => ({ ...prev, actionId }))}
            required
          />
          <div>
            <label className="mb-2 block text-sm text-slate-400">Description</label>
            <input
              className={inputClass}
              placeholder="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
        </div>
        {editing ? (
          <p className="text-sm text-slate-500">
            Current name: <code className="text-emerald-400">{editing.name}</code> (auto-generated
            from resource:action)
          </p>
        ) : form.resourceId && form.actionId ? (
          <p className="text-sm text-slate-500">
            Will create:{" "}
            <code className="text-emerald-400">
              {resources.find((r) => r.id === form.resourceId)?.name}:
              {actions.find((a) => a.id === form.actionId)?.name}
            </code>
          </p>
        ) : null}

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
              <th className="px-4 py-3">Resource</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">In Use</th>
              {grants.canUpdate || grants.canDelete ? (
                <th className="px-4 py-3">Actions</th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {permissions.map((permission) => (
              <tr key={permission.id} className="border-t border-slate-800">
                <td className="px-4 py-3 font-mono text-emerald-400">{permission.name}</td>
                <td className="px-4 py-3">{permission.resource}</td>
                <td className="px-4 py-3">{permission.action}</td>
                <td className="px-4 py-3">{permission.description ?? "—"}</td>
                <td className="px-4 py-3">
                  {permission._count.rolePermissions} roles
                </td>
                {grants.canUpdate || grants.canDelete ? (
                <td className="px-4 py-3">
                  <RowActions
                    canUpdate={grants.canUpdate}
                    canDelete={grants.canDelete}
                    onEdit={() => startEdit(permission)}
                    onDelete={() => handleDelete(permission.id)}
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
