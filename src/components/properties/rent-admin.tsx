"use client";

import { FormEvent, Fragment, useEffect, useMemo, useState } from "react";
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
  breakdownFromRentRow,
  calcDefaultRentPeriodStart,
  calcDueDateFromPeriodStart,
  calcMonthlyPeriodEnd,
  calcRentBreakdown,
  isRentDueForReminder,
  resolveUtilityBaselines,
  toNumber,
} from "@/lib/properties/rent-calculations";
import { RentBreakdownPanel } from "@/components/properties/rent-breakdown-panel";
import type { BuildingUtilityRateSnapshot } from "@/lib/properties/building-utility-types";
import { readApiError, readApiJson } from "@/lib/api/parse-response";
import type { ResourceGrants } from "@/lib/permissions/grants";

type TenantDetail = {
  id: string;
  firstName: string;
  lastName: string;
  unit?: { id: string; unitNumber: string } | null;
};

type AssignmentDetail = {
  id: string;
  tenantId: string;
  unitId: string;
  monthlyRent?: string | null;
  leaseFrom?: string | null;
  leaseTo?: string | null;
  monthlyDueDay?: number | null;
  initialGasUnits?: string | null;
  initialElectricityUnits?: string | null;
  isActive: boolean;
  unit: { id: string; unitNumber: string };
};

type RentRow = {
  id: string;
  tenantAssignmentId: string;
  startDate: string;
  endDate?: string | null;
  isExitRent?: boolean;
  rent: string;
  totalRent?: string | null;
  electricityUnits?: string | null;
  gasUnits?: string | null;
  maintenance?: string | null;
  misc?: string | null;
  dueDate: string;
  paymentStatus: "PENDING" | "PARTIAL" | "PAID";
  utilityBaseline?: { electricityUnits: number; gasUnits: number } | null;
  utilityRateSnapshot?: BuildingUtilityRateSnapshot | null;
  tenant: { id: string; firstName: string; lastName: string };
  tenantAssignment: {
    id: string;
    monthlyRent?: string | null;
    leaseFrom?: string | null;
    leaseTo?: string | null;
    monthlyDueDay?: number | null;
    isActive: boolean;
  };
  unit: { id: string; unitNumber: string };
};

const emptyMonthlyForm = {
  tenantId: "",
  startDate: "",
  endDate: "",
  electricityUnits: "",
  gasUnits: "",
  maintenance: "",
  misc: "",
};

const RENT_LIST_PAGE_SIZE = 20;
const RENT_LIST_COL_SPAN = 11;

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return value.slice(0, 10);
}

function tenantName(tenant: { firstName: string; lastName: string }) {
  return `${tenant.firstName} ${tenant.lastName}`;
}

function isRentUnpaid(paymentStatus: RentRow["paymentStatus"]) {
  return paymentStatus !== "PAID";
}

function canSendRentReminder(row: Pick<RentRow, "dueDate" | "paymentStatus">) {
  return isRentUnpaid(row.paymentStatus) && isRentDueForReminder(row.dueDate);
}

type RentReminderPreview = {
  tenantName: string;
  tenantEmail: string | null;
  tenantPhone: string | null;
  emailEnabled: boolean;
  whatsappEnabled: boolean;
  messages: {
    emailSubject: string;
    emailText: string;
    whatsappText: string;
    whatsappIncludesImage: boolean;
  };
};

function formatReminderSendResult(result: {
  email: { sent: boolean; reason?: string; email?: string };
  whatsapp: { sent: boolean; reason?: string; phone?: string };
}) {
  const parts: string[] = [];
  if (result.email.sent) {
    parts.push(`email to ${result.email.email}`);
  } else if (result.email.reason) {
    parts.push(`email not sent (${result.email.reason})`);
  }
  if (result.whatsapp.sent) {
    parts.push(`WhatsApp to ${result.whatsapp.phone}`);
  } else if (result.whatsapp.reason === "queued") {
    parts.push("WhatsApp queued until connected");
  } else if (result.whatsapp.reason) {
    parts.push(`WhatsApp not sent (${result.whatsapp.reason})`);
  }
  if (parts.length === 0) return "Reminder request completed.";
  return `Sent: ${parts.join("; ")}.`;
}

function ReminderMessagePanel({
  preview,
  loading,
  sendStatus,
  sending,
  onSend,
  onClose,
}: {
  preview: RentReminderPreview | null;
  loading: boolean;
  sendStatus: string | null;
  sending: boolean;
  onSend: () => void;
  onClose: () => void;
}) {
  if (loading) {
    return <p className="text-sm text-slate-400">Loading reminder messages...</p>;
  }
  if (!preview) return null;

  const messageBoxClass =
    "mt-2 w-full min-h-[12rem] resize-y rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-xs text-slate-200 whitespace-pre-wrap";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-white">Payment reminder</h3>
          <p className="mt-1 text-sm text-slate-400">{preview.tenantName}</p>
        </div>
        <button type="button" className={buttonSecondaryClass} onClick={onClose}>
          Close
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <h4 className="text-sm font-medium text-slate-200">Email message</h4>
          <p className="mt-1 text-xs text-slate-500">
            {preview.emailEnabled
              ? preview.tenantEmail
                ? `To: ${preview.tenantEmail}`
                : "Tenant has no email on file"
              : "Email notifications are disabled in settings"}
          </p>
          <p className="mt-3 text-xs font-medium text-slate-400">Subject</p>
          <p className="mt-1 text-sm text-slate-200">{preview.messages.emailSubject}</p>
          <p className="mt-3 text-xs font-medium text-slate-400">Body</p>
          <textarea
            readOnly
            value={preview.messages.emailText}
            className={messageBoxClass}
            rows={14}
          />
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <h4 className="text-sm font-medium text-slate-200">WhatsApp message</h4>
          <p className="mt-1 text-xs text-slate-500">
            {preview.whatsappEnabled
              ? preview.tenantPhone
                ? `To: ${preview.tenantPhone}`
                : "Tenant has no phone on file"
              : "WhatsApp notifications are disabled in settings"}
          </p>
          {preview.messages.whatsappIncludesImage ? (
            <p className="mt-2 text-xs text-slate-500">
              Rent invoice image is attached with this caption.
            </p>
          ) : null}
          <p className="mt-3 text-xs font-medium text-slate-400">Caption</p>
          <textarea
            readOnly
            value={preview.messages.whatsappText}
            className={messageBoxClass}
            rows={14}
          />
        </section>
      </div>

      {sendStatus ? (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {sendStatus}
        </p>
      ) : null}

      <div>
        <button
          type="button"
          className={buttonPrimaryClass}
          disabled={sending || (!preview.emailEnabled && !preview.whatsappEnabled)}
          onClick={onSend}
        >
          {sending ? "Sending reminder..." : "Send reminder"}
        </button>
      </div>
    </div>
  );
}

function baselineSourceLabel(source: "stored" | "assignment" | "prior_bill") {
  if (source === "stored") return "saved with this bill";
  if (source === "assignment") return "from assignment initial readings";
  return "from previous month bill";
}

function findLatestRentForTenant(
  rents: RentRow[],
  tenantId: string,
  unitId?: string,
) {
  const forTenant = rents.filter((row) => row.tenant.id === tenantId);
  const forUnit = unitId ? forTenant.filter((row) => row.unit.id === unitId) : forTenant;
  const pool = forUnit.length > 0 ? forUnit : forTenant;
  return pool.sort((a, b) => b.startDate.localeCompare(a.startDate))[0];
}

function buildMonthlyFormForTenant(
  tenantId: string,
  tenants: TenantDetail[],
  assignments: AssignmentDetail[],
  rents: RentRow[],
) {
  const tenant = tenants.find((row) => row.id === tenantId);
  const activeAssignment = assignments.find(
    (row) => row.tenantId === tenantId && row.isActive,
  );
  const unitId = activeAssignment?.unit.id ?? tenant?.unit?.id ?? "";
  const latestRent = findLatestRentForTenant(rents, tenantId, unitId);
  const startDate = calcDefaultRentPeriodStart({
    latestRent,
    leaseFrom: activeAssignment?.leaseFrom ?? null,
  });

  return {
    ...emptyMonthlyForm,
    tenantId,
    startDate,
    endDate: startDate ? calcMonthlyPeriodEnd(startDate) : "",
  };
}

export function RentAdmin({ grants }: { grants: ResourceGrants }) {
  const { data: tenants = [], loading: tenantsLoading } =
    useCachedFetch<TenantDetail[]>("/api/tenants");
  const { data: assignments = [], loading: assignmentsLoading } =
    useCachedFetch<AssignmentDetail[]>("/api/tenant-assignments");
  const {
    items: allRents,
    loading: rentsLoading,
    error,
    submitting,
    deletingId,
    setError,
    save,
    remove,
  } = useCachedList<RentRow>("/api/rents");

  const loading = tenantsLoading || assignmentsLoading || rentsLoading;
  const [editingRent, setEditingRent] = useState<RentRow | null>(null);
  const [monthlyForm, setMonthlyForm] = useState(emptyMonthlyForm);
  const [filterTenantId, setFilterTenantId] = useState("");
  const [rentListPage, setRentListPage] = useState(1);
  const [viewingRentId, setViewingRentId] = useState<string | null>(null);
  const [reminderRentId, setReminderRentId] = useState<string | null>(null);
  const [reminderPreview, setReminderPreview] = useState<RentReminderPreview | null>(null);
  const [loadingReminderPreview, setLoadingReminderPreview] = useState(false);
  const [sendingReminderId, setSendingReminderId] = useState<string | null>(null);
  const [reminderSendStatus, setReminderSendStatus] = useState<string | null>(null);
  const [utilityRates, setUtilityRates] = useState<BuildingUtilityRateSnapshot | null>(null);
  const [utilityRateError, setUtilityRateError] = useState<string | null>(null);

  const activeUnitId = useMemo(() => {
    const tenant = tenants.find((row) => row.id === monthlyForm.tenantId);
    if (!tenant) return "";
    const activeAssignment = assignments.find(
      (row) => row.tenantId === tenant.id && row.isActive,
    );
    return activeAssignment?.unit.id ?? tenant.unit?.id ?? "";
  }, [tenants, assignments, monthlyForm.tenantId]);

  useEffect(() => {
    if (!activeUnitId || !monthlyForm.startDate) {
      setUtilityRates(editingRent?.utilityRateSnapshot ?? null);
      setUtilityRateError(null);
      return;
    }

    const controller = new AbortController();
    void (async () => {
      try {
        const res = await fetch(
          `/api/buildings/utility-rates/active?unitId=${activeUnitId}&date=${monthlyForm.startDate}`,
          { signal: controller.signal },
        );
        if (!res.ok) throw new Error(await readApiError(res));
        setUtilityRates(await readApiJson<BuildingUtilityRateSnapshot>(res));
        setUtilityRateError(null);
      } catch (err) {
        if (controller.signal.aborted) return;
        setUtilityRates(null);
        setUtilityRateError(err instanceof Error ? err.message : "Utility rates unavailable");
      }
    })();

    return () => controller.abort();
  }, [activeUnitId, monthlyForm.startDate, editingRent?.utilityRateSnapshot]);

  async function handleToggleReminder(row: RentRow) {
    if (reminderRentId === row.id) {
      setReminderRentId(null);
      setReminderPreview(null);
      setReminderSendStatus(null);
      return;
    }

    setReminderRentId(row.id);
    setViewingRentId(null);
    setReminderPreview(null);
    setReminderSendStatus(null);
    setError(null);
    setLoadingReminderPreview(true);

    try {
      const res = await fetch(`/api/rents/${row.id}/reminder`);
      if (!res.ok) throw new Error(await readApiError(res));
      setReminderPreview((await res.json()) as RentReminderPreview);
    } catch (err) {
      setReminderRentId(null);
      setError(err instanceof Error ? err.message : "Failed to load reminder preview");
    } finally {
      setLoadingReminderPreview(false);
    }
  }

  function closeReminderPanel() {
    setReminderRentId(null);
    setReminderPreview(null);
    setReminderSendStatus(null);
  }

  async function handleSendReminder(rentId: string) {
    setError(null);
    setReminderSendStatus(null);
    setSendingReminderId(rentId);
    try {
      const res = await fetch(`/api/rents/${rentId}/reminder`, { method: "POST" });
      if (!res.ok) throw new Error(await readApiError(res));
      const result = (await res.json()) as {
        email: { sent: boolean; reason?: string; email?: string };
        whatsapp: { sent: boolean; reason?: string; phone?: string };
        messages: RentReminderPreview["messages"];
      };
      if (result.messages) {
        setReminderPreview((current) =>
          current
            ? { ...current, messages: result.messages }
            : current,
        );
      }
      setReminderSendStatus(formatReminderSendResult(result));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send reminder");
    } finally {
      setSendingReminderId(null);
    }
  }

  const sortedDisplayedRents = useMemo(() => {
    const filtered = filterTenantId
      ? allRents.filter((row) => row.tenant.id === filterTenantId)
      : allRents;

    return [...filtered].sort((a, b) => {
      const byStartDate = b.startDate.localeCompare(a.startDate);
      if (byStartDate !== 0) return byStartDate;
      return b.id.localeCompare(a.id);
    });
  }, [allRents, filterTenantId]);

  const rentListTotalPages = Math.max(
    1,
    Math.ceil(sortedDisplayedRents.length / RENT_LIST_PAGE_SIZE),
  );

  const paginatedRents = useMemo(() => {
    const safePage = Math.min(rentListPage, rentListTotalPages);
    const start = (safePage - 1) * RENT_LIST_PAGE_SIZE;
    return sortedDisplayedRents.slice(start, start + RENT_LIST_PAGE_SIZE);
  }, [sortedDisplayedRents, rentListPage, rentListTotalPages]);

  const monthlyContext = useMemo(() => {
    const tenant = tenants.find((row) => row.id === monthlyForm.tenantId);
    if (!tenant) return null;

    const activeAssignment = assignments.find(
      (row) => row.tenantId === tenant.id && row.isActive,
    );

    const billAssignment =
      editingRent != null
        ? (assignments.find((row) => row.id === editingRent.tenantAssignmentId) ?? {
            id: editingRent.tenantAssignmentId,
            monthlyRent: editingRent.rent,
            monthlyDueDay: editingRent.tenantAssignment.monthlyDueDay,
            leaseTo: editingRent.tenantAssignment.leaseTo,
            initialElectricityUnits: null,
            initialGasUnits: null,
            unit: editingRent.unit,
            isActive: editingRent.tenantAssignment.isActive,
          })
        : activeAssignment;

    const monthlyRent =
      editingRent != null
        ? toNumber(editingRent.rent)
        : billAssignment?.monthlyRent != null
          ? toNumber(billAssignment.monthlyRent)
          : null;

    const monthlyBills = allRents.filter((row) => row.tenant.id === tenant.id);

    const baselineResult = resolveUtilityBaselines({
      assignment: billAssignment ?? {
        initialElectricityUnits: 0,
        initialGasUnits: 0,
      },
      monthlyBills: monthlyBills.map((row) => ({
        id: row.id,
        startDate: row.startDate,
        electricityUnits: row.electricityUnits,
        gasUnits: row.gasUnits,
        utilityBaseline: row.utilityBaseline,
      })),
      savedBaseline: editingRent?.utilityBaseline,
      periodStartDate: editingRent
        ? formatDate(editingRent.startDate)
        : monthlyForm.startDate || undefined,
      excludeRentId: editingRent?.id,
    });

    const dueDate =
      billAssignment?.monthlyDueDay != null && monthlyForm.startDate
        ? calcDueDateFromPeriodStart(
            monthlyForm.startDate,
            billAssignment.monthlyDueDay,
          )
        : "";

    const prorataPeriod =
      editingRent?.isExitRent && monthlyForm.startDate && monthlyForm.endDate
        ? {
            startDateIso: monthlyForm.startDate,
            endDateIso: monthlyForm.endDate,
          }
        : undefined;

    const breakdown =
      monthlyRent != null && utilityRates
        ? calcRentBreakdown({
            monthlyRent,
            electricityUnits: toNumber(monthlyForm.electricityUnits),
            gasUnits: toNumber(monthlyForm.gasUnits),
            baselineElectricityUnits: baselineResult.electricityUnits,
            baselineGasUnits: baselineResult.gasUnits,
            maintenance: toNumber(monthlyForm.maintenance),
            misc: toNumber(monthlyForm.misc),
            rates: utilityRates,
            prorataPeriod,
          })
        : null;

    return {
      tenant,
      activeAssignment: billAssignment,
      monthlyRent,
      baselineElectricityUnits: baselineResult.electricityUnits,
      baselineGasUnits: baselineResult.gasUnits,
      baselineSource: baselineResult.source,
      dueDate,
      breakdown,
      utilityRates,
      totalRent: breakdown?.total ?? null,
      unitId: billAssignment?.unit.id ?? tenant.unit?.id ?? "",
      unitNumber: billAssignment?.unit.unitNumber ?? tenant.unit?.unitNumber ?? "",
      isExitRent: editingRent?.isExitRent ?? false,
    };
  }, [tenants, assignments, allRents, monthlyForm, editingRent, utilityRates]);

  const canRecordMonthly =
    monthlyContext != null &&
    monthlyContext.activeAssignment != null &&
    monthlyContext.monthlyRent != null &&
    monthlyContext.unitId !== "" &&
    monthlyContext.dueDate !== "" &&
    monthlyForm.startDate !== "" &&
    (!monthlyContext.isExitRent || monthlyForm.endDate !== "") &&
    utilityRates != null &&
    !utilityRateError;

  async function handleMonthlySubmit(event: FormEvent) {
    event.preventDefault();
    if (!monthlyContext || !canRecordMonthly || !monthlyContext.activeAssignment) return;
    if (submitting) return;

    setError(null);
    const payload = {
      tenantId: monthlyForm.tenantId,
      unitId: monthlyContext.unitId,
      tenantAssignmentId: monthlyContext.activeAssignment.id,
      startDate: monthlyForm.startDate,
      endDate: monthlyForm.endDate || undefined,
      rent: monthlyContext.monthlyRent,
      totalRent: monthlyContext.totalRent,
      electricityUnits: monthlyForm.electricityUnits
        ? Number(monthlyForm.electricityUnits)
        : undefined,
      gasUnits: monthlyForm.gasUnits ? Number(monthlyForm.gasUnits) : undefined,
      maintenance: monthlyForm.maintenance ? Number(monthlyForm.maintenance) : undefined,
      misc: monthlyForm.misc ? Number(monthlyForm.misc) : undefined,
      dueDate: monthlyContext.dueDate,
      utilityBaseline: {
        electricityUnits: monthlyContext.baselineElectricityUnits,
        gasUnits: monthlyContext.baselineGasUnits,
      },
    };

    try {
      await save({
        url: editingRent ? `/api/rents/${editingRent.id}` : "/api/rents",
        method: editingRent ? "PATCH" : "POST",
        body: payload,
      });
      setEditingRent(null);
      setMonthlyForm(emptyMonthlyForm);
    } catch {
      // Error message is set by the cache hook.
    }
  }

  const editingMonthlyStartDate = editingRent
    ? formatDate(editingRent.startDate)
    : undefined;

  return (
    <div>
      <h1 className="text-3xl font-semibold">Rent</h1>
      <p className="mt-2 text-slate-400">
        Record monthly rent bills using the tenant&apos;s active assignment. Add a new
        assignment on the Tenants tab when lease terms change or a lease expires.
      </p>

      {error ? (
        <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      <div className="mt-6">
        <label className="mb-1 block text-sm text-slate-300">Filter by tenant</label>
        <select
          value={filterTenantId}
          onChange={(e) => {
            setFilterTenantId(e.target.value);
            setRentListPage(1);
          }}
          className={inputClass}
        >
          <option value="">All tenants</option>
          {tenants.map((t) => (
            <option key={t.id} value={t.id}>
              {tenantName(t)}
            </option>
          ))}
        </select>
      </div>

      {(grants.canCreate || grants.canUpdate) ? (
        <form
          onSubmit={handleMonthlySubmit}
          className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6"
        >
          <h2 className="text-lg font-medium">
            {editingRent ? "Edit monthly rent" : "Record monthly rent"}
          </h2>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-slate-300">Tenant name</label>
              <select
                required
                disabled={!!editingRent}
                value={monthlyForm.tenantId}
                onChange={(e) => {
                  const tenantId = e.target.value;
                  if (!tenantId) {
                    setMonthlyForm(emptyMonthlyForm);
                    return;
                  }
                  setMonthlyForm(
                    buildMonthlyFormForTenant(
                      tenantId,
                      tenants,
                      assignments,
                      allRents,
                    ),
                  );
                }}
                className={inputClass}
              >
                <option value="">Select tenant...</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {tenantName(t)}
                  </option>
                ))}
              </select>
            </div>

            {monthlyContext ? (
              <>
                <div>
                  <label className="mb-1 block text-sm text-slate-300">Unit</label>
                  <input
                    readOnly
                    value={monthlyContext.unitNumber || "No active assignment unit"}
                    className={`${inputClass} opacity-80`}
                  />
                </div>

                {!monthlyContext.activeAssignment ? (
                  <p className="md:col-span-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                    No active assignment. Add a new rent assignment on the Tenants tab to
                    continue after lease expiry or to change unit/rent terms.
                  </p>
                ) : null}

                {monthlyContext.activeAssignment && monthlyContext.monthlyRent == null ? (
                  <p className="md:col-span-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                    Active assignment has no monthly rent. Update the assignment on the
                    Tenants tab.
                  </p>
                ) : null}

                {monthlyContext.activeAssignment &&
                monthlyContext.monthlyRent != null &&
                monthlyContext.unitId === "" ? (
                  <p className="md:col-span-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                    Active assignment has no unit. Add an assignment with a unit on the
                    Tenants tab.
                  </p>
                ) : null}

                {monthlyContext.activeAssignment &&
                monthlyContext.monthlyRent != null &&
                monthlyContext.dueDate === "" ? (
                  <p className="md:col-span-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                    Set the due days (added to the From date) on the active assignment to
                    calculate the due date.
                  </p>
                ) : null}

                {monthlyContext.activeAssignment?.leaseTo ? (
                  <p className="md:col-span-2 text-sm text-slate-500">
                    Active assignment lease ends {formatDate(monthlyContext.activeAssignment.leaseTo)}.
                    You can still record rent or add a new assignment on the Tenants tab.
                  </p>
                ) : null}

                <DatePickerField
                  label="From"
                  required
                  value={monthlyForm.startDate}
                  allowPastDates
                  allowPastValue={editingMonthlyStartDate}
                  onChange={(startDate) =>
                    setMonthlyForm({
                      ...monthlyForm,
                      startDate,
                      endDate: editingRent?.isExitRent
                        ? monthlyForm.endDate
                        : calcMonthlyPeriodEnd(startDate),
                    })
                  }
                />
                {monthlyContext.isExitRent ? (
                  <DatePickerField
                    label="To (exit date)"
                    required
                    value={monthlyForm.endDate}
                    allowPastDates
                    allowPastValue={
                      editingRent?.endDate ? formatDate(editingRent.endDate) : undefined
                    }
                    onChange={(endDate) => setMonthlyForm({ ...monthlyForm, endDate })}
                  />
                ) : (
                  <div>
                    <label className="mb-1 block text-sm text-slate-300">To</label>
                    <input
                      readOnly
                      value={monthlyForm.endDate || "Select From date"}
                      className={`${inputClass} opacity-80`}
                    />
                  </div>
                )}

                <div>
                  <label className="mb-1 block text-sm text-slate-300">Due date</label>
                  <input
                    readOnly
                    value={monthlyContext.dueDate || "Set due days on assignment"}
                    className={`${inputClass} opacity-80`}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm text-slate-300">
                    Electricity units (current)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={monthlyForm.electricityUnits}
                    onChange={(e) =>
                      setMonthlyForm({ ...monthlyForm, electricityUnits: e.target.value })
                    }
                    className={inputClass}
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Baseline: {monthlyContext.baselineElectricityUnits} units
                    {monthlyContext.utilityRates
                      ? ` × ₹${monthlyContext.utilityRates.electricityUnitRate}`
                      : ""}{" "}
                    ({baselineSourceLabel(monthlyContext.baselineSource)})
                  </p>
                </div>

                <div>
                  <label className="mb-1 block text-sm text-slate-300">Gas units (current)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={monthlyForm.gasUnits}
                    onChange={(e) =>
                      setMonthlyForm({ ...monthlyForm, gasUnits: e.target.value })
                    }
                    className={inputClass}
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Baseline: {monthlyContext.baselineGasUnits} units
                    {monthlyContext.utilityRates
                      ? ` × ₹${monthlyContext.utilityRates.gasUnitRate}`
                      : ""}{" "}
                    ({baselineSourceLabel(monthlyContext.baselineSource)})
                  </p>
                </div>

                <div>
                  <label className="mb-1 block text-sm text-slate-300">Maintenance</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={monthlyForm.maintenance}
                    onChange={(e) =>
                      setMonthlyForm({ ...monthlyForm, maintenance: e.target.value })
                    }
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm text-slate-300">Misc</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={monthlyForm.misc}
                    onChange={(e) => setMonthlyForm({ ...monthlyForm, misc: e.target.value })}
                    className={inputClass}
                  />
                </div>

                {utilityRateError ? (
                  <div className="md:col-span-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                    {utilityRateError}. Configure utility rates under Properties → Utility rates.
                  </div>
                ) : null}

                {monthlyContext.breakdown ? (
                  <RentBreakdownPanel
                    breakdown={monthlyContext.breakdown}
                    subtitle={[
                      tenantName(monthlyContext.tenant),
                      monthlyForm.startDate && monthlyForm.endDate
                        ? `${monthlyForm.startDate} to ${monthlyForm.endDate}`
                        : monthlyForm.startDate || null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  />
                ) : null}
              </>
            ) : null}
          </div>

          <div className="mt-4 flex gap-3">
            <button
              type="submit"
              className={buttonPrimaryClass}
              disabled={!canRecordMonthly || submitting}
            >
              {saveButtonLabel({
                submitting,
                isEdit: !!editingRent,
                createLabel: "Record rent",
                updateLabel: "Update rent",
              })}
            </button>
            {editingRent ? (
              <button
                type="button"
                className={buttonSecondaryClass}
                disabled={submitting}
                onClick={() => {
                  setEditingRent(null);
                  setMonthlyForm(emptyMonthlyForm);
                }}
              >
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      ) : null}

      <div className="mt-8 overflow-x-auto rounded-2xl border border-slate-800">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-900 text-left text-slate-400">
            <tr className="whitespace-nowrap">
              <th className="px-3 py-3">Tenant</th>
              <th className="px-3 py-3">From</th>
              <th className="px-3 py-3">To</th>
              <th className="px-3 py-3">Rent</th>
              <th className="px-3 py-3">Total</th>
              <th className="px-3 py-3">Elec.</th>
              <th className="px-3 py-3">Gas</th>
              <th className="px-3 py-3">Maint.</th>
              <th className="px-3 py-3">Misc</th>
              <th className="px-3 py-3">Due</th>
              <th className="px-3 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={RENT_LIST_COL_SPAN} className="px-4 py-8 text-slate-400">
                  Loading...
                </td>
              </tr>
            ) : sortedDisplayedRents.length === 0 ? (
              <tr>
                <td colSpan={RENT_LIST_COL_SPAN} className="px-4 py-8 text-slate-400">
                  No rent records yet.
                </td>
              </tr>
            ) : (
              paginatedRents.map((row) => {
                const assignmentDetail = assignments.find(
                  (assignment) => assignment.id === row.tenantAssignmentId,
                );
                const tenantMonthlyBills = allRents.filter(
                  (bill) => bill.tenant.id === row.tenant.id,
                );
                const savedBreakdown = assignmentDetail
                  ? breakdownFromRentRow(row, {
                      assignment: assignmentDetail,
                      monthlyBills: tenantMonthlyBills,
                    })
                  : null;
                const isViewing = viewingRentId === row.id;
                const isReminderOpen = reminderRentId === row.id;

                return (
                  <Fragment key={row.id}>
                    <tr className="border-t border-slate-800 whitespace-nowrap">
                      <td className="px-3 py-3">
                        {tenantName(row.tenant)}
                        {row.isExitRent ? (
                          <span className="ml-2 rounded bg-amber-500/20 px-1.5 py-0.5 text-xs text-amber-200">
                            Exit
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-3">{formatDate(row.startDate)}</td>
                      <td className="px-3 py-3">{formatDate(row.endDate)}</td>
                      <td className="px-3 py-3">{row.rent}</td>
                      <td className="px-3 py-3">{row.totalRent ?? "—"}</td>
                      <td className="px-3 py-3">{row.electricityUnits ?? "—"}</td>
                      <td className="px-3 py-3">{row.gasUnits ?? "—"}</td>
                      <td className="px-3 py-3">{row.maintenance ?? "—"}</td>
                      <td className="px-3 py-3">{row.misc ?? "—"}</td>
                      <td className="px-3 py-3">{formatDate(row.dueDate)}</td>
                      <td className="px-3 py-3">
                        <div className="flex flex-nowrap items-center gap-2">
                          {savedBreakdown ? (
                            <button
                              type="button"
                              className={buttonSecondaryClass}
                              onClick={() => {
                                setViewingRentId(isViewing ? null : row.id);
                                if (!isViewing) closeReminderPanel();
                              }}
                            >
                              {isViewing ? "Hide" : "Breakdown"}
                            </button>
                          ) : null}
                          {grants.canUpdate && canSendRentReminder(row) ? (
                            <button
                              type="button"
                              className={buttonSecondaryClass}
                              disabled={
                                submitting ||
                                deletingId !== null ||
                                sendingReminderId !== null ||
                                (loadingReminderPreview && isReminderOpen)
                              }
                              onClick={() => void handleToggleReminder(row)}
                            >
                              {loadingReminderPreview && isReminderOpen
                                ? "Loading..."
                                : isReminderOpen
                                  ? "Hide"
                                  : "Reminder"}
                            </button>
                          ) : null}
                          <RowActions
                            canUpdate={grants.canUpdate && isRentUnpaid(row.paymentStatus)}
                            canDelete={grants.canDelete && isRentUnpaid(row.paymentStatus)}
                            onEdit={() => {
                              setEditingRent(row);
                              setViewingRentId(null);
                              const startDate = formatDate(row.startDate);
                              setMonthlyForm({
                                tenantId: row.tenant.id,
                                startDate,
                                endDate:
                                  row.isExitRent && row.endDate
                                    ? formatDate(row.endDate)
                                    : calcMonthlyPeriodEnd(startDate),
                                electricityUnits: row.electricityUnits
                                  ? String(row.electricityUnits)
                                  : "",
                                gasUnits: row.gasUnits ? String(row.gasUnits) : "",
                                maintenance: row.maintenance ? String(row.maintenance) : "",
                                misc: row.misc ? String(row.misc) : "",
                              });
                            }}
                            onDelete={async () => {
                              if (!confirm("Delete this rent record?")) return;
                              setError(null);
                              try {
                                await remove(`/api/rents/${row.id}`, row.id);
                                if (viewingRentId === row.id) setViewingRentId(null);
                              } catch {
                                // Error message is set by the cache hook.
                              }
                            }}
                            deleting={deletingId === row.id}
                            disabled={submitting}
                          />
                        </div>
                      </td>
                    </tr>
                    {isViewing && savedBreakdown ? (
                      <tr key={`${row.id}-breakdown`} className="border-t border-slate-800 bg-slate-950/40">
                        <td colSpan={RENT_LIST_COL_SPAN} className="px-4 py-4">
                          <RentBreakdownPanel
                            breakdown={savedBreakdown}
                            subtitle={[
                              tenantName(row.tenant),
                              row.endDate
                                ? `${formatDate(row.startDate)} to ${formatDate(row.endDate)}`
                                : formatDate(row.startDate),
                            ].join(" · ")}
                          />
                        </td>
                      </tr>
                    ) : null}
                    {isReminderOpen ? (
                      <tr key={`${row.id}-reminder`} className="border-t border-slate-800 bg-slate-950/40">
                        <td colSpan={RENT_LIST_COL_SPAN} className="px-4 py-4">
                          <ReminderMessagePanel
                            preview={reminderPreview}
                            loading={loadingReminderPreview}
                            sendStatus={reminderSendStatus}
                            sending={sendingReminderId === row.id}
                            onSend={() => void handleSendReminder(row.id)}
                            onClose={closeReminderPanel}
                          />
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

      {sortedDisplayedRents.length > 0 ? (
        <div className="mt-4 flex items-center justify-between text-sm text-slate-400">
          <p>
            Page {Math.min(rentListPage, rentListTotalPages)} of {rentListTotalPages} (
            {sortedDisplayedRents.length} records)
          </p>
          {rentListTotalPages > 1 ? (
            <div className="flex gap-2">
              <button
                type="button"
                className={buttonSecondaryClass}
                disabled={rentListPage <= 1 || loading}
                onClick={() => setRentListPage((current) => Math.max(current - 1, 1))}
              >
                Previous
              </button>
              <button
                type="button"
                className={buttonSecondaryClass}
                disabled={rentListPage >= rentListTotalPages || loading}
                onClick={() => setRentListPage((current) => current + 1)}
              >
                Next
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
