"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  buttonPrimaryClass,
  buttonSecondaryClass,
  inputClass,
} from "@/components/admin/ui";
import { DatePickerField } from "@/components/properties/date-picker-field";
import type { ResourceGrants } from "@/lib/permissions/grants";
import { readApiError, readApiJson } from "@/lib/api/parse-response";

type TaxConfigRow = {
  id: string;
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
  startDate: string;
  endDate: string;
  isExpired: boolean;
};

const emptyForm = {
  cgstRate: "",
  sgstRate: "",
  igstRate: "",
  startDate: "",
  endDate: "",
};

function formatDate(value: string) {
  return value.slice(0, 10);
}

export function TaxConfigAdmin({ grants }: { grants: ResourceGrants }) {
  const [rows, setRows] = useState<TaxConfigRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/gst/tax-config");
      if (!res.ok) throw new Error(await readApiError(res));
      setRows(await readApiJson(res));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tax configuration");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!grants.canCreate) return;
    setError(null);

    try {
      const res = await fetch("/api/gst/tax-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cgstRate: Number(form.cgstRate),
          sgstRate: Number(form.sgstRate),
          igstRate: Number(form.igstRate),
          startDate: form.startDate,
          endDate: form.endDate,
        }),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      setShowForm(false);
      setForm(emptyForm);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save tax configuration");
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Tax Configuration</h1>
          <p className="mt-2 text-slate-400">
            Set CGST, SGST, and IGST rates with validity dates. Invoices use the rate active on
            the invoice date.
          </p>
        </div>
        {grants.canCreate ? (
          <button
            type="button"
            className={buttonPrimaryClass}
            onClick={() => {
              setShowForm((open) => !open);
              setForm({
                ...emptyForm,
                startDate: new Date().toISOString().slice(0, 10),
              });
            }}
          >
            {showForm ? "Cancel" : "Add tax rate"}
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      {showForm && grants.canCreate ? (
        <form
          onSubmit={handleSubmit}
          className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-6"
        >
          <h2 className="text-lg font-medium">New tax rate</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm text-slate-300">CGST (%)</label>
              <input
                required
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={form.cgstRate}
                onChange={(e) => setForm((prev) => ({ ...prev, cgstRate: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-300">SGST (%)</label>
              <input
                required
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={form.sgstRate}
                onChange={(e) => setForm((prev) => ({ ...prev, sgstRate: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-300">IGST (%)</label>
              <input
                required
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={form.igstRate}
                onChange={(e) => setForm((prev) => ({ ...prev, igstRate: e.target.value }))}
                className={inputClass}
              />
            </div>
            <DatePickerField
              label="Start date"
              value={form.startDate}
              allowPastDates
              onChange={(startDate) => setForm((prev) => ({ ...prev, startDate }))}
            />
            <DatePickerField
              label="End date"
              value={form.endDate}
              onChange={(endDate) => setForm((prev) => ({ ...prev, endDate }))}
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            End date should be a future date until which this rate applies. After it passes, the
            configuration is marked expired.
          </p>
          <button type="submit" className={`${buttonPrimaryClass} mt-4`}>
            Save tax rate
          </button>
        </form>
      ) : null}

      <div className="mt-8 overflow-x-auto rounded-2xl border border-slate-800">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-900 text-left text-slate-400">
            <tr>
              <th className="px-4 py-3">CGST %</th>
              <th className="px-4 py-3">SGST %</th>
              <th className="px-4 py-3">IGST %</th>
              <th className="px-4 py-3">Start</th>
              <th className="px-4 py-3">End</th>
              <th className="px-4 py-3">Status</th>
              {grants.canDelete ? <th className="px-4 py-3">Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-slate-400">
                  Loading...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-slate-400">
                  No tax rates configured yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t border-slate-800">
                  <td className="px-4 py-3">{row.cgstRate}</td>
                  <td className="px-4 py-3">{row.sgstRate}</td>
                  <td className="px-4 py-3">{row.igstRate}</td>
                  <td className="px-4 py-3">{formatDate(row.startDate)}</td>
                  <td className="px-4 py-3">{formatDate(row.endDate)}</td>
                  <td className="px-4 py-3">
                    {row.isExpired ? (
                      <span className="text-red-300">Expired</span>
                    ) : (
                      <span className="text-emerald-300">Active</span>
                    )}
                  </td>
                  {grants.canDelete ? (
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        className={buttonSecondaryClass}
                        onClick={async () => {
                          if (!confirm("Delete this tax rate?")) return;
                          const res = await fetch(`/api/gst/tax-config/${row.id}`, {
                            method: "DELETE",
                          });
                          if (!res.ok) {
                            setError(await readApiError(res));
                            return;
                          }
                          await load();
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
