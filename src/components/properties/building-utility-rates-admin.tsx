"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  buttonPrimaryClass,
  buttonSecondaryClass,
  inputClass,
  saveButtonLabel,
} from "@/components/admin/ui";
import { DatePickerField } from "@/components/properties/date-picker-field";
import { RowActions } from "@/components/admin/row-actions";
import { useCachedFetch } from "@/hooks/use-cached-fetch";
import { useCachedList } from "@/hooks/use-cached-list";
import {
  BUILDING_UTILITY_LABELS,
  BUILDING_UTILITY_RATE_HINTS,
  BUILDING_UTILITY_TYPES,
} from "@/lib/properties/building-utility-types";
import type { ResourceGrants } from "@/lib/permissions/grants";

type UtilityRateRow = {
  id: string;
  buildingId: string;
  utilityType: (typeof BUILDING_UTILITY_TYPES)[number];
  unitRate: number;
  startDate: string;
  endDate: string;
  isExpired: boolean;
  building: { id: string; name: string; property: { id: string; name: string } };
};

const emptyForm = {
  buildingId: "",
  utilityType: "ELECTRICITY" as (typeof BUILDING_UTILITY_TYPES)[number],
  unitRate: "",
  startDate: "",
  endDate: "",
};

function formatDate(value: string) {
  return value.slice(0, 10);
}

export function BuildingUtilityRatesAdmin({
  grants,
  embedded = false,
}: {
  grants: ResourceGrants;
  embedded?: boolean;
}) {
  const [buildingFilter, setBuildingFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const ratesUrl = useMemo(
    () =>
      buildingFilter
        ? `/api/buildings/utility-rates?buildingId=${buildingFilter}`
        : "/api/buildings/utility-rates",
    [buildingFilter],
  );

  const { data: buildingRows = [] } = useCachedFetch<
    Array<{ id: string; name: string; property: { name: string } }>
  >("/api/buildings");

  const buildings = useMemo(
    () =>
      buildingRows.map((row) => ({
        id: row.id,
        name: row.name,
        propertyName: row.property.name,
      })),
    [buildingRows],
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
  } = useCachedList<UtilityRateRow>(ratesUrl);

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
  }

  function startEdit(row: UtilityRateRow) {
    setEditingId(row.id);
    setShowForm(true);
    setForm({
      buildingId: row.buildingId,
      utilityType: row.utilityType,
      unitRate: String(row.unitRate),
      startDate: formatDate(row.startDate),
      endDate: formatDate(row.endDate),
    });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (editingId ? !grants.canUpdate : !grants.canCreate) return;
    if (submitting) return;
    setError(null);

    const payload = {
      utilityType: form.utilityType,
      unitRate: Number(form.unitRate),
      startDate: form.startDate,
      endDate: form.endDate,
    };

    try {
      await save({
        url: editingId
          ? `/api/buildings/utility-rates/${editingId}`
          : "/api/buildings/utility-rates",
        method: editingId ? "PATCH" : "POST",
        body: editingId
          ? payload
          : {
              buildingId: form.buildingId,
              ...payload,
            },
      });
      resetForm();
    } catch {
      // Error message is set by the cache hook.
    }
  }

  async function handleDelete(id: string) {
    if (!grants.canDelete || !window.confirm("Delete this utility rate?")) return;
    setError(null);
    try {
      await remove(`/api/buildings/utility-rates/${id}`, id);
      if (editingId === id) resetForm();
    } catch {
      // Error message is set by the cache hook.
    }
  }

  return (
    <div>
      {!embedded ? (
        <div>
          <h1 className="text-3xl font-semibold">Building utility rates</h1>
          <p className="mt-2 text-slate-400">
            Configure Electricity, Gas (LPG), and Cleaning charges per building with valid from/to
            dates. Rent uses rates active on the bill start date.
          </p>
        </div>
      ) : null}

      <div className={`flex flex-wrap items-end justify-between gap-4 ${embedded ? "" : "mt-6"}`}>
        <div>
          <label className="mb-1 block text-sm text-slate-300">Building</label>
          <select
            value={buildingFilter}
            onChange={(e) => setBuildingFilter(e.target.value)}
            className={inputClass}
          >
            <option value="">All buildings</option>
            {buildings.map((building) => (
              <option key={building.id} value={building.id}>
                {building.name} ({building.propertyName})
              </option>
            ))}
          </select>
        </div>
        {grants.canCreate ? (
          <button
            type="button"
            className={buttonPrimaryClass}
            disabled={submitting}
            onClick={() => {
              if (submitting) return;
              if (showForm && !editingId) {
                resetForm();
              } else {
                setEditingId(null);
                setForm({
                  ...emptyForm,
                  buildingId: buildingFilter,
                  startDate: new Date().toISOString().slice(0, 10),
                });
                setShowForm(true);
              }
            }}
          >
            {showForm && !editingId ? "Cancel" : "Add utility rate"}
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      {showForm && (editingId ? grants.canUpdate : grants.canCreate) ? (
        <form
          onSubmit={handleSubmit}
          className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-6"
        >
          <fieldset disabled={submitting} className="min-w-0 border-0 p-0">
          <h2 className="text-lg font-medium">
            {editingId ? "Edit utility rate" : "New utility rate"}
          </h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-slate-300">Building</label>
              <select
                required
                disabled={editingId != null}
                value={form.buildingId}
                onChange={(e) => setForm((prev) => ({ ...prev, buildingId: e.target.value }))}
                className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-60`}
              >
                <option value="">Select building</option>
                {buildings.map((building) => (
                  <option key={building.id} value={building.id}>
                    {building.name} ({building.propertyName})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-300">Utility</label>
              <select
                required
                value={form.utilityType}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    utilityType: e.target.value as (typeof BUILDING_UTILITY_TYPES)[number],
                  }))
                }
                className={inputClass}
              >
                {BUILDING_UTILITY_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {BUILDING_UTILITY_LABELS[type]}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-500">
                {BUILDING_UTILITY_RATE_HINTS[form.utilityType]}
              </p>
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-300">Unit cost (₹)</label>
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={form.unitRate}
                onChange={(e) => setForm((prev) => ({ ...prev, unitRate: e.target.value }))}
                className={inputClass}
              />
            </div>
            <DatePickerField
              label="Valid from"
              value={form.startDate}
              allowPastDates
              onChange={(startDate) => setForm((prev) => ({ ...prev, startDate }))}
            />
            <DatePickerField
              label="Valid to"
              value={form.endDate}
              allowPastDates
              onChange={(endDate) => setForm((prev) => ({ ...prev, endDate }))}
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="submit" className={buttonPrimaryClass} disabled={submitting}>
              {saveButtonLabel({
                submitting,
                isEdit: !!editingId,
                createLabel: "Save utility rate",
                updateLabel: "Update utility rate",
              })}
            </button>
            {editingId ? (
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
          </fieldset>
        </form>
      ) : null}

      {loading ? (
        <p className="mt-8 text-slate-400">Loading utility rates...</p>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-2xl border border-slate-800">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-950 text-left text-slate-400">
              <tr>
                <th className="px-4 py-3">Building</th>
                <th className="px-4 py-3">Utility</th>
                <th className="px-4 py-3">Unit cost</th>
                <th className="px-4 py-3">Valid from</th>
                <th className="px-4 py-3">Valid to</th>
                <th className="px-4 py-3">Status</th>
                {grants.canUpdate || grants.canDelete ? (
                  <th className="px-4 py-3">Actions</th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={grants.canUpdate || grants.canDelete ? 7 : 6}
                    className="px-4 py-8 text-center text-slate-500"
                  >
                    No utility rates configured yet.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-800 text-slate-200">
                    <td className="px-4 py-3">
                      {row.building.name}
                      <span className="block text-xs text-slate-500">
                        {row.building.property.name}
                      </span>
                    </td>
                    <td className="px-4 py-3">{BUILDING_UTILITY_LABELS[row.utilityType]}</td>
                    <td className="px-4 py-3">₹{row.unitRate.toFixed(2)}</td>
                    <td className="px-4 py-3">{formatDate(row.startDate)}</td>
                    <td className="px-4 py-3">{formatDate(row.endDate)}</td>
                    <td className="px-4 py-3">
                      {row.isExpired ? (
                        <span className="text-red-300">Expired</span>
                      ) : (
                        <span className="text-emerald-300">Active</span>
                      )}
                    </td>
                    {grants.canUpdate || grants.canDelete ? (
                      <td className="px-4 py-3">
                        <RowActions
                          canUpdate={grants.canUpdate}
                          canDelete={grants.canDelete}
                          onEdit={() => startEdit(row)}
                          onDelete={() => void handleDelete(row.id)}
                          deleting={deletingId === row.id}
                          disabled={submitting}
                        />
                      </td>
                    ) : null}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
