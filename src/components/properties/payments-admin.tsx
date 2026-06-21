"use client";

import { FormEvent, Fragment, useCallback, useEffect, useMemo, useState } from "react";
import {
  buttonPrimaryClass,
  buttonSecondaryClass,
  inputClass,
} from "@/components/admin/ui";
import { DatePickerField } from "@/components/properties/date-picker-field";
import { PaymentBreakdownPanel } from "@/components/properties/payment-breakdown-panel";
import {
  formatMoney,
  paymentModeLabel,
  paymentStatusLabel,
  type PaymentModeValue,
} from "@/lib/properties/payment-calculations";
import type { ResourceGrants } from "@/lib/permissions/grants";
import type { calcRentBreakdown } from "@/lib/properties/rent-calculations";

type RentBreakdown = ReturnType<typeof calcRentBreakdown>;

type PaymentRow = {
  id: string;
  amount: string;
  mode: PaymentModeValue;
  appliedToRent: string;
  toAdvance: string;
  paidAt: string;
  notes?: string | null;
};

type RentPaymentRow = {
  id: string;
  startDate: string;
  endDate?: string | null;
  dueDate: string;
  rent: string;
  totalRent?: string | null;
  priorBalance: string;
  balanceCarriedForward: boolean;
  paymentStatus: "PENDING" | "PARTIAL" | "PAID";
  billAmount: number;
  amountDue: number;
  paidTotal: number;
  balanceDue: number;
  rentBreakdown: RentBreakdown | null;
  tenant: {
    id: string;
    firstName: string;
    lastName: string;
    advanceBalance: string;
  };
  unit: { id: string; unitNumber: string };
  payments: PaymentRow[];
};

const PAYMENT_MODES: PaymentModeValue[] = ["CASH", "CHEQUE", "NEFT", "UPI", "OTHER"];

const emptyPaymentForm = {
  amount: "",
  mode: "CASH" as PaymentModeValue,
  paidAt: "",
  notes: "",
};

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return value.slice(0, 10);
}

function tenantName(tenant: { firstName: string; lastName: string }) {
  return `${tenant.firstName} ${tenant.lastName}`;
}

function statusClass(status: RentPaymentRow["paymentStatus"]) {
  if (status === "PAID") return "text-emerald-300";
  if (status === "PARTIAL") return "text-amber-300";
  return "text-slate-300";
}

export function PaymentsAdmin({ grants }: { grants: ResourceGrants }) {
  const [rows, setRows] = useState<RentPaymentRow[]>([]);
  const [tenants, setTenants] = useState<Array<{ id: string; firstName: string; lastName: string }>>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterTenantId, setFilterTenantId] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [payingRentId, setPayingRentId] = useState<string | null>(null);
  const [viewingRentId, setViewingRentId] = useState<string | null>(null);
  const [showPaymentBreakdown, setShowPaymentBreakdown] = useState(false);
  const [paymentForm, setPaymentForm] = useState(emptyPaymentForm);

  const payingRent = useMemo(
    () => rows.find((row) => row.id === payingRentId) ?? null,
    [rows, payingRentId],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterTenantId) params.set("tenantId", filterTenantId);
      if (showAll) params.set("status", "all");

      const [rentsRes, tenantsRes] = await Promise.all([
        fetch(`/api/payments/rents?${params.toString()}`),
        fetch("/api/tenants"),
      ]);
      if (!rentsRes.ok) throw new Error((await rentsRes.json()).error);
      setRows(await rentsRes.json());
      if (tenantsRes.ok) setTenants(await tenantsRes.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [filterTenantId, showAll]);

  useEffect(() => {
    void load();
  }, [load]);

  function openPaymentForm(row: RentPaymentRow) {
    setPayingRentId(row.id);
    setViewingRentId(null);
    setShowPaymentBreakdown(false);
    setPaymentForm({
      ...emptyPaymentForm,
      amount: row.balanceDue > 0 ? String(row.balanceDue) : "",
      paidAt: new Date().toISOString().slice(0, 10),
    });
  }

  async function handlePaymentSubmit(event: FormEvent) {
    event.preventDefault();
    if (!payingRentId) return;
    setError(null);

    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rentId: payingRentId,
          amount: Number(paymentForm.amount),
          mode: paymentForm.mode,
          paidAt: paymentForm.paidAt || undefined,
          notes: paymentForm.notes || undefined,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setPayingRentId(null);
      setShowPaymentBreakdown(false);
      setPaymentForm(emptyPaymentForm);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed");
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-semibold">Payments</h1>
      <p className="mt-2 text-slate-400">
        Record rent payments from bills generated in the Rent tab. Partial payments keep a
        balance until fully paid; overpayments go to tenant advance.
      </p>

      {error ? (
        <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm text-slate-300">Filter by tenant</label>
          <select
            value={filterTenantId}
            onChange={(e) => setFilterTenantId(e.target.value)}
            className={inputClass}
          >
            <option value="">All tenants</option>
            {tenants.map((tenant) => (
              <option key={tenant.id} value={tenant.id}>
                {tenantName(tenant)}
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
            Show paid bills too
          </label>
        </div>
      </div>

      {payingRent && grants.canCreate ? (
        <form
          onSubmit={handlePaymentSubmit}
          className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6"
        >
          <h2 className="text-lg font-medium">Record payment</h2>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-400">
              {tenantName(payingRent.tenant)} · Unit {payingRent.unit.unitNumber} · Balance{" "}
              {formatMoney(payingRent.balanceDue)}
              {toMoney(payingRent.tenant.advanceBalance) > 0
                ? ` · Advance ${formatMoney(toMoney(payingRent.tenant.advanceBalance))}`
                : ""}
            </p>
            <button
              type="button"
              className={buttonSecondaryClass}
              onClick={() => setShowPaymentBreakdown((open) => !open)}
            >
              {showPaymentBreakdown ? "Hide breakdown" : "View breakdown"}
            </button>
          </div>

          {showPaymentBreakdown ? (
            <PaymentBreakdownPanel
              rentBreakdown={payingRent.rentBreakdown}
              priorBalance={toMoney(payingRent.priorBalance)}
              advanceBalance={toMoney(payingRent.tenant.advanceBalance)}
              paidTotal={payingRent.paidTotal}
              amountDue={payingRent.amountDue}
              balanceDue={payingRent.balanceDue}
            />
          ) : null}

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-slate-300">Payment amount</label>
              <input
                type="number"
                required
                min="0.01"
                step="0.01"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm((prev) => ({ ...prev, amount: e.target.value }))}
                className={inputClass}
              />
              <p className="mt-1 text-xs text-slate-500">
                If amount exceeds balance, the extra is added to tenant advance.
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
            <button type="submit" className={buttonPrimaryClass}>
              Save payment
            </button>
            <button
              type="button"
              className={buttonSecondaryClass}
              onClick={() => {
                setPayingRentId(null);
                setShowPaymentBreakdown(false);
                setPaymentForm(emptyPaymentForm);
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      <div className="mt-8 overflow-x-auto rounded-2xl border border-slate-800">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-900 text-left text-slate-400">
            <tr>
              <th className="px-4 py-3">Tenant</th>
              <th className="px-4 py-3">Unit</th>
              <th className="px-4 py-3">Period</th>
              <th className="px-4 py-3">Bill</th>
              <th className="px-4 py-3">Prior bal.</th>
              <th className="px-4 py-3">Due</th>
              <th className="px-4 py-3">Paid</th>
              <th className="px-4 py-3">Balance</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Advance</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={11} className="px-4 py-8 text-slate-400">
                  Loading...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-4 py-8 text-slate-400">
                  {showAll ? "No rent bills yet." : "No pending or partially paid rent bills."}
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const isViewing = viewingRentId === row.id;
                return (
                  <Fragment key={row.id}>
                    <tr className="border-t border-slate-800">
                      <td className="px-4 py-3">{tenantName(row.tenant)}</td>
                      <td className="px-4 py-3">{row.unit.unitNumber}</td>
                      <td className="px-4 py-3">
                        {formatDate(row.startDate)} – {formatDate(row.endDate)}
                      </td>
                      <td className="px-4 py-3">{formatMoney(row.billAmount)}</td>
                      <td className="px-4 py-3">{formatMoney(toMoney(row.priorBalance))}</td>
                      <td className="px-4 py-3">{formatMoney(row.amountDue)}</td>
                      <td className="px-4 py-3">{formatMoney(row.paidTotal)}</td>
                      <td className="px-4 py-3">{formatMoney(row.balanceDue)}</td>
                      <td className={`px-4 py-3 ${statusClass(row.paymentStatus)}`}>
                        {paymentStatusLabel(row.paymentStatus)}
                      </td>
                      <td className="px-4 py-3">
                        {formatMoney(toMoney(row.tenant.advanceBalance))}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          {grants.canCreate && row.balanceDue > 0 ? (
                            <button
                              type="button"
                              className={buttonSecondaryClass}
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
                                setViewingRentId(isViewing ? null : row.id)
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
                        <td colSpan={11} className="px-4 py-4">
                          <div className="overflow-x-auto rounded-xl border border-slate-800">
                            <table className="min-w-full text-sm">
                              <thead className="bg-slate-900 text-left text-slate-400">
                                <tr>
                                  <th className="px-3 py-2">Date</th>
                                  <th className="px-3 py-2">Mode</th>
                                  <th className="px-3 py-2">Amount</th>
                                  <th className="px-3 py-2">To rent</th>
                                  <th className="px-3 py-2">To advance</th>
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
                                    <td className="px-3 py-2">{formatMoney(toMoney(payment.amount))}</td>
                                    <td className="px-3 py-2">
                                      {formatMoney(toMoney(payment.appliedToRent))}
                                    </td>
                                    <td className="px-3 py-2">
                                      {formatMoney(toMoney(payment.toAdvance))}
                                    </td>
                                    <td className="px-3 py-2">{payment.notes ?? "—"}</td>
                                    {grants.canDelete ? (
                                      <td className="px-3 py-2">
                                        <button
                                          type="button"
                                          className={buttonSecondaryClass}
                                          onClick={async () => {
                                            if (!confirm("Delete this payment?")) return;
                                            const res = await fetch(
                                              `/api/payments/${payment.id}`,
                                              { method: "DELETE" },
                                            );
                                            if (!res.ok) {
                                              setError((await res.json()).error);
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

function toMoney(value: string | number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
