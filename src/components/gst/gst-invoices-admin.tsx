"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  buttonPrimaryClass,
  buttonSecondaryClass,
  inputClass,
} from "@/components/admin/ui";
import { DatePickerField } from "@/components/properties/date-picker-field";
import {
  calculateInvoiceTax,
  isTaxConfigActive,
} from "@/lib/gst/tax-calculations";
import type { ResourceGrants } from "@/lib/permissions/grants";
import { readApiError, readApiJson } from "@/lib/api/parse-response";
import { formatGstNumberInput } from "@/lib/gst/gst-number";
import { GstPartyLookup } from "@/components/gst/gst-party-lookup";
import {
  emptyGstInvoiceSearch,
  filterGstInvoices,
  hasActiveGstInvoiceSearch,
  type GstInvoiceSearchFilters,
} from "@/lib/gst/invoice-filters";

type InvoiceType = "B2B_SALE" | "B2C_SALE" | "PURCHASE";

type InvoiceRow = {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  gstNumber?: string | null;
  tradeName?: string | null;
  customerName?: string | null;
  customerAddress?: string | null;
  taxableValue: string;
  cgst: string;
  sgst: string;
  igst: string;
  cess: string;
  totalTaxAmount: string;
  invoiceValue: string;
  description?: string | null;
  paymentStatus: "PENDING" | "PARTIAL" | "PAID";
};

type ActiveTaxConfig = {
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
  startDate: string;
  endDate: string;
  organizationGstNumber: string;
  isExpired: boolean;
};

const PAYMENT_STATUSES = ["PENDING", "PARTIAL", "PAID"] as const;

const emptyForm = {
  invoiceNumber: "",
  invoiceDate: "",
  gstNumber: "",
  tradeName: "",
  customerGstNumber: "",
  customerName: "",
  customerAddress: "",
  taxableValue: "",
  cess: "0",
  description: "",
  paymentStatus: "PENDING" as (typeof PAYMENT_STATUSES)[number],
};

function formatDate(value: string) {
  return value.slice(0, 10);
}

function toNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

type GstInvoicesAdminProps = {
  invoiceType: InvoiceType;
  title: string;
  grants: ResourceGrants;
  organizationGstNumber: string;
};

export function GstInvoicesAdmin({
  invoiceType,
  title,
  grants,
  organizationGstNumber,
}: GstInvoicesAdminProps) {
  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [taxConfig, setTaxConfig] = useState<ActiveTaxConfig | null>(null);
  const [taxConfigError, setTaxConfigError] = useState<string | null>(null);
  const [search, setSearch] = useState<GstInvoiceSearchFilters>(emptyGstInvoiceSearch);

  const isB2b = invoiceType === "B2B_SALE";
  const isB2c = invoiceType === "B2C_SALE";
  const isPurchase = invoiceType === "PURCHASE";

  const filteredRows = useMemo(
    () =>
      filterGstInvoices(rows, search, {
        includeCustomerSearch: isB2c,
        includeTradeNameSearch: isB2b || isPurchase,
      }),
    [rows, search, isB2c, isB2b, isPurchase],
  );

  const partyGstNumber = isB2c
    ? form.customerGstNumber || null
    : form.gstNumber || null;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/gst/invoices?type=${invoiceType}`);
      if (!res.ok) throw new Error(await readApiError(res));
      setRows(await readApiJson(res));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load invoices");
    } finally {
      setLoading(false);
    }
  }, [invoiceType]);

  const loadTaxConfig = useCallback(async (date: string) => {
    if (!date) {
      setTaxConfig(null);
      setTaxConfigError("Select an invoice date to load tax rates.");
      return;
    }
    try {
      const res = await fetch(`/api/gst/tax-config/active?date=${date}`);
      if (!res.ok) throw new Error(await readApiError(res));
      const config: ActiveTaxConfig | null = await readApiJson(res);
      if (!config) {
        setTaxConfig(null);
        setTaxConfigError("No active tax configuration for this invoice date.");
        return;
      }
      const active = isTaxConfigActive(
        new Date(config.startDate),
        new Date(config.endDate),
        new Date(date),
      );
      if (!active) {
        setTaxConfig(config);
        setTaxConfigError("Tax rate is expired for this invoice date.");
        return;
      }
      setTaxConfig(config);
      setTaxConfigError(config.isExpired ? "This tax rate period has ended." : null);
    } catch (err) {
      setTaxConfig(null);
      setTaxConfigError(err instanceof Error ? err.message : "Failed to load tax rates");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (showForm && form.invoiceDate) {
      void loadTaxConfig(form.invoiceDate);
    }
  }, [showForm, form.invoiceDate, loadTaxConfig]);

  const calculatedTax = useMemo(() => {
    if (!taxConfig || !form.taxableValue || taxConfigError?.includes("No active")) {
      return null;
    }
    if (
      !isTaxConfigActive(
        new Date(taxConfig.startDate),
        new Date(taxConfig.endDate),
        new Date(form.invoiceDate || Date.now()),
      )
    ) {
      return null;
    }
    return calculateInvoiceTax({
      taxableValue: toNumber(form.taxableValue),
      cess: toNumber(form.cess),
      organizationGstNumber,
      partyGstNumber,
      rates: {
        cgstRate: taxConfig.cgstRate,
        sgstRate: taxConfig.sgstRate,
        igstRate: taxConfig.igstRate,
      },
    });
  }, [
    taxConfig,
    taxConfigError,
    form.taxableValue,
    form.cess,
    form.invoiceDate,
    organizationGstNumber,
    partyGstNumber,
  ]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!grants.canCreate || !calculatedTax) return;
    setError(null);

    const payload: Record<string, unknown> = {
      type: invoiceType,
      invoiceNumber: form.invoiceNumber,
      invoiceDate: form.invoiceDate,
      taxableValue: toNumber(form.taxableValue),
      cess: toNumber(form.cess),
      description: form.description || undefined,
      paymentStatus: form.paymentStatus,
    };

    if (isB2b || isPurchase) {
      payload.gstNumber = form.gstNumber;
      payload.tradeName = form.tradeName;
    }
    if (isB2c) {
      payload.customerName = form.customerName;
      payload.customerAddress = form.customerAddress;
      if (form.customerGstNumber) payload.customerGstNumber = form.customerGstNumber;
      if (form.tradeName) payload.tradeName = form.tradeName;
    }

    try {
      const res = await fetch("/api/gst/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      setShowForm(false);
      setForm(emptyForm);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save invoice");
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">{title}</h1>
          <p className="mt-2 text-slate-400">
            Taxes are calculated from Tax Configuration. CGST+SGST apply when the first 2 digits
            of the party GST match your organization GST ({organizationGstNumber.slice(0, 2)}),
            otherwise IGST applies.
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
                invoiceDate: new Date().toISOString().slice(0, 10),
              });
            }}
          >
            {showForm ? "Cancel" : "Add invoice"}
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
          <h2 className="text-lg font-medium">New invoice</h2>

          {taxConfigError ? (
            <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
              {taxConfigError}
            </p>
          ) : taxConfig ? (
            <p className="mt-3 text-sm text-slate-400">
              Using rates CGST {taxConfig.cgstRate}% · SGST {taxConfig.sgstRate}% · IGST{" "}
              {taxConfig.igstRate}% (valid {formatDate(taxConfig.startDate)} –{" "}
              {formatDate(taxConfig.endDate)})
            </p>
          ) : null}

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-slate-300">Invoice number</label>
              <input
                required
                value={form.invoiceNumber}
                onChange={(e) => setForm((prev) => ({ ...prev, invoiceNumber: e.target.value }))}
                className={inputClass}
              />
            </div>
            <DatePickerField
              label="Date"
              value={form.invoiceDate}
              allowPastDates
              onChange={(invoiceDate) => setForm((prev) => ({ ...prev, invoiceDate }))}
            />
            {isB2b || isPurchase ? (
              <GstPartyLookup
                tradeName={form.tradeName}
                gstNumber={form.gstNumber}
                onTradeNameChange={(tradeName) => setForm((prev) => ({ ...prev, tradeName }))}
                onGstNumberChange={(gstNumber) => setForm((prev) => ({ ...prev, gstNumber }))}
                onSelect={(party) =>
                  setForm((prev) => ({
                    ...prev,
                    tradeName: party.tradeName,
                    gstNumber: party.gstNumber,
                  }))
                }
              />
            ) : null}
            {isB2c ? (
              <>
                <div>
                  <label className="mb-1 block text-sm text-slate-300">Customer name</label>
                  <input
                    required
                    value={form.customerName}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, customerName: e.target.value }))
                    }
                    className={inputClass}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm text-slate-300">Customer address</label>
                  <input
                    required
                    value={form.customerAddress}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, customerAddress: e.target.value }))
                    }
                    className={inputClass}
                  />
                </div>
                <GstPartyLookup
                  tradeName={form.tradeName}
                  gstNumber={form.customerGstNumber}
                  tradeNameRequired={false}
                  gstNumberRequired={false}
                  onTradeNameChange={(tradeName) => setForm((prev) => ({ ...prev, tradeName }))}
                  onGstNumberChange={(customerGstNumber) =>
                    setForm((prev) => ({ ...prev, customerGstNumber }))
                  }
                  onSelect={(party) =>
                    setForm((prev) => ({
                      ...prev,
                      tradeName: party.tradeName,
                      customerGstNumber: party.gstNumber,
                      customerName: prev.customerName || party.tradeName,
                    }))
                  }
                />
              </>
            ) : null}
            <div>
              <label className="mb-1 block text-sm text-slate-300">Taxable value</label>
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={form.taxableValue}
                onChange={(e) => setForm((prev) => ({ ...prev, taxableValue: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-300">Cess</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.cess}
                onChange={(e) => setForm((prev) => ({ ...prev, cess: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-300">CGST</label>
              <input
                readOnly
                value={calculatedTax?.cgst ?? ""}
                className={`${inputClass} bg-slate-950 text-slate-400`}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-300">SGST</label>
              <input
                readOnly
                value={calculatedTax?.sgst ?? ""}
                className={`${inputClass} bg-slate-950 text-slate-400`}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-300">IGST</label>
              <input
                readOnly
                value={calculatedTax?.igst ?? ""}
                className={`${inputClass} bg-slate-950 text-slate-400`}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-300">Total tax amount</label>
              <input
                readOnly
                value={calculatedTax?.totalTaxAmount ?? ""}
                className={`${inputClass} bg-slate-950 text-slate-400`}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-300">Invoice value</label>
              <input
                readOnly
                value={calculatedTax?.invoiceValue ?? ""}
                className={`${inputClass} bg-slate-950 text-slate-400`}
              />
            </div>
            {calculatedTax ? (
              <div className="md:col-span-2 text-sm text-slate-400">
                {calculatedTax.isIntrastate
                  ? "Intrastate: CGST + SGST applied"
                  : "Interstate: IGST applied"}
              </div>
            ) : null}
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm text-slate-300">Description</label>
              <input
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-300">Payment status</label>
              <select
                required
                value={form.paymentStatus}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    paymentStatus: e.target.value as (typeof PAYMENT_STATUSES)[number],
                  }))
                }
                className={inputClass}
              >
                {PAYMENT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status.charAt(0) + status.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button
            type="submit"
            disabled={!calculatedTax}
            className={`${buttonPrimaryClass} mt-4 disabled:opacity-50`}
          >
            Save invoice
          </button>
        </form>
      ) : null}

      <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-sm font-medium text-slate-200">Search invoices</h2>
          {hasActiveGstInvoiceSearch(search) ? (
            <button
              type="button"
              className={buttonSecondaryClass}
              onClick={() => setSearch(emptyGstInvoiceSearch)}
            >
              Clear filters
            </button>
          ) : null}
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-sm text-slate-300">Invoice number</label>
            <input
              value={search.invoiceNumber}
              onChange={(e) => setSearch((prev) => ({ ...prev, invoiceNumber: e.target.value }))}
              className={inputClass}
              placeholder="Search invoice #"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-300">Date from</label>
            <input
              type="date"
              value={search.dateFrom}
              onChange={(e) => setSearch((prev) => ({ ...prev, dateFrom: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-300">Date to</label>
            <input
              type="date"
              value={search.dateTo}
              onChange={(e) => setSearch((prev) => ({ ...prev, dateTo: e.target.value }))}
              className={inputClass}
            />
          </div>
          {isB2c ? (
            <div>
              <label className="mb-1 block text-sm text-slate-300">Customer</label>
              <input
                value={search.customer}
                onChange={(e) => setSearch((prev) => ({ ...prev, customer: e.target.value }))}
                className={inputClass}
                placeholder="Name or address"
              />
            </div>
          ) : (
            <div>
              <label className="mb-1 block text-sm text-slate-300">Trade name</label>
              <input
                value={search.customer}
                onChange={(e) => setSearch((prev) => ({ ...prev, customer: e.target.value }))}
                className={inputClass}
                placeholder="Search trade name"
              />
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm text-slate-300">GST number</label>
            <input
              value={search.gstNumber}
              onChange={(e) =>
                setSearch((prev) => ({ ...prev, gstNumber: formatGstNumberInput(e.target.value) }))
              }
              className={`${inputClass} uppercase`}
              maxLength={15}
              placeholder={isB2c ? "Customer GST" : "Party GST"}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-300">Taxable value</label>
            <input
              value={search.taxableValue}
              onChange={(e) => setSearch((prev) => ({ ...prev, taxableValue: e.target.value }))}
              className={inputClass}
              placeholder="Amount"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-300">Payment status</label>
            <select
              value={search.paymentStatus}
              onChange={(e) => setSearch((prev) => ({ ...prev, paymentStatus: e.target.value }))}
              className={inputClass}
            >
              <option value="">All statuses</option>
              {PAYMENT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status.charAt(0) + status.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </div>
        </div>
        {!loading ? (
          <p className="mt-3 text-xs text-slate-500">
            Showing {filteredRows.length} of {rows.length} invoice{rows.length === 1 ? "" : "s"}
          </p>
        ) : null}
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-800">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-900 text-left text-slate-400">
            <tr>
              <th className="px-4 py-3">Invoice #</th>
              <th className="px-4 py-3">Date</th>
              {isB2b || isPurchase ? (
                <>
                  <th className="px-4 py-3">Trade name</th>
                  <th className="px-4 py-3">GST #</th>
                </>
              ) : null}
              {isB2c ? (
                <>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Address</th>
                </>
              ) : null}
              <th className="px-4 py-3">Taxable</th>
              <th className="px-4 py-3">CGST</th>
              <th className="px-4 py-3">SGST</th>
              <th className="px-4 py-3">IGST</th>
              <th className="px-4 py-3">Total tax</th>
              <th className="px-4 py-3">Value</th>
              <th className="px-4 py-3">Status</th>
              {grants.canDelete ? <th className="px-4 py-3">Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={14} className="px-4 py-8 text-slate-400">
                  Loading...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={14} className="px-4 py-8 text-slate-400">
                  No invoices yet.
                </td>
              </tr>
            ) : filteredRows.length === 0 ? (
              <tr>
                <td colSpan={14} className="px-4 py-8 text-slate-400">
                  No invoices match your search.
                </td>
              </tr>
            ) : (
              filteredRows.map((row) => (
                <tr key={row.id} className="border-t border-slate-800">
                  <td className="px-4 py-3">{row.invoiceNumber}</td>
                  <td className="px-4 py-3">{formatDate(row.invoiceDate)}</td>
                  {isB2b || isPurchase ? (
                    <>
                      <td className="px-4 py-3">{row.tradeName ?? "—"}</td>
                      <td className="px-4 py-3">{row.gstNumber ?? "—"}</td>
                    </>
                  ) : null}
                  {isB2c ? (
                    <>
                      <td className="px-4 py-3">{row.customerName ?? "—"}</td>
                      <td className="px-4 py-3">{row.customerAddress ?? "—"}</td>
                    </>
                  ) : null}
                  <td className="px-4 py-3">{row.taxableValue}</td>
                  <td className="px-4 py-3">{row.cgst}</td>
                  <td className="px-4 py-3">{row.sgst}</td>
                  <td className="px-4 py-3">{row.igst}</td>
                  <td className="px-4 py-3">{row.totalTaxAmount}</td>
                  <td className="px-4 py-3">{row.invoiceValue}</td>
                  <td className="px-4 py-3">{row.paymentStatus}</td>
                  {grants.canDelete ? (
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        className={buttonSecondaryClass}
                        onClick={async () => {
                          if (!confirm("Delete this invoice?")) return;
                          const res = await fetch(`/api/gst/invoices/${row.id}`, {
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
