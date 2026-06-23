"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  buttonPrimaryClass,
  buttonSecondaryClass,
  inputClass,
  saveButtonLabel,
} from "@/components/admin/ui";
import { RowActions } from "@/components/admin/row-actions";
import { useCachedList } from "@/hooks/use-cached-list";
import type { ResourceGrants } from "@/lib/permissions/grants";

type Option = { id: string; label: string };

type FieldConfig = {
  key: string;
  label: string;
  type?: "text" | "number" | "select" | "textarea";
  options?: { value: string; label: string }[];
  required?: boolean;
};

type ColumnConfig = {
  key: string;
  label: string;
  render?: (row: Record<string, unknown>) => string;
};

type FilterConfig = {
  key: string;
  label: string;
  options: Option[];
  value: string;
  onChange: (value: string) => void;
};

type EntityRow = Record<string, unknown> & { id: string };

type EntityCrudPanelProps = {
  title: string;
  apiPath: string;
  resource: string;
  grants: ResourceGrants;
  fields: FieldConfig[];
  columns: ColumnConfig[];
  filters?: FilterConfig[];
  buildQuery?: (filters: Record<string, string>) => string;
  getInitialForm: () => Record<string, string>;
  mapRowToForm: (row: Record<string, unknown>) => Record<string, string>;
  buildPayload: (form: Record<string, string>) => Record<string, unknown>;
  extraPanel?: React.ReactNode;
  embedded?: boolean;
};

export function EntityCrudPanel({
  title,
  apiPath,
  grants,
  fields,
  columns,
  filters = [],
  buildQuery,
  getInitialForm,
  mapRowToForm,
  buildPayload,
  extraPanel,
  embedded = false,
}: EntityCrudPanelProps) {
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [form, setForm] = useState(getInitialForm);
  const [showForm, setShowForm] = useState(false);

  const singularLabel = title.endsWith("s") ? title.slice(0, -1) : title;

  const queryString = buildQuery
    ? buildQuery(
        Object.fromEntries(filters.map((filter) => [filter.key, filter.value])),
      )
    : filters
        .filter((filter) => filter.value)
        .map((filter) => `${filter.key}=${encodeURIComponent(filter.value)}`)
        .join("&");

  const listUrl = useMemo(
    () => (queryString ? `${apiPath}?${queryString}` : apiPath),
    [apiPath, queryString],
  );

  const {
    items: rows,
    loading,
    error,
    submitting,
    deletingId,
    setError,
    save,
    remove,
  } = useCachedList<EntityRow>(listUrl);

  function resetForm() {
    setEditing(null);
    setForm(getInitialForm());
    setShowForm(false);
  }

  function openCreateForm() {
    setEditing(null);
    setForm(getInitialForm());
    setShowForm(true);
  }

  function openEditForm(row: Record<string, unknown>) {
    setEditing(row);
    setForm(mapRowToForm(row));
    setShowForm(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setError(null);
    try {
      const payload = buildPayload(form);
      await save({
        url: editing ? `${apiPath}/${editing.id}` : apiPath,
        method: editing ? "PATCH" : "POST",
        body: payload,
      });
      resetForm();
    } catch {
      // Error message is set by the cache hook.
    }
  }

  async function handleDelete(row: Record<string, unknown>) {
    if (!confirm("Delete this record?")) return;
    setError(null);
    try {
      await remove(`${apiPath}/${row.id}`, String(row.id));
    } catch {
      // Error message is set by the cache hook.
    }
  }

  return (
    <div>
      {embedded ? (
        <h2 className="text-lg font-medium text-slate-200">{title}</h2>
      ) : (
        <h1 className="text-3xl font-semibold">{title}</h1>
      )}

      {filters.length > 0 ? (
        <div className={embedded ? "mt-4 flex flex-wrap gap-3" : "mt-6 flex flex-wrap gap-3"}>
          {filters.map((filter) => (
            <div key={filter.key}>
              <label className="mb-1 block text-xs text-slate-400">{filter.label}</label>
              <select
                value={filter.value}
                onChange={(event) => filter.onChange(event.target.value)}
                className={inputClass}
                disabled={submitting || deletingId != null}
              >
                <option value="">All</option>
                {filter.options.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      ) : null}

      {grants.canCreate && !showForm ? (
        <div className={embedded ? "mt-4" : "mt-6"}>
          <button
            type="button"
            onClick={openCreateForm}
            className={buttonPrimaryClass}
            disabled={submitting || deletingId != null}
          >
            Add {singularLabel}
          </button>
        </div>
      ) : null}

      {showForm && (grants.canCreate || grants.canUpdate) ? (
        <form
          onSubmit={handleSubmit}
          className={
            embedded
              ? "mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-6"
              : "mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-6"
          }
        >
          <fieldset disabled={submitting} className="min-w-0 border-0 p-0">
          <h2 className="text-lg font-medium">
            {editing ? "Edit" : "Create"} {singularLabel}
          </h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {fields.map((field) => (
              <div key={field.key} className={field.type === "textarea" ? "md:col-span-2" : ""}>
                <label className="mb-1 block text-sm text-slate-300">{field.label}</label>
                {field.type === "select" ? (
                  <select
                    required={field.required}
                    value={form[field.key] ?? ""}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, [field.key]: event.target.value }))
                    }
                    className={inputClass}
                  >
                    <option value="">Select...</option>
                    {field.options?.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : field.type === "textarea" ? (
                  <textarea
                    required={field.required}
                    value={form[field.key] ?? ""}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, [field.key]: event.target.value }))
                    }
                    className={inputClass}
                    rows={3}
                  />
                ) : (
                  <input
                    type={field.type === "number" ? "number" : "text"}
                    required={field.required}
                    value={form[field.key] ?? ""}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, [field.key]: event.target.value }))
                    }
                    className={inputClass}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-3">
            <button type="submit" className={buttonPrimaryClass} disabled={submitting}>
              {saveButtonLabel({ submitting, isEdit: !!editing })}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className={buttonSecondaryClass}
            >
              Cancel
            </button>
          </div>
          </fieldset>
        </form>
      ) : null}

      {extraPanel}

      {error ? (
        <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      <div className={embedded ? "mt-4 overflow-x-auto rounded-2xl border border-slate-800" : "mt-8 overflow-x-auto rounded-2xl border border-slate-800"}>
        <table className="min-w-full text-sm">
          <thead className="bg-slate-900 text-left text-slate-400">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="px-4 py-3 font-medium">
                  {column.label}
                </th>
              ))}
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length + 1} className="px-4 py-8 text-slate-400">
                  Loading...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="px-4 py-8 text-slate-400">
                  No records found.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={String(row.id)} className="border-t border-slate-800">
                  {columns.map((column) => (
                    <td key={column.key} className="px-4 py-3 text-slate-200">
                      {column.render
                        ? column.render(row)
                        : String(row[column.key] ?? "")}
                    </td>
                  ))}
                  <td className="px-4 py-3">
                    <RowActions
                      canUpdate={grants.canUpdate}
                      canDelete={grants.canDelete}
                      onEdit={() => openEditForm(row)}
                      onDelete={() => void handleDelete(row)}
                      deleting={deletingId === String(row.id)}
                      disabled={submitting}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
