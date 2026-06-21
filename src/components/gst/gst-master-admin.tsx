"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  buttonPrimaryClass,
  buttonSecondaryClass,
  inputClass,
} from "@/components/admin/ui";
import { DatePickerField } from "@/components/properties/date-picker-field";
import { readApiError, readApiJson } from "@/lib/api/parse-response";
import { formatGstNumberInput } from "@/lib/gst/gst-number";
import {
  CONSTITUTION_OF_BUSINESS_OPTIONS,
  GSTIN_STATUS_OPTIONS,
  TAXPAYER_TYPE_OPTIONS,
  withLegacyOption,
} from "@/lib/gst/gst-master-options";
import type { ResourceGrants } from "@/lib/permissions/grants";

type GstMasterRow = {
  id: string;
  gstNumber: string;
  legalName: string;
  tradeName: string;
  effectiveRegistrationDate: string;
  constitutionOfBusiness: string;
  gstinStatus: string;
  taxpayerType: string;
  principalPlaceOfBusiness: string;
};

const emptyForm = {
  gstNumber: "",
  legalName: "",
  tradeName: "",
  effectiveRegistrationDate: "",
  constitutionOfBusiness: "",
  gstinStatus: "",
  taxpayerType: "",
  principalPlaceOfBusiness: "",
};

function formatDate(value: string) {
  return value.slice(0, 10);
}

export function GstMasterAdmin({ grants }: { grants: ResourceGrants }) {
  const [rows, setRows] = useState<GstMasterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/gst/masters");
      if (!res.ok) throw new Error(await readApiError(res));
      setRows(await readApiJson(res));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load GST master");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
  }

  function startEdit(row: GstMasterRow) {
    setEditingId(row.id);
    setShowForm(true);
    setForm({
      gstNumber: row.gstNumber,
      legalName: row.legalName,
      tradeName: row.tradeName,
      effectiveRegistrationDate: formatDate(row.effectiveRegistrationDate),
      constitutionOfBusiness: row.constitutionOfBusiness,
      gstinStatus: row.gstinStatus,
      taxpayerType: row.taxpayerType,
      principalPlaceOfBusiness: row.principalPlaceOfBusiness,
    });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (editingId ? !grants.canUpdate : !grants.canCreate) return;
    setError(null);

    const payload = {
      gstNumber: form.gstNumber,
      legalName: form.legalName,
      tradeName: form.tradeName,
      effectiveRegistrationDate: form.effectiveRegistrationDate,
      constitutionOfBusiness: form.constitutionOfBusiness,
      gstinStatus: form.gstinStatus,
      taxpayerType: form.taxpayerType,
      principalPlaceOfBusiness: form.principalPlaceOfBusiness,
    };

    try {
      const res = await fetch(editingId ? `/api/gst/masters/${editingId}` : "/api/gst/masters", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save GST master record");
    }
  }

  async function handleDelete(id: string) {
    if (!grants.canDelete) return;
    if (!window.confirm("Delete this GST master record?")) return;
    setError(null);

    try {
      const res = await fetch(`/api/gst/masters/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await readApiError(res));
      if (editingId === id) resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete GST master record");
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">GST Master</h1>
          <p className="mt-2 text-slate-400">
            Store GSTIN details for customers, vendors, and other parties. GST numbers are saved in
            uppercase.
          </p>
        </div>
        {grants.canCreate ? (
          <button
            type="button"
            className={buttonPrimaryClass}
            onClick={() => {
              if (showForm && !editingId) {
                resetForm();
              } else {
                setEditingId(null);
                setForm(emptyForm);
                setShowForm(true);
              }
            }}
          >
            {showForm && !editingId ? "Cancel" : "Add GST record"}
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
          <h2 className="text-lg font-medium">
            {editingId ? "Edit GST master record" : "New GST master record"}
          </h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-slate-300">GST number</label>
              <input
                required
                value={form.gstNumber}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, gstNumber: formatGstNumberInput(e.target.value) }))
                }
                className={`${inputClass} uppercase`}
                maxLength={15}
              />
            </div>
            <DatePickerField
              label="Effective date of registration"
              value={form.effectiveRegistrationDate}
              allowPastDates
              onChange={(effectiveRegistrationDate) =>
                setForm((prev) => ({ ...prev, effectiveRegistrationDate }))
              }
            />
            <div>
              <label className="mb-1 block text-sm text-slate-300">Legal name of business</label>
              <input
                required
                value={form.legalName}
                onChange={(e) => setForm((prev) => ({ ...prev, legalName: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-300">Trade name</label>
              <input
                required
                value={form.tradeName}
                onChange={(e) => setForm((prev) => ({ ...prev, tradeName: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-300">Constitution of business</label>
              <select
                required
                value={form.constitutionOfBusiness}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, constitutionOfBusiness: e.target.value }))
                }
                className={inputClass}
              >
                <option value="">Select constitution</option>
                {withLegacyOption(
                  CONSTITUTION_OF_BUSINESS_OPTIONS,
                  form.constitutionOfBusiness,
                ).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-300">GSTIN / UIN status</label>
              <select
                required
                value={form.gstinStatus}
                onChange={(e) => setForm((prev) => ({ ...prev, gstinStatus: e.target.value }))}
                className={inputClass}
              >
                <option value="">Select status</option>
                {withLegacyOption(GSTIN_STATUS_OPTIONS, form.gstinStatus).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-300">Taxpayer type</label>
              <select
                required
                value={form.taxpayerType}
                onChange={(e) => setForm((prev) => ({ ...prev, taxpayerType: e.target.value }))}
                className={inputClass}
              >
                <option value="">Select taxpayer type</option>
                {withLegacyOption(TAXPAYER_TYPE_OPTIONS, form.taxpayerType).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm text-slate-300">
                Principal place of business
              </label>
              <textarea
                required
                rows={3}
                value={form.principalPlaceOfBusiness}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, principalPlaceOfBusiness: e.target.value }))
                }
                className={inputClass}
              />
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <button type="submit" className={buttonPrimaryClass}>
              {editingId ? "Update record" : "Save record"}
            </button>
            <button type="button" className={buttonSecondaryClass} onClick={resetForm}>
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {loading ? (
        <p className="mt-8 text-slate-400">Loading GST master...</p>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-2xl border border-slate-800">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-950 text-left text-slate-400">
              <tr>
                <th className="px-4 py-3">GST number</th>
                <th className="px-4 py-3">Legal name</th>
                <th className="px-4 py-3">Trade name</th>
                <th className="px-4 py-3">Registration</th>
                <th className="px-4 py-3">Constitution</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Taxpayer type</th>
                <th className="px-4 py-3">Principal place</th>
                {(grants.canUpdate || grants.canDelete) && <th className="px-4 py-3">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                    No GST master records yet.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-800 text-slate-200">
                    <td className="px-4 py-3 font-mono">{row.gstNumber}</td>
                    <td className="px-4 py-3">{row.legalName}</td>
                    <td className="px-4 py-3">{row.tradeName}</td>
                    <td className="px-4 py-3">{formatDate(row.effectiveRegistrationDate)}</td>
                    <td className="px-4 py-3">{row.constitutionOfBusiness}</td>
                    <td className="px-4 py-3">{row.gstinStatus}</td>
                    <td className="px-4 py-3">{row.taxpayerType}</td>
                    <td className="max-w-xs truncate px-4 py-3" title={row.principalPlaceOfBusiness}>
                      {row.principalPlaceOfBusiness}
                    </td>
                    {(grants.canUpdate || grants.canDelete) && (
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {grants.canUpdate ? (
                            <button
                              type="button"
                              className="text-violet-300 hover:text-violet-200"
                              onClick={() => startEdit(row)}
                            >
                              Edit
                            </button>
                          ) : null}
                          {grants.canDelete ? (
                            <button
                              type="button"
                              className="text-red-300 hover:text-red-200"
                              onClick={() => void handleDelete(row.id)}
                            >
                              Delete
                            </button>
                          ) : null}
                        </div>
                      </td>
                    )}
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
