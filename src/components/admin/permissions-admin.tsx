"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { SearchableSelect } from "@/components/admin/searchable-select";
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
  const [editing, setEditing] = useState<PermissionRow | null>(null);
  const [form, setForm] = useState({
    resourceId: "",
    actionId: "",
    description: "",
  });

  const needsCatalogs = grants.canCreate || grants.canUpdate;

  const {
    items: permissions,
    loading,
    error,
    submitting,
    deletingId,
    setError,
    save,
    remove,
  } = useCachedList<PermissionRow>("/api/admin/permissions");
  const { data: resources = [] } = useCachedFetch<CatalogOption[]>(
    "/api/admin/resources?active=true",
    { enabled: needsCatalogs },
  );
  const { data: actions = [] } = useCachedFetch<CatalogOption[]>(
    "/api/admin/actions?active=true",
    { enabled: needsCatalogs },
  );

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
    if (submitting) return;
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

    try {
      await save({
        url: editing ? `/api/admin/permissions/${editing.id}` : "/api/admin/permissions",
        method: editing ? "PATCH" : "POST",
        body: payload,
      });
      resetForm();
    } catch {
      // Error message is set by the cache hook.
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this permission?")) return;
    setError(null);
    try {
      await remove(`/api/admin/permissions/${id}`, id);
    } catch {
      // Error message is set by the cache hook.
    }
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

  if (loading && permissions.length === 0) {
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
                    onDelete={() => void handleDelete(permission.id)}
                    deleting={deletingId === permission.id}
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
