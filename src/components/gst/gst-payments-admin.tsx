"use client";

import { FormEvent, Fragment, useMemo, useRef, useState } from "react";
import {
  buttonPrimaryClass,
  buttonSecondaryClass,
  inputClass,
} from "@/components/admin/ui";
import { DatePickerField } from "@/components/properties/date-picker-field";
import { useCachedList } from "@/hooks/use-cached-list";
import { fetchMutation } from "@/lib/api/client-cache";
import type { ResourceGrants } from "@/lib/permissions/grants";
import {
  formatMoney,
  PAYMENT_ACCOUNT_NAMES,
  paymentAccountNameLabel,
  paymentModeLabel,
  paymentStatusLabel,
  type PaymentAccountNameValue,
  type PaymentModeValue,
} from "@/lib/properties/payment-calculations";

type GstInvoiceType = "B2B_SALE" | "B2C_SALE" | "PURCHASE";

type GstPaymentRow = {
  id: string;
  amount: string;
  mode: PaymentModeValue;
  accountName: PaymentAccountNameValue;
  appliedToInvoice: string;
  paidAt: string;
  notes?: string | null;
};

type GstInvoicePaymentRow = {
  id: string;
  invoiceType: GstInvoiceType;
  invoiceNumber: string;
  invoiceDate: string;
  gstNumber?: string | null;
  tradeName?: string | null;
  customerName?: string | null;
  invoiceValue: string;
  paymentStatus: "PENDING" | "PARTIAL" | "PAID";
  invoiceAmount: number;
  paidTotal: number;
  balanceDue: number;
  payments: GstPaymentRow[];
};

const PAYMENT_MODES: PaymentModeValue[] = ["CASH", "CHEQUE", "NEFT", "UPI", "OTHER"];

const INVOICE_TYPE_OPTIONS: Array<{ value: "" | GstInvoiceType; label: string }> = [
  { value: "", label: "All types" },
  { value: "B2B_SALE", label: "B2B Sale" },
  { value: "B2C_SALE", label: "B2C Sale" },
  { value: "PURCHASE", label: "Purchase" },
];

const emptyPaymentForm = {
  amount: "",
  mode: "CASH" as PaymentModeValue,
  accountName: "NONE" as PaymentAccountNameValue,
  paidAt: "",
  notes: "",
};

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return value.slice(0, 10);
}

function invoiceTypeLabel(type: GstInvoiceType) {
  if (type === "B2B_SALE") return "B2B Sale";
  if (type === "B2C_SALE") return "B2C Sale";
  return "Purchase";
}

function partyLabel(row: GstInvoicePaymentRow) {
  if (row.invoiceType === "PURCHASE") {
    return row.tradeName || row.gstNumber || "—";
  }
  return row.customerName || row.gstNumber || "—";
}

function statusClass(status: GstInvoicePaymentRow["paymentStatus"]) {
  if (status === "PAID") return "text-emerald-300";
  if (status === "PARTIAL") return "text-amber-300";
  return "text-slate-300";
}

function toMoney(value: string | number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function GstPaymentsAdmin({ grants }: { grants: ResourceGrants }) {
  const [filterType, setFilterType] = useState<"" | GstInvoiceType>("");
  const [showAll, setShowAll] = useState(false);
  const [payingInvoiceId, setPayingInvoiceId] = useState<string | null>(null);
  const [viewingInvoiceId, setViewingInvoiceId] = useState<string | null>(null);
  const [paymentForm, setPaymentForm] = useState(emptyPaymentForm);
  const [submitting, setSubmitting] = useState(false);
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null);
  const submittingRef = useRef(false);
  const deletingRef = useRef(false);

  const invoicesUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (filterType) params.set("type", filterType);
    if (showAll) params.set("status", "all");
    return `/api/gst/payments/invoices?${params.toString()}`;
  }, [filterType, showAll]);

  const {
    items: rows,
    loading,
    error,
    setError,
    invalidate,
  } = useCachedList<GstInvoicePaymentRow>(invoicesUrl);

  const payingInvoice = useMemo(
    () => rows.find((row) => row.id === payingInvoiceId) ?? null,
    [rows, payingInvoiceId],
  );

  async function handlePaymentSubmit(event: FormEvent) {
    event.preventDefault();
    if (!payingInvoiceId || submittingRef.current) return;
    setError(null);
    submittingRef.current = true;
    setSubmitting(true);

    try {
      await fetchMutation("/api/gst/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gstInvoiceId: payingInvoiceId,
          amount: Number(paymentForm.amount),
          mode: paymentForm.mode,
          accountName: paymentForm.accountName,
          paidAt: paymentForm.paidAt || undefined,
          notes: paymentForm.notes || undefined,
        }),
      });
      setPayingInvoiceId(null);
      setPaymentForm(emptyPaymentForm);
      await invalidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed");
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  async function handleDeletePayment(paymentId: string) {
    if (!confirm("Delete this payment?")) return;
    if (deletingRef.current) return;
    setError(null);
    deletingRef.current = true;
    setDeletingPaymentId(paymentId);

    try {
      await fetchMutation(`/api/gst/payments/${paymentId}`, { method: "DELETE" });
      await invalidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      deletingRef.current = false;
      setDeletingPaymentId(null);
    }
  }

  function openPaymentForm(row: GstInvoicePaymentRow) {
    setPayingInvoiceId(row.id);
    setViewingInvoiceId(null);
    setPaymentForm({
      ...emptyPaymentForm,
      amount: row.balanceDue > 0 ? String(row.balanceDue) : "",
      paidAt: new Date().toISOString().slice(0, 10),
    });
  }

  return (
    <div>
      <h1 className="text-3xl font-semibold">GST Payments</h1>
      <p className="mt-2 text-slate-400">
        Record payments against B2B, B2C, and purchase invoices. Partial payments are
        supported until the invoice is fully paid.
      </p>

      {error ? (
        <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm text-slate-300">Invoice type</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as "" | GstInvoiceType)}
            className={inputClass}
          >
            {INVOICE_TYPE_OPTIONS.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={showAll}
              onChange={(e) => setShowAll(e.target.checked)}
              className="h-4 w-4 rounded border-slate-600 bg-slate-800"
            />
            Show paid invoices too
          </label>
        </div>
      </div>

      {payingInvoice && grants.canCreate ? (
        <form
          onSubmit={handlePaymentSubmit}
          className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6"
        >
          <fieldset disabled={submitting} className="min-w-0 border-0 p-0">
            <h2 className="text-lg font-medium">Record payment</h2>
            <p className="mt-1 text-sm text-slate-400">
              {invoiceTypeLabel(payingInvoice.invoiceType)} · #{payingInvoice.invoiceNumber} ·{" "}
              {partyLabel(payingInvoice)} · Balance {formatMoney(payingInvoice.balanceDue)}
            </p>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm text-slate-300">Payment amount</label>
                <input
                  type="number"
                  required
                  min="0.01"
                  max={payingInvoice.balanceDue}
                  step="0.01"
                  value={paymentForm.amount}
                  onChange={(e) =>
                    setPaymentForm((prev) => ({ ...prev, amount: e.target.value }))
                  }
                  className={inputClass}
                />
                <p className="mt-1 text-xs text-slate-500">
                  Amount cannot exceed the outstanding invoice balance.
                </p>
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-300">Payment mode</label>
                <select
                  required
                  value={paymentForm.mode}
                  onChange={(e) =>
                    setPaymentForm((prev) => ({
                      ...prev,
                      mode: e.target.value as PaymentModeValue,
                    }))
                  }
                  className={inputClass}
                >
                  {PAYMENT_MODES.map((mode) => (
                    <option key={mode} value={mode}>
                      {paymentModeLabel(mode)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-300">Account name</label>
                <select
                  required
                  value={paymentForm.accountName}
                  onChange={(e) =>
                    setPaymentForm((prev) => ({
                      ...prev,
                      accountName: e.target.value as PaymentAccountNameValue,
                    }))
                  }
                  className={inputClass}
                >
                  {PAYMENT_ACCOUNT_NAMES.map((accountName) => (
                    <option key={accountName} value={accountName}>
                      {paymentAccountNameLabel(accountName)}
                    </option>
                  ))}
                </select>
              </div>
              <DatePickerField
                label="Paid on"
                value={paymentForm.paidAt}
                allowPastDates
                onChange={(paidAt) => setPaymentForm((prev) => ({ ...prev, paidAt }))}
              />
              <div>
                <label className="mb-1 block text-sm text-slate-300">Notes</label>
                <input
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm((prev) => ({ ...prev, notes: e.target.value }))}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="mt-4 flex gap-3">
              <button type="submit" className={buttonPrimaryClass} disabled={submitting}>
                {submitting ? "Saving payment..." : "Save payment"}
              </button>
              <button
                type="button"
                className={buttonSecondaryClass}
                onClick={() => {
                  setPayingInvoiceId(null);
                  setPaymentForm(emptyPaymentForm);
                }}
              >
                Cancel
              </button>
            </div>
          </fieldset>
        </form>
      ) : null}

      <div className="mt-8 overflow-x-auto rounded-2xl border border-slate-800">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-900 text-left text-slate-400">
            <tr>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Invoice #</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Party</th>
              <th className="px-4 py-3">Invoice value</th>
              <th className="px-4 py-3">Paid</th>
              <th className="px-4 py-3">Balance</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-slate-400">
                  Loading...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-slate-400">
                  {showAll
                    ? "No GST invoices yet."
                    : "No pending or partially paid GST invoices."}
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const isViewing = viewingInvoiceId === row.id;
                return (
                  <Fragment key={row.id}>
                    <tr className="border-t border-slate-800">
                      <td className="px-4 py-3 whitespace-nowrap">
                        {invoiceTypeLabel(row.invoiceType)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">{row.invoiceNumber}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {formatDate(row.invoiceDate)}
                      </td>
                      <td className="px-4 py-3">{partyLabel(row)}</td>
                      <td className="px-4 py-3">{formatMoney(row.invoiceAmount)}</td>
                      <td className="px-4 py-3">{formatMoney(row.paidTotal)}</td>
                      <td className="px-4 py-3">{formatMoney(row.balanceDue)}</td>
                      <td className={`px-4 py-3 ${statusClass(row.paymentStatus)}`}>
                        {paymentStatusLabel(row.paymentStatus)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          {grants.canCreate && row.balanceDue > 0 ? (
                            <button
                              type="button"
                              className={buttonSecondaryClass}
                              disabled={submitting || deletingPaymentId !== null}
                              onClick={() => openPaymentForm(row)}
                            >
                              Pay
                            </button>
                          ) : null}
                          {row.payments.length > 0 ? (
                            <button
                              type="button"
                              className={buttonSecondaryClass}
                              onClick={() =>
                                setViewingInvoiceId(isViewing ? null : row.id)
                              }
                            >
                              {isViewing ? "Hide" : "History"}
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                    {isViewing ? (
                      <tr className="border-t border-slate-800 bg-slate-950/40">
                        <td colSpan={9} className="px-4 py-4">
                          <div className="overflow-x-auto rounded-xl border border-slate-800">
                            <table className="min-w-full text-sm">
                              <thead className="bg-slate-900 text-left text-slate-400">
                                <tr>
                                  <th className="px-3 py-2">Date</th>
                                  <th className="px-3 py-2">Mode</th>
                                  <th className="px-3 py-2">Account</th>
                                  <th className="px-3 py-2">Amount</th>
                                  <th className="px-3 py-2">To invoice</th>
                                  <th className="px-3 py-2">Notes</th>
                                  {grants.canDelete ? (
                                    <th className="px-3 py-2">Actions</th>
                                  ) : null}
                                </tr>
                              </thead>
                              <tbody>
                                {row.payments.map((payment) => (
                                  <tr key={payment.id} className="border-t border-slate-800">
                                    <td className="px-3 py-2">{formatDate(payment.paidAt)}</td>
                                    <td className="px-3 py-2">{paymentModeLabel(payment.mode)}</td>
                                    <td className="px-3 py-2">
                                      {paymentAccountNameLabel(payment.accountName ?? "NONE")}
                                    </td>
                                    <td className="px-3 py-2">
                                      {formatMoney(toMoney(payment.amount))}
                                    </td>
                                    <td className="px-3 py-2">
                                      {formatMoney(toMoney(payment.appliedToInvoice))}
                                    </td>
                                    <td className="px-3 py-2">{payment.notes ?? "—"}</td>
                                    {grants.canDelete ? (
                                      <td className="px-3 py-2">
                                        <button
                                          type="button"
                                          className={buttonSecondaryClass}
                                          disabled={
                                            deletingPaymentId === payment.id || submitting
                                          }
                                          onClick={() => void handleDeletePayment(payment.id)}
                                        >
                                          {deletingPaymentId === payment.id
                                            ? "Deleting..."
                                            : "Delete"}
                                        </button>
                                      </td>
                                    ) : null}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
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
    </div>
  );
}
