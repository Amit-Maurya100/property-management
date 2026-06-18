"use client";

import { FormEvent, Fragment, useCallback, useEffect, useMemo, useState } from "react";
import {
  buttonPrimaryClass,
  buttonSecondaryClass,
  inputClass,
} from "@/components/admin/ui";
import { DatePickerField } from "@/components/properties/date-picker-field";
import { RowActions } from "@/components/admin/row-actions";
import {
  breakdownFromRentRow,
  calcDueDate,
  calcRentBreakdown,
  firstDayOfMonth,
  isAgreementOver,
  lastDayOfMonth,
  resolveUtilityBaselines,
  toNumber,
} from "@/lib/properties/rent-calculations";
import { RentBreakdownPanel } from "@/components/properties/rent-breakdown-panel";
import type { ResourceGrants } from "@/lib/permissions/grants";

type TenantDetail = {
  id: string;
  firstName: string;
  lastName: string;
  initialRent?: string | null;
  leaseFrom?: string | null;
  leaseTo?: string | null;
  monthlyDueDay?: number | null;
  initialGasUnits?: string | null;
  initialElectricityUnits?: string | null;
  isActive: boolean;
  unit?: { id: string; unitNumber: string } | null;
};

type RentRow = {
  id: string;
  startDate: string;
  endDate?: string | null;
  rent: string;
  totalRent?: string | null;
  electricityUnits?: string | null;
  gasUnits?: string | null;
  maintenance?: string | null;
  misc?: string | null;
  dueDate: string;
  isActive: boolean;
  utilityBaseline?: { electricityUnits: number; gasUnits: number } | null;
  tenant: { id: string; firstName: string; lastName: string };
  unit: { id: string; unitNumber: string };
};

type UnitOption = { id: string; unitNumber: string };

const emptyMonthlyForm = {
  tenantId: "",
  startDate: "",
  endDate: "",
  electricityUnits: "",
  gasUnits: "",
  maintenance: "",
  misc: "",
};

const emptyLeaseForm = {
  tenantId: "",
  unitId: "",
  startDate: "",
  endDate: "",
  rent: "",
  electricityUnits: "",
  gasUnits: "",
  maintenance: "",
  misc: "",
  dueDate: "",
  isActive: true,
};

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return value.slice(0, 10);
}

function tenantName(tenant: { firstName: string; lastName: string }) {
  return `${tenant.firstName} ${tenant.lastName}`;
}

function baselineSourceLabel(source: "stored" | "tenant" | "prior_bill") {
  if (source === "stored") return "saved with this bill";
  if (source === "tenant") return "from tenant initial readings";
  return "from previous month bill";
}

export function RentAdmin({ grants }: { grants: ResourceGrants }) {
  const [tenants, setTenants] = useState<TenantDetail[]>([]);
  const [allRents, setAllRents] = useState<RentRow[]>([]);
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingRent, setEditingRent] = useState<RentRow | null>(null);
  const [formMode, setFormMode] = useState<"monthly" | "lease">("monthly");
  const [monthlyForm, setMonthlyForm] = useState(emptyMonthlyForm);
  const [leaseForm, setLeaseForm] = useState(emptyLeaseForm);
  const [filterTenantId, setFilterTenantId] = useState("");
  const [viewingRentId, setViewingRentId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [tenantsRes, rentsRes, unitsRes] = await Promise.all([
        fetch("/api/tenants"),
        fetch("/api/rents"),
        fetch("/api/units"),
      ]);
      if (!tenantsRes.ok) throw new Error((await tenantsRes.json()).error);
      if (!rentsRes.ok) throw new Error((await rentsRes.json()).error);
      setTenants(await tenantsRes.json());
      setAllRents(await rentsRes.json());
      if (unitsRes.ok) setUnits(await unitsRes.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

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

    const activeLease = allRents.find(
      (row) => row.tenant.id === tenant.id && row.isActive,
    );

    const rentPeriodEnd = activeLease?.endDate ?? tenant.leaseTo;
    const agreementOver = activeLease
      ? isAgreementOver(activeLease.endDate, tenant.leaseTo)
      : rentPeriodEnd != null && new Date(rentPeriodEnd) < new Date(firstDayOfMonth());

    const tenantInactive = !tenant.isActive;

    const monthlyRent =
      activeLease != null
        ? toNumber(activeLease.rent)
        : tenant.initialRent != null
          ? toNumber(tenant.initialRent)
          : null;

    const monthlyBills = allRents.filter(
      (row) => row.tenant.id === tenant.id && !row.isActive,
    );

    const baselineResult = resolveUtilityBaselines({
      tenant,
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

    const baselineElectricityUnits = baselineResult.electricityUnits;
    const baselineGasUnits = baselineResult.gasUnits;
    const baselineFrozen = baselineResult.source === "stored";

    const dueDate =
      tenant.monthlyDueDay != null ? calcDueDate(tenant.monthlyDueDay) : "";

    const breakdown =
      monthlyRent != null
        ? calcRentBreakdown({
            monthlyRent,
            electricityUnits: toNumber(monthlyForm.electricityUnits),
            gasUnits: toNumber(monthlyForm.gasUnits),
            baselineElectricityUnits,
            baselineGasUnits,
            maintenance: toNumber(monthlyForm.maintenance),
            misc: toNumber(monthlyForm.misc),
          })
        : null;

    return {
      tenant,
      activeLease,
      agreementOver,
      tenantInactive,
      monthlyRent,
      baselineElectricityUnits,
      baselineGasUnits,
      baselineFrozen,
      baselineSource: baselineResult.source,
      dueDate,
      breakdown,
      totalRent: breakdown?.total ?? null,
      unitId: activeLease?.unit.id ?? tenant.unit?.id ?? "",
      unitNumber: activeLease?.unit.unitNumber ?? tenant.unit?.unitNumber ?? "",
    };
  }, [tenants, allRents, monthlyForm, editingRent]);

  const canRecordMonthly =
    monthlyContext != null &&
    !monthlyContext.agreementOver &&
    !monthlyContext.tenantInactive &&
    monthlyContext.monthlyRent != null &&
    monthlyContext.unitId !== "" &&
    monthlyContext.dueDate !== "" &&
    monthlyForm.startDate !== "";

  async function handleMonthlySubmit(event: FormEvent) {
    event.preventDefault();
    if (!monthlyContext || !canRecordMonthly) return;

    setError(null);
    const payload = {
      tenantId: monthlyForm.tenantId,
      unitId: monthlyContext.unitId,
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
      isActive: false,
    };

    try {
      const url = editingRent && !editingRent.isActive
        ? `/api/rents/${editingRent.id}`
        : "/api/rents";
      const method = editingRent && !editingRent.isActive ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setEditingRent(null);
      setMonthlyForm(emptyMonthlyForm);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    }
  }

  async function handleLeaseSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const payload = {
      tenantId: leaseForm.tenantId,
      unitId: leaseForm.unitId,
      startDate: leaseForm.startDate,
      endDate: leaseForm.endDate || undefined,
      rent: Number(leaseForm.rent),
      electricityUnits: leaseForm.electricityUnits
        ? Number(leaseForm.electricityUnits)
        : undefined,
      gasUnits: leaseForm.gasUnits ? Number(leaseForm.gasUnits) : undefined,
      maintenance: leaseForm.maintenance ? Number(leaseForm.maintenance) : undefined,
      misc: leaseForm.misc ? Number(leaseForm.misc) : undefined,
      dueDate: leaseForm.dueDate,
      isActive: leaseForm.isActive,
    };

    try {
      const res = await fetch(editingRent ? `/api/rents/${editingRent.id}` : "/api/rents", {
        method: editingRent ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setEditingRent(null);
      setFormMode("monthly");
      setLeaseForm(emptyLeaseForm);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    }
  }

  const editingMonthlyStartDate =
    editingRent && !editingRent.isActive ? formatDate(editingRent.startDate) : undefined;
  const editingMonthlyEndDate =
    editingRent && !editingRent.isActive && editingRent.endDate
      ? formatDate(editingRent.endDate)
      : undefined;

  const editingStartDate = editingRent ? formatDate(editingRent.startDate) : undefined;
  const editingEndDate = editingRent?.endDate ? formatDate(editingRent.endDate) : undefined;
  const editingDueDate = editingRent ? formatDate(editingRent.dueDate) : undefined;

  return (
    <div>
      <h1 className="text-3xl font-semibold">Rent</h1>
      <p className="mt-2 text-slate-400">
        Record monthly rent with utility charges, or manage yearly lease periods.
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

      {(grants.canCreate || grants.canUpdate) &&
      formMode === "monthly" &&
      (!editingRent || !editingRent.isActive) ? (
        <form
          onSubmit={handleMonthlySubmit}
          className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-medium">
              {editingRent ? "Edit monthly rent" : "Record monthly rent"}
            </h2>
            {grants.canCreate && !editingRent ? (
              <button
                type="button"
                className={buttonSecondaryClass}
                onClick={() => {
                  setFormMode("lease");
                  setLeaseForm({
                    ...emptyLeaseForm,
                    tenantId: filterTenantId,
                    isActive: true,
                  });
                }}
              >
                Add yearly lease period
              </button>
            ) : null}
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-slate-300">Tenant name</label>
              <select
                required
                disabled={!!editingRent}
                value={monthlyForm.tenantId}
                onChange={(e) => {
                  const tenantId = e.target.value;
                  setMonthlyForm({
                    ...emptyMonthlyForm,
                    tenantId,
                    startDate: firstDayOfMonth(),
                    endDate: lastDayOfMonth(),
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
                    value={monthlyContext.unitNumber || "No active lease unit"}
                    className={`${inputClass} opacity-80`}
                  />
                </div>

                {monthlyContext.tenantInactive ? (
                  <p className="md:col-span-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                    This tenant is inactive. Activate the tenant before recording rent.
                  </p>
                ) : null}

                {monthlyContext.agreementOver ? (
                  <p className="md:col-span-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                    Agreement is over. Rent period ends after the tenant lease end date (
                    {formatDate(monthlyContext.tenant.leaseTo)}).
                  </p>
                ) : null}

                {!monthlyContext.agreementOver &&
                !monthlyContext.tenantInactive &&
                monthlyContext.monthlyRent == null ? (
                  <p className="md:col-span-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                    No monthly rent found. Set initial rent on the tenant, or add a yearly lease
                    period under &quot;Add yearly lease period&quot;.
                  </p>
                ) : null}

                {!monthlyContext.agreementOver &&
                !monthlyContext.tenantInactive &&
                monthlyContext.monthlyRent != null &&
                monthlyContext.unitId === "" ? (
                  <p className="md:col-span-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                    No unit assigned. Assign a unit on the tenant, or add a yearly lease period
                    with a unit.
                  </p>
                ) : null}

                {!monthlyContext.agreementOver &&
                !monthlyContext.tenantInactive &&
                monthlyContext.monthlyRent != null &&
                monthlyContext.unitId !== "" &&
                monthlyContext.dueDate === "" ? (
                  <p className="md:col-span-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                    Set the monthly due day (1–31) on the tenant to calculate the due date.
                  </p>
                ) : null}

                <DatePickerField
                  label="From"
                  required
                  value={monthlyForm.startDate}
                  allowPastValue={editingMonthlyStartDate}
                  onChange={(startDate) => setMonthlyForm({ ...monthlyForm, startDate })}
                />
                <DatePickerField
                  label="To"
                  value={monthlyForm.endDate}
                  allowPastValue={editingMonthlyEndDate}
                  onChange={(endDate) => setMonthlyForm({ ...monthlyForm, endDate })}
                />

                <div>
                  <label className="mb-1 block text-sm text-slate-300">Due date</label>
                  <input
                    readOnly
                    value={monthlyContext.dueDate || "Set monthly due day on tenant"}
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
                    Baseline: {monthlyContext.baselineElectricityUnits} units × ₹10 (
                    {baselineSourceLabel(monthlyContext.baselineSource)})
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
                    Baseline: {monthlyContext.baselineGasUnits} units × ₹50 (
                    {baselineSourceLabel(monthlyContext.baselineSource)})
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
              disabled={!canRecordMonthly}
            >
              Record rent
            </button>
            {editingRent && !editingRent.isActive ? (
              <button
                type="button"
                className={buttonSecondaryClass}
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

      {(grants.canCreate || grants.canUpdate) &&
      (formMode === "lease" || (editingRent?.isActive ?? false)) ? (
        <form
          onSubmit={handleLeaseSubmit}
          className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-medium">
              {editingRent ? "Edit lease period" : "Add yearly lease period"}
            </h2>
            {!editingRent ? (
              <button
                type="button"
                className={buttonSecondaryClass}
                onClick={() => {
                  setFormMode("monthly");
                  setLeaseForm(emptyLeaseForm);
                }}
              >
                Back to monthly rent
              </button>
            ) : null}
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-slate-300">Tenant name</label>
              <select
                required
                value={leaseForm.tenantId}
                onChange={(e) => setLeaseForm({ ...leaseForm, tenantId: e.target.value })}
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
            <div>
              <label className="mb-1 block text-sm text-slate-300">Unit</label>
              <select
                required
                value={leaseForm.unitId}
                onChange={(e) => setLeaseForm({ ...leaseForm, unitId: e.target.value })}
                className={inputClass}
              >
                <option value="">Select unit...</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.unitNumber}
                  </option>
                ))}
              </select>
            </div>
            <DatePickerField
              label="From"
              required
              value={leaseForm.startDate}
              allowPastValue={editingStartDate}
              onChange={(startDate) => setLeaseForm({ ...leaseForm, startDate })}
            />
            <DatePickerField
              label="To"
              value={leaseForm.endDate}
              allowPastValue={editingEndDate}
              onChange={(endDate) => setLeaseForm({ ...leaseForm, endDate })}
            />
            <div>
              <label className="mb-1 block text-sm text-slate-300">Monthly rent</label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={leaseForm.rent}
                onChange={(e) => setLeaseForm({ ...leaseForm, rent: e.target.value })}
                className={inputClass}
              />
            </div>
            <DatePickerField
              label="Due date"
              required
              value={leaseForm.dueDate}
              allowPastValue={editingDueDate}
              onChange={(dueDate) => setLeaseForm({ ...leaseForm, dueDate })}
            />
            <div className="flex items-center gap-2 md:col-span-2">
              <input
                id="lease-active"
                type="checkbox"
                checked={leaseForm.isActive}
                onChange={(e) => setLeaseForm({ ...leaseForm, isActive: e.target.checked })}
                className="h-4 w-4 rounded border-slate-600 bg-slate-800"
              />
              <label htmlFor="lease-active" className="text-sm text-slate-300">
                Active lease period (deactivates other rows for this tenant and unit)
              </label>
            </div>
          </div>

          <div className="mt-4 flex gap-3">
            <button type="submit" className={buttonPrimaryClass}>
              {editingRent ? "Update" : "Create lease"}
            </button>
            {editingRent || formMode === "lease" ? (
              <button
                type="button"
                className={buttonSecondaryClass}
                onClick={() => {
                  setEditingRent(null);
                  setFormMode("monthly");
                  setLeaseForm(emptyLeaseForm);
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
              <th className="px-4 py-3">Active</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={13} className="px-4 py-8 text-slate-400">
                  Loading...
                </td>
              </tr>
            ) : displayedRents.length === 0 ? (
              <tr>
                <td colSpan={13} className="px-4 py-8 text-slate-400">
                  No rent records yet.
                </td>
              </tr>
            ) : (
              displayedRents.map((row) => {
                const tenantDetail = tenants.find((t) => t.id === row.tenant.id);
                const tenantMonthlyBills = allRents.filter(
                  (bill) => bill.tenant.id === row.tenant.id && !bill.isActive,
                );
                const savedBreakdown =
                  !row.isActive && tenantDetail
                    ? breakdownFromRentRow(row, {
                        tenant: tenantDetail,
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
                      <td className="px-4 py-3">{row.isActive ? "Yes" : "No"}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          {!row.isActive && savedBreakdown ? (
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
                              if (row.isActive) {
                                setEditingRent(row);
                                setFormMode("lease");
                                setViewingRentId(null);
                                setLeaseForm({
                                  tenantId: row.tenant.id,
                                  unitId: row.unit.id,
                                  startDate: formatDate(row.startDate),
                                  endDate: row.endDate ? formatDate(row.endDate) : "",
                                  rent: String(row.rent),
                                  electricityUnits: row.electricityUnits
                                    ? String(row.electricityUnits)
                                    : "",
                                  gasUnits: row.gasUnits ? String(row.gasUnits) : "",
                                  maintenance: row.maintenance ? String(row.maintenance) : "",
                                  misc: row.misc ? String(row.misc) : "",
                                  dueDate: formatDate(row.dueDate),
                                  isActive: row.isActive,
                                });
                                return;
                              }

                              setEditingRent(row);
                              setFormMode("monthly");
                              setViewingRentId(null);
                              setMonthlyForm({
                                tenantId: row.tenant.id,
                                startDate: formatDate(row.startDate),
                                endDate: row.endDate ? formatDate(row.endDate) : "",
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
                              const res = await fetch(`/api/rents/${row.id}`, {
                                method: "DELETE",
                              });
                              if (!res.ok) {
                                setError((await res.json()).error);
                                return;
                              }
                              if (viewingRentId === row.id) setViewingRentId(null);
                              await load();
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                    {isViewing && savedBreakdown ? (
                      <tr key={`${row.id}-breakdown`} className="border-t border-slate-800 bg-slate-950/40">
                        <td colSpan={13} className="px-4 py-4">
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
