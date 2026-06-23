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
  calcDueDateFromPeriodStart,
  calcMonthlyPeriodEnd,
  calcRentBreakdown,
  firstDayOfMonth,
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
  rent: string;
  totalRent?: string | null;
  electricityUnits?: string | null;
  gasUnits?: string | null;
  maintenance?: string | null;
  misc?: string | null;
  dueDate: string;
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

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return value.slice(0, 10);
}

function tenantName(tenant: { firstName: string; lastName: string }) {
  return `${tenant.firstName} ${tenant.lastName}`;
}

function baselineSourceLabel(source: "stored" | "assignment" | "prior_bill") {
  if (source === "stored") return "saved with this bill";
  if (source === "assignment") return "from assignment initial readings";
  return "from previous month bill";
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
  const [viewingRentId, setViewingRentId] = useState<string | null>(null);
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

  const displayedRents = useMemo(
    () =>
      filterTenantId
        ? allRents.filter((row) => row.tenant.id === filterTenantId)
        : allRents,
    [allRents, filterTenantId],
  );

  const monthlyContext = useMemo(() => {
    const tenant = tenants.find((row) => row.id === monthlyForm.tenantId);
    if (!tenant) return null;

    const activeAssignment = assignments.find(
      (row) => row.tenantId === tenant.id && row.isActive,
    );

    const monthlyRent =
      activeAssignment?.monthlyRent != null
        ? toNumber(activeAssignment.monthlyRent)
        : null;

    const monthlyBills = allRents.filter((row) => row.tenant.id === tenant.id);

    const baselineResult = resolveUtilityBaselines({
      assignment: activeAssignment ?? {
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
      activeAssignment?.monthlyDueDay != null && monthlyForm.startDate
        ? calcDueDateFromPeriodStart(
            monthlyForm.startDate,
            activeAssignment.monthlyDueDay,
          )
        : "";

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
          })
        : null;

    return {
      tenant,
      activeAssignment,
      monthlyRent,
      baselineElectricityUnits: baselineResult.electricityUnits,
      baselineGasUnits: baselineResult.gasUnits,
      baselineSource: baselineResult.source,
      dueDate,
      breakdown,
      utilityRates,
      totalRent: breakdown?.total ?? null,
      unitId: activeAssignment?.unit.id ?? tenant.unit?.id ?? "",
      unitNumber: activeAssignment?.unit.unitNumber ?? tenant.unit?.unitNumber ?? "",
    };
  }, [tenants, assignments, allRents, monthlyForm, editingRent, utilityRates]);

  const canRecordMonthly =
    monthlyContext != null &&
    monthlyContext.activeAssignment != null &&
    monthlyContext.monthlyRent != null &&
    monthlyContext.unitId !== "" &&
    monthlyContext.dueDate !== "" &&
    monthlyForm.startDate !== "" &&
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
          onChange={(e) => setFilterTenantId(e.target.value)}
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
                  const startDate = firstDayOfMonth();
                  setMonthlyForm({
                    ...emptyMonthlyForm,
                    tenantId,
                    startDate,
                    endDate: calcMonthlyPeriodEnd(startDate),
                  });
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
                      endDate: calcMonthlyPeriodEnd(startDate),
                    })
                  }
                />
                <div>
                  <label className="mb-1 block text-sm text-slate-300">To</label>
                  <input
                    readOnly
                    value={monthlyForm.endDate || "Select From date"}
                    className={`${inputClass} opacity-80`}
                  />
                </div>

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
                  <RentBreakdownPanel breakdown={monthlyContext.breakdown} />
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
            <tr>
              <th className="px-4 py-3">Tenant</th>
              <th className="px-4 py-3">Unit #</th>
              <th className="px-4 py-3">From</th>
              <th className="px-4 py-3">To</th>
              <th className="px-4 py-3">Rent</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Elec.</th>
              <th className="px-4 py-3">Gas</th>
              <th className="px-4 py-3">Maint.</th>
              <th className="px-4 py-3">Misc</th>
              <th className="px-4 py-3">Due</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={12} className="px-4 py-8 text-slate-400">
                  Loading...
                </td>
              </tr>
            ) : displayedRents.length === 0 ? (
              <tr>
                <td colSpan={12} className="px-4 py-8 text-slate-400">
                  No rent records yet.
                </td>
              </tr>
            ) : (
              displayedRents.map((row) => {
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

                return (
                  <Fragment key={row.id}>
                    <tr className="border-t border-slate-800">
                      <td className="px-4 py-3">{tenantName(row.tenant)}</td>
                      <td className="px-4 py-3">{row.unit.unitNumber}</td>
                      <td className="px-4 py-3">{formatDate(row.startDate)}</td>
                      <td className="px-4 py-3">{formatDate(row.endDate)}</td>
                      <td className="px-4 py-3">{row.rent}</td>
                      <td className="px-4 py-3">{row.totalRent ?? "—"}</td>
                      <td className="px-4 py-3">{row.electricityUnits ?? "—"}</td>
                      <td className="px-4 py-3">{row.gasUnits ?? "—"}</td>
                      <td className="px-4 py-3">{row.maintenance ?? "—"}</td>
                      <td className="px-4 py-3">{row.misc ?? "—"}</td>
                      <td className="px-4 py-3">{formatDate(row.dueDate)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          {savedBreakdown ? (
                            <button
                              type="button"
                              className={buttonSecondaryClass}
                              onClick={() =>
                                setViewingRentId(isViewing ? null : row.id)
                              }
                            >
                              {isViewing ? "Hide" : "Breakdown"}
                            </button>
                          ) : null}
                          <RowActions
                            canUpdate={grants.canUpdate}
                            canDelete={grants.canDelete}
                            onEdit={() => {
                              setEditingRent(row);
                              setViewingRentId(null);
                              const startDate = formatDate(row.startDate);
                              setMonthlyForm({
                                tenantId: row.tenant.id,
                                startDate,
                                endDate: calcMonthlyPeriodEnd(startDate),
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
                        <td colSpan={12} className="px-4 py-4">
                          <RentBreakdownPanel breakdown={savedBreakdown} />
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
