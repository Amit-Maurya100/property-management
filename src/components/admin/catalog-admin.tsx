"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  buttonPrimaryClass,
  buttonSecondaryClass,
  inputClass,
} from "@/components/admin/ui";
import { RowActions } from "@/components/admin/row-actions";
import type { ResourceGrants } from "@/lib/permissions/grants";

type CatalogRow = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  _count: { permissions: number };
};

type CatalogAdminProps = {
  title: string;
  description: string;
  apiPath: "/api/admin/resources" | "/api/admin/actions";
  namePlaceholder: string;
  grants: ResourceGrants;
};

export function CatalogAdmin({
  title,
  description,
  apiPath,
  namePlaceholder,
  grants,
}: CatalogAdminProps) {
  const [items, setItems] = useState<CatalogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<CatalogRow | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    isActive: true,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(apiPath);
      if (!response.ok) throw new Error((await response.json()).error);
      setItems(await response.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to load ${title.toLowerCase()}`);
    } finally {
      setLoading(false);
    }
  }, [apiPath, title]);

  useEffect(() => {
    load();
  }, [load]);

  function resetForm() {
    setEditing(null);
    setForm({ name: "", description: "", isActive: true });
  }

  function startEdit(item: CatalogRow) {
    if (!grants.canUpdate) return;
    setEditing(item);
    setForm({
      name: item.name,
      description: item.description ?? "",
      isActive: item.isActive,
    });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const payload = {
      name: form.name,
      description: form.description || undefined,
      isActive: form.isActive,
    };

    const response = await fetch(editing ? `${apiPath}/${editing.id}` : apiPath, {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const data = await response.json();
      setError(data.error ?? "Save failed");
      return;
    }

    resetForm();
    await load();
  }

  async function handleDelete(id: string) {
    if (!confirm(`Delete this ${title.slice(0, -1).toLowerCase()}?`)) return;
    const response = await fetch(`${apiPath}/${id}`, { method: "DELETE" });
    if (!response.ok) {
      const data = await response.json();
      setError(data.error ?? "Delete failed");
      return;
    }
    await load();
  }

  const showForm = grants.canCreate || (editing !== null && grants.canUpdate);
  const canSubmit = editing ? grants.canUpdate : grants.canCreate;
  const canEditFields = editing ? grants.canUpdate : grants.canCreate;

  if (loading) {
    return <p className="text-slate-400">Loading {title.toLowerCase()}...</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold">{title}</h1>
        <p className="mt-2 text-slate-400">{description}</p>
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
          {editing ? `Edit ${title.slice(0, -1)}` : `Create ${title.slice(0, -1)}`}
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          <input
            className={inputClass}
            placeholder={namePlaceholder}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            disabled={!canEditFields}
          />
          <input
            className={inputClass}
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            disabled={!canEditFields}
          />
          <label
            className={`flex items-center gap-2 text-sm text-slate-300 ${
              canEditFields ? "" : "cursor-not-allowed opacity-70"
            }`}
          >
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              disabled={!canEditFields}
            />
            Active
          </label>
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
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">In Use</th>
              {grants.canUpdate || grants.canDelete ? (
                <th className="px-4 py-3">Actions</th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-slate-800">
                <td className="px-4 py-3 font-mono text-emerald-400">{item.name}</td>
                <td className="px-4 py-3">{item.description ?? "—"}</td>
                <td className="px-4 py-3">
                  {item.isActive ? (
                    <span className="text-emerald-400">Active</span>
                  ) : (
                    <span className="text-slate-500">Inactive</span>
                  )}
                </td>
                <td className="px-4 py-3">{item._count.permissions} permissions</td>
                {grants.canUpdate || grants.canDelete ? (
                <td className="px-4 py-3">
                  <RowActions
                    canUpdate={grants.canUpdate}
                    canDelete={grants.canDelete}
                    onEdit={() => startEdit(item)}
                    onDelete={() => handleDelete(item.id)}
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
