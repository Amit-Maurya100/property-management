"use client";

import { FormEvent, Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
  buttonPrimaryClass,
  buttonSecondaryClass,
  inputClass,
  saveButtonLabel,
} from "@/components/admin/ui";
import { DatePickerField } from "@/components/properties/date-picker-field";
import { GstMasterBankAccountsPanel } from "@/components/gst/gst-master-bank-accounts-panel";
import {
  GstMasterDetailPanel,
  GstMasterViewLink,
  type GstMasterDetailRow,
} from "@/components/gst/gst-master-detail-panel";
import { useCachedList } from "@/hooks/use-cached-list";
import { formatGstNumberInput } from "@/lib/gst/gst-number";
import {
  CONSTITUTION_OF_BUSINESS_OPTIONS,
  GSTIN_STATUS_OPTIONS,
  TAXPAYER_TYPE_OPTIONS,
  withLegacyOption,
} from "@/lib/gst/gst-master-options";
import type { ResourceGrants } from "@/lib/permissions/grants";

type GstMasterRow = GstMasterDetailRow;

const emptyForm = {
  gstNumber: "",
  legalName: "",
  tradeName: "",
  effectiveRegistrationDate: "",
  constitutionOfBusiness: "",
  gstinStatus: "",
  taxpayerType: "",
  principalPlaceOfBusiness: "",
  primaryContact: "",
  secondaryContact: "",
};

function formatDate(value: string) {
  return value.slice(0, 10);
}

export function GstMasterAdmin({ grants }: { grants: ResourceGrants }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const detailScrollRef = useRef<HTMLDivElement>(null);

  const {
    items: rows,
    loading,
    error,
    submitting,
    setError,
    save,
    invalidate,
  } = useCachedList<GstMasterRow>("/api/gst/masters");

  const editingRow = useMemo(
    () => rows.find((row) => row.id === editingId) ?? null,
    [rows, editingId],
  );

  const viewingRow = useMemo(
    () => rows.find((row) => row.id === viewingId) ?? null,
    [rows, viewingId],
  );

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
  }

  function startView(row: GstMasterRow) {
    setViewingId((current) => (current === row.id ? null : row.id));
    resetForm();
  }

  useEffect(() => {
    if (!viewingId) return;
    requestAnimationFrame(() => {
      detailScrollRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [viewingId]);

  function startEdit(row: GstMasterRow) {
    setViewingId(null);
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
      primaryContact: row.primaryContact ?? "",
      secondaryContact: row.secondaryContact ?? "",
    });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;
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
      primaryContact: form.primaryContact || undefined,
      secondaryContact: form.secondaryContact || undefined,
    };

    try {
      const saved = await save({
        url: editingId ? `/api/gst/masters/${editingId}` : "/api/gst/masters",
        method: editingId ? "PATCH" : "POST",
        body: payload,
      });
      if (!editingId && saved?.id) {
        setEditingId(saved.id);
        setShowForm(true);
      }
    } catch {
      // Error message is set by the cache hook.
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">GST Master</h1>
          <p className="mt-2 text-slate-400">
            Store GSTIN details, contacts, and bank accounts for customers, vendors, and other
            parties. GST numbers are saved in uppercase.
          </p>
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
        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <form onSubmit={handleSubmit}>
            <fieldset disabled={submitting} className="min-w-0 border-0 p-0">
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
                    setForm((prev) => ({
                      ...prev,
                      gstNumber: formatGstNumberInput(e.target.value),
                    }))
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
                <label className="mb-1 block text-sm text-slate-300">Primary contact</label>
                <input
                  value={form.primaryContact}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, primaryContact: e.target.value }))
                  }
                  className={inputClass}
                  placeholder="Name, phone, or email"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-300">Secondary contact</label>
                <input
                  value={form.secondaryContact}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, secondaryContact: e.target.value }))
                  }
                  className={inputClass}
                  placeholder="Name, phone, or email"
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
              <button type="submit" className={buttonPrimaryClass} disabled={submitting}>
                {saveButtonLabel({
                  submitting,
                  isEdit: !!editingId,
                  createLabel: editingId ? "Update record" : "Save record",
                  updateLabel: "Update record",
                })}
              </button>
              <button type="button" className={buttonSecondaryClass} onClick={resetForm}>
                {editingId ? "Done" : "Cancel"}
              </button>
            </div>
            </fieldset>
          </form>

          {editingId && editingRow ? (
            <GstMasterBankAccountsPanel
              gstMasterId={editingId}
              accounts={editingRow.bankAccounts}
              grants={grants}
              disabled={submitting}
              onChanged={async () => {
                await invalidate();
              }}
            />
          ) : null}
        </div>
      ) : null}

      {loading && rows.length === 0 ? (
        <p className="mt-8 text-slate-400">Loading GST master...</p>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-2xl border border-slate-800">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-950 text-left text-slate-400">
              <tr>
                <th className="px-4 py-3">GST number</th>
                <th className="px-4 py-3">Legal name</th>
                <th className="px-4 py-3">Trade name</th>
                <th className="px-4 py-3">Primary contact</th>
                <th className="px-4 py-3">Bank accounts</th>
                <th className="px-4 py-3">Registration</th>
                <th className="px-4 py-3">Status</th>
                {grants.canUpdate ? <th className="px-4 py-3">Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    No GST master records yet.
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const isViewing = viewingId === row.id;
                  const colSpan = grants.canUpdate ? 8 : 7;
                  return (
                    <Fragment key={row.id}>
                      <tr className="border-t border-slate-800 text-slate-200">
                        <td className="px-4 py-3">
                          <GstMasterViewLink mono onClick={() => startView(row)}>
                            {row.gstNumber}
                          </GstMasterViewLink>
                        </td>
                        <td className="px-4 py-3">{row.legalName}</td>
                        <td className="px-4 py-3">
                          <GstMasterViewLink onClick={() => startView(row)}>
                            {row.tradeName}
                          </GstMasterViewLink>
                        </td>
                        <td className="px-4 py-3">{row.primaryContact ?? "—"}</td>
                        <td className="px-4 py-3">{row.bankAccounts.length}</td>
                        <td className="px-4 py-3">{formatDate(row.effectiveRegistrationDate)}</td>
                        <td className="px-4 py-3">{row.gstinStatus}</td>
                        {grants.canUpdate ? (
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              className={buttonSecondaryClass}
                              disabled={submitting}
                              onClick={() => startEdit(row)}
                            >
                              Edit
                            </button>
                          </td>
                        ) : null}
                      </tr>
                      {isViewing && viewingRow ? (
                        <tr className="border-t border-slate-800 bg-slate-950/40">
                          <td colSpan={colSpan} className="px-4 py-4">
                            <div ref={detailScrollRef}>
                              <GstMasterDetailPanel
                                embedded
                                row={viewingRow}
                                grants={grants}
                                onClose={() => setViewingId(null)}
                                onEdit={() => startEdit(viewingRow)}
                              />
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
