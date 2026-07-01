"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
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
import { fetchJson } from "@/lib/api/client-cache";
import {
  calculateInvoiceTax,
  isTaxConfigActive,
} from "@/lib/gst/tax-calculations";
import type { ResourceGrants } from "@/lib/permissions/grants";
import { formatGstNumberInput } from "@/lib/gst/gst-number";
import { paymentStatusLabel } from "@/lib/properties/payment-calculations";
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
  filingStatus: "PENDING" | "FILED";
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

const FILING_STATUSES = ["PENDING", "FILED"] as const;

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
};

const filingSelectClass =
  "rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-sm outline-none ring-emerald-500 focus:ring-2";

function filingStatusLabel(status: (typeof FILING_STATUSES)[number]) {
  return status === "FILED" ? "Filed" : "Pending";
}

function paymentStatusClass(status: InvoiceRow["paymentStatus"]) {
  if (status === "PAID") return "text-emerald-400 font-medium";
  if (status === "PARTIAL") return "text-amber-300";
  return "text-slate-300";
}

function isGstInvoiceDeletable(paymentStatus: InvoiceRow["paymentStatus"]) {
  return paymentStatus !== "PAID";
}

function filingStatusClass(status: InvoiceRow["filingStatus"]) {
  if (status === "FILED") return "text-emerald-400 font-medium";
  return "text-slate-300";
}

function formatDate(value: string) {
  return value.slice(0, 10);
}

function displayInvoiceNumber(invoiceNumber: string, forPurchase: boolean) {
  if (!forPurchase) return invoiceNumber;
  const lastSlash = invoiceNumber.lastIndexOf("/");
  if (lastSlash === -1 || lastSlash === invoiceNumber.length - 1) {
    return invoiceNumber;
  }
  return invoiceNumber.slice(lastSlash + 1);
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
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [taxConfigError, setTaxConfigError] = useState<string | null>(null);
  const [search, setSearch] = useState<GstInvoiceSearchFilters>(emptyGstInvoiceSearch);
  const [updatingFilingId, setUpdatingFilingId] = useState<string | null>(null);
  const [bulkFileMonth, setBulkFileMonth] = useState(() =>
    new Date().toISOString().slice(0, 7),
  );
  const [bulkFiling, setBulkFiling] = useState(false);

  const listUrl = `/api/gst/invoices?type=${invoiceType}`;
  const {
    items: rows,
    loading,
    error,
    submitting,
    deletingId,
    setError,
    save,
    remove,
    invalidate,
  } = useCachedList<InvoiceRow>(listUrl);

  const taxConfigUrl =
    showForm && form.invoiceDate
      ? `/api/gst/tax-config/active?date=${form.invoiceDate}`
      : "";
  const { data: taxConfig } = useCachedFetch<ActiveTaxConfig | null>(taxConfigUrl, {
    enabled: Boolean(taxConfigUrl),
  });

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

  useEffect(() => {
    if (!showForm || !form.invoiceDate) {
      setTaxConfigError(showForm ? "Select an invoice date to load tax rates." : null);
      return;
    }
    if (!taxConfig) {
      setTaxConfigError("No active tax configuration for this invoice date.");
      return;
    }
    const active = isTaxConfigActive(
      new Date(taxConfig.startDate),
      new Date(taxConfig.endDate),
      new Date(form.invoiceDate),
    );
    if (!active) {
      setTaxConfigError("Tax rate is expired for this invoice date.");
      return;
    }
    setTaxConfigError(taxConfig.isExpired ? "This tax rate period has ended." : null);
  }, [showForm, form.invoiceDate, taxConfig]);

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
    if (!calculatedTax || submitting) return;
    if (editingId ? !grants.canUpdate : !grants.canCreate) return;
    setError(null);

    const payload: Record<string, unknown> = {
      invoiceNumber: form.invoiceNumber,
      invoiceDate: form.invoiceDate,
      taxableValue: toNumber(form.taxableValue),
      cess: toNumber(form.cess),
      description: form.description || undefined,
    };

    if (!editingId) {
      payload.type = invoiceType;
    }

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
      await save({
        url: editingId ? `/api/gst/invoices/${editingId}` : "/api/gst/invoices",
        method: editingId ? "PATCH" : "POST",
        body: payload,
      });
      resetForm();
    } catch {
      // Error message is set by the cache hook.
    }
  }

  function resetForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  function startEdit(row: InvoiceRow) {
    setEditingId(row.id);
    setShowForm(true);
    setForm({
      invoiceNumber: row.invoiceNumber,
      invoiceDate: formatDate(row.invoiceDate),
      gstNumber: isB2c ? "" : row.gstNumber ?? "",
      tradeName: row.tradeName ?? "",
      customerGstNumber: isB2c ? row.gstNumber ?? "" : "",
      customerName: row.customerName ?? "",
      customerAddress: row.customerAddress ?? "",
      taxableValue: row.taxableValue,
      cess: row.cess,
      description: row.description ?? "",
    });
  }

  async function handleFilingStatusChange(id: string, filingStatus: InvoiceRow["filingStatus"]) {
    if (!grants.canUpdate || updatingFilingId) return;
    setError(null);
    setUpdatingFilingId(id);
    try {
      await save({
        url: `/api/gst/invoices/${id}`,
        method: "PATCH",
        body: { filingStatus },
      });
    } catch {
      // Error message is set by the cache hook.
    } finally {
      setUpdatingFilingId(null);
    }
  }

  async function handleBulkFileMonth() {
    if (!grants.canUpdate || bulkFiling || submitting) return;
    if (!bulkFileMonth) return;

    const monthLabel = new Date(`${bulkFileMonth}-01T00:00:00Z`).toLocaleString("en-IN", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });

    if (
      !window.confirm(
        `Mark all ${title.toLowerCase()} invoices dated in ${monthLabel} as filed?`,
      )
    ) {
      return;
    }

    setError(null);
    setBulkFiling(true);
    try {
      const result = await fetchJson<{ updatedCount: number; periodLabel: string }>(
        "/api/gst/invoices/file-month",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: invoiceType, month: bulkFileMonth }),
        },
      );
      await invalidate();
      if (result.updatedCount === 0) {
        setError(`No invoices found for ${result.periodLabel}.`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk filing failed");
    } finally {
      setBulkFiling(false);
    }
  }

  const monthInvoiceCount = useMemo(() => {
    if (!bulkFileMonth) return 0;
    return rows.filter((row) => row.invoiceDate.slice(0, 7) === bulkFileMonth).length;
  }, [rows, bulkFileMonth]);

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
            disabled={submitting}
            onClick={() => {
              if (submitting) return;
              if (showForm && !editingId) {
                resetForm();
                return;
              }
              setEditingId(null);
              setShowForm(true);
              setForm({
                ...emptyForm,
                invoiceDate: new Date().toISOString().slice(0, 10),
              });
            }}
          >
            {showForm && !editingId ? "Cancel" : "Add invoice"}
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
            {editingId ? "Edit invoice" : "New invoice"}
          </h2>

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
          </div>
          <div className="mt-4 flex gap-3">
            <button
              type="submit"
              disabled={!calculatedTax || submitting}
              className={`${buttonPrimaryClass} disabled:opacity-50`}
            >
              {saveButtonLabel({
                submitting,
                isEdit: !!editingId,
                createLabel: "Save invoice",
              })}
            </button>
            {editingId ? (
              <button type="button" className={buttonSecondaryClass} onClick={resetForm}>
                Cancel
              </button>
            ) : null}
          </div>
          </fieldset>
        </form>
      ) : null}

      {grants.canUpdate ? (
        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <h2 className="text-sm font-medium text-slate-200">Bulk filing</h2>
          <p className="mt-1 text-sm text-slate-400">
            Mark every invoice in the selected month as filed for this tab only ({title}).
          </p>
          <div className="mt-4 flex flex-wrap items-end gap-4">
            <div>
              <label className="mb-1 block text-sm text-slate-300">Month</label>
              <input
                type="month"
                value={bulkFileMonth}
                onChange={(e) => setBulkFileMonth(e.target.value)}
                className={inputClass}
              />
            </div>
            <button
              type="button"
              className={buttonPrimaryClass}
              disabled={bulkFiling || submitting || !bulkFileMonth || monthInvoiceCount === 0}
              onClick={() => void handleBulkFileMonth()}
            >
              {bulkFiling ? "Updating..." : "Mark month as filed"}
            </button>
            {bulkFileMonth ? (
              <p className="text-sm text-slate-500">
                {monthInvoiceCount} invoice{monthInvoiceCount === 1 ? "" : "s"} in this month
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-4">
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
              {(["PENDING", "PARTIAL", "PAID"] as const).map((status) => (
                <option key={status} value={status}>
                  {paymentStatusLabel(status)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-300">Filing status</label>
            <select
              value={search.filingStatus}
              onChange={(e) => setSearch((prev) => ({ ...prev, filingStatus: e.target.value }))}
              className={inputClass}
            >
              <option value="">All statuses</option>
              {FILING_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {filingStatusLabel(status)}
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

      <div className="mt-4 w-full overflow-x-auto rounded-2xl border border-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-slate-900 text-left text-slate-400">
            <tr>
              <th className="px-3 py-2 whitespace-nowrap">Invoice #</th>
              {isB2b || isPurchase ? (
                <>
                  <th className="px-3 py-2">Trade name</th>
                  <th className="px-3 py-2 whitespace-nowrap">GST #</th>
                </>
              ) : null}
              {isB2c ? (
                <>
                  <th className="px-3 py-2">Customer</th>
                  <th className="px-3 py-2">Address</th>
                </>
              ) : null}
              <th className="px-3 py-2 whitespace-nowrap">Date</th>
              <th className="px-3 py-2 whitespace-nowrap">Filing</th>
              <th className="px-3 py-2 whitespace-nowrap">Taxable</th>
              <th className="px-3 py-2 whitespace-nowrap">CGST</th>
              <th className="px-3 py-2 whitespace-nowrap">SGST</th>
              <th className="px-3 py-2 whitespace-nowrap">IGST</th>
              <th className="px-3 py-2 whitespace-nowrap">Total tax</th>
              <th className="px-3 py-2 whitespace-nowrap">Value</th>
              <th className="px-3 py-2 whitespace-nowrap">Payment</th>
              {grants.canUpdate || grants.canDelete ? (
                <th className="px-3 py-2">Actions</th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0 ? (
              <tr>
                <td colSpan={15} className="px-4 py-8 text-slate-400">
                  Loading...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={15} className="px-4 py-8 text-slate-400">
                  No invoices yet.
                </td>
              </tr>
            ) : filteredRows.length === 0 ? (
              <tr>
                <td colSpan={15} className="px-4 py-8 text-slate-400">
                  No invoices match your search.
                </td>
              </tr>
            ) : (
              filteredRows.map((row) => (
                <tr key={row.id} className="border-t border-slate-800">
                  <td
                    className="px-3 py-2 whitespace-nowrap"
                    title={isPurchase ? row.invoiceNumber : undefined}
                  >
                    {displayInvoiceNumber(row.invoiceNumber, isPurchase)}
                  </td>
                  {isB2b || isPurchase ? (
                    <>
                      <td className="px-3 py-2" title={row.tradeName ?? undefined}>
                        {row.tradeName ?? "—"}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">{row.gstNumber ?? "—"}</td>
                    </>
                  ) : null}
                  {isB2c ? (
                    <>
                      <td className="px-3 py-2" title={row.customerName ?? undefined}>
                        {row.customerName ?? "—"}
                      </td>
                      <td className="px-3 py-2" title={row.customerAddress ?? undefined}>
                        {row.customerAddress ?? "—"}
                      </td>
                    </>
                  ) : null}
                  <td className="px-3 py-2 whitespace-nowrap text-slate-300">
                    {formatDate(row.invoiceDate)}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {grants.canUpdate ? (
                      <select
                        value={row.filingStatus}
                        disabled={updatingFilingId === row.id || submitting}
                        onChange={(e) =>
                          void handleFilingStatusChange(
                            row.id,
                            e.target.value as InvoiceRow["filingStatus"],
                          )
                        }
                        className={`${filingSelectClass} ${filingStatusClass(row.filingStatus)}`}
                      >
                        {FILING_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {filingStatusLabel(status)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className={filingStatusClass(row.filingStatus)}>
                        {filingStatusLabel(row.filingStatus)}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{row.taxableValue}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{row.cgst}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{row.sgst}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{row.igst}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{row.totalTaxAmount}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{row.invoiceValue}</td>
                  <td className={`px-3 py-2 whitespace-nowrap ${paymentStatusClass(row.paymentStatus)}`}>
                    {paymentStatusLabel(row.paymentStatus)}
                  </td>
                  {grants.canUpdate || grants.canDelete ? (
                    <td className="px-3 py-2">
                      {isGstInvoiceDeletable(row.paymentStatus) ? (
                        <RowActions
                          canUpdate={grants.canUpdate}
                          canDelete={grants.canDelete}
                          onEdit={() => startEdit(row)}
                          onDelete={async () => {
                            if (
                              !confirm(
                                row.paymentStatus === "PARTIAL"
                                  ? "Delete this invoice and its recorded payments?"
                                  : "Delete this invoice?",
                              )
                            ) {
                              return;
                            }
                            setError(null);
                            try {
                              await remove(`/api/gst/invoices/${row.id}`, row.id);
                              if (editingId === row.id) {
                                setEditingId(null);
                                setShowForm(false);
                                setForm(emptyForm);
                              }
                            } catch {
                              // Error message is set by the cache hook.
                            }
                          }}
                          deleting={deletingId === row.id}
                          disabled={submitting || updatingFilingId !== null}
                        />
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
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
