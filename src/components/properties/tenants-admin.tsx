"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  buttonPrimaryClass,
  buttonSecondaryClass,
  inputClass,
} from "@/components/admin/ui";
import { DatePickerField } from "@/components/properties/date-picker-field";
import { RowActions } from "@/components/admin/row-actions";
import type { ResourceGrants } from "@/lib/permissions/grants";

type TenantRow = {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  idDocument?: string | null;
  pictureUrl?: string | null;
  initialRent?: string | null;
  leaseFrom?: string | null;
  leaseTo?: string | null;
  monthlyDueDay?: number | null;
  initialGasUnits?: string | null;
  initialElectricityUnits?: string | null;
  isActive: boolean;
  notes?: string | null;
  unit?: {
    id: string;
    unitNumber: string;
    floor?: {
      building?: {
        name: string;
        property?: { name: string };
      };
    };
  } | null;
};

type UnitOption = {
  id: string;
  unitNumber: string;
  floor?: {
    building?: {
      name: string;
      property?: { name: string };
    };
  };
};

const emptyTenantForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  idDocument: "",
  unitId: "",
  pictureUrl: "",
  initialRent: "",
  leaseFrom: "",
  leaseTo: "",
  monthlyDueDay: "",
  initialGasUnits: "",
  initialElectricityUnits: "",
  isActive: true,
  notes: "",
};

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return value.slice(0, 10);
}

function formatUnitLabel(unit: UnitOption | NonNullable<TenantRow["unit"]>) {
  const property = unit.floor?.building?.property?.name;
  const building = unit.floor?.building?.name;
  const parts = [unit.unitNumber, building, property].filter(Boolean);
  return parts.join(" · ");
}

function buildTenantPayload(
  form: typeof emptyTenantForm,
  options: { isUpdate: boolean },
) {
  const payload: Record<string, unknown> = {
    firstName: form.firstName,
    lastName: form.lastName,
    email: form.email || undefined,
    phone: form.phone || undefined,
    idDocument: form.idDocument || undefined,
    pictureUrl: form.pictureUrl || undefined,
    initialRent: form.initialRent ? Number(form.initialRent) : undefined,
    leaseFrom: form.leaseFrom || undefined,
    leaseTo: form.leaseTo || undefined,
    monthlyDueDay: form.monthlyDueDay ? Number(form.monthlyDueDay) : undefined,
    initialGasUnits: form.initialGasUnits ? Number(form.initialGasUnits) : undefined,
    initialElectricityUnits: form.initialElectricityUnits
      ? Number(form.initialElectricityUnits)
      : undefined,
    isActive: form.isActive,
    notes: form.notes || undefined,
  };

  if (form.unitId) {
    payload.unitId = form.unitId;
  } else if (options.isUpdate) {
    payload.unitId = null;
  }

  return payload;
}

export function TenantsAdmin({ grants }: { grants: ResourceGrants }) {
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingTenant, setEditingTenant] = useState<TenantRow | null>(null);
  const [tenantForm, setTenantForm] = useState(emptyTenantForm);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [tenantsRes, unitsRes] = await Promise.all([
        fetch("/api/tenants"),
        fetch("/api/units"),
      ]);
      if (!tenantsRes.ok) throw new Error((await tenantsRes.json()).error);
      setTenants(await tenantsRes.json());
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

  async function handleTenantSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      const res = await fetch(
        editingTenant ? `/api/tenants/${editingTenant.id}` : "/api/tenants",
        {
          method: editingTenant ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            buildTenantPayload(tenantForm, { isUpdate: !!editingTenant }),
          ),
        },
      );
      if (!res.ok) throw new Error((await res.json()).error);
      setEditingTenant(null);
      setTenantForm(emptyTenantForm);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    }
  }

  const editingLeaseFrom = editingTenant?.leaseFrom
    ? formatDate(editingTenant.leaseFrom)
    : undefined;
  const editingLeaseTo = editingTenant?.leaseTo ? formatDate(editingTenant.leaseTo) : undefined;

  return (
    <div>
      <h1 className="text-3xl font-semibold">Tenants</h1>
      <p className="mt-2 text-slate-400">
        Manage tenant details, picture, initial lease terms, and active status.
      </p>

      {error ? (
        <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      {(grants.canCreate || grants.canUpdate) && (
        <form
          onSubmit={handleTenantSubmit}
          className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6"
        >
          <h2 className="text-lg font-medium">
            {editingTenant ? "Edit" : "Add"} tenant
          </h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-slate-300">First name</label>
              <input
                required
                value={tenantForm.firstName}
                onChange={(e) => setTenantForm({ ...tenantForm, firstName: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-300">Last name</label>
              <input
                required
                value={tenantForm.lastName}
                onChange={(e) => setTenantForm({ ...tenantForm, lastName: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-300">Email</label>
              <input
                type="email"
                value={tenantForm.email}
                onChange={(e) => setTenantForm({ ...tenantForm, email: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-300">Phone</label>
              <input
                value={tenantForm.phone}
                onChange={(e) => setTenantForm({ ...tenantForm, phone: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-300">ID document</label>
              <input
                value={tenantForm.idDocument}
                onChange={(e) => setTenantForm({ ...tenantForm, idDocument: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-300">Assign unit</label>
              <select
                value={tenantForm.unitId}
                onChange={(e) => setTenantForm({ ...tenantForm, unitId: e.target.value })}
                className={inputClass}
              >
                <option value="">No unit assigned</option>
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {formatUnitLabel(unit)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-300">Picture URL</label>
              <input
                type="url"
                placeholder="https://..."
                value={tenantForm.pictureUrl}
                onChange={(e) => setTenantForm({ ...tenantForm, pictureUrl: e.target.value })}
                className={inputClass}
              />
              {tenantForm.pictureUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={tenantForm.pictureUrl}
                  alt="Tenant preview"
                  className="mt-2 h-16 w-16 rounded-full object-cover"
                />
              ) : null}
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-300">Initial rent</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={tenantForm.initialRent}
                onChange={(e) => setTenantForm({ ...tenantForm, initialRent: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-300">Monthly due day</label>
              <input
                type="number"
                min="1"
                max="31"
                placeholder="1–31"
                value={tenantForm.monthlyDueDay}
                onChange={(e) => setTenantForm({ ...tenantForm, monthlyDueDay: e.target.value })}
                className={inputClass}
              />
            </div>
            <DatePickerField
              label="Lease from"
              value={tenantForm.leaseFrom}
              allowPastValue={editingLeaseFrom}
              onChange={(leaseFrom) => setTenantForm({ ...tenantForm, leaseFrom })}
            />
            <DatePickerField
              label="Lease to"
              value={tenantForm.leaseTo}
              allowPastValue={editingLeaseTo}
              onChange={(leaseTo) => setTenantForm({ ...tenantForm, leaseTo })}
            />
            <div>
              <label className="mb-1 block text-sm text-slate-300">Initial electricity units</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={tenantForm.initialElectricityUnits}
                onChange={(e) =>
                  setTenantForm({ ...tenantForm, initialElectricityUnits: e.target.value })
                }
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-300">Initial gas units</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={tenantForm.initialGasUnits}
                onChange={(e) => setTenantForm({ ...tenantForm, initialGasUnits: e.target.value })}
                className={inputClass}
              />
            </div>
            <div className="flex items-center gap-2 md:col-span-2">
              <input
                id="tenant-active"
                type="checkbox"
                checked={tenantForm.isActive}
                onChange={(e) => setTenantForm({ ...tenantForm, isActive: e.target.checked })}
                className="h-4 w-4 rounded border-slate-600 bg-slate-800"
              />
              <label htmlFor="tenant-active" className="text-sm text-slate-300">
                Active tenant
              </label>
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm text-slate-300">Notes</label>
              <textarea
                value={tenantForm.notes}
                onChange={(e) => setTenantForm({ ...tenantForm, notes: e.target.value })}
                className={inputClass}
                rows={2}
              />
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <button type="submit" className={buttonPrimaryClass}>
              {editingTenant ? "Update" : "Create"}
            </button>
            {editingTenant ? (
              <button
                type="button"
                className={buttonSecondaryClass}
                onClick={() => {
                  setEditingTenant(null);
                  setTenantForm(emptyTenantForm);
                }}
              >
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      )}

      <div className="mt-8 overflow-x-auto rounded-2xl border border-slate-800">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-900 text-left text-slate-400">
            <tr>
              <th className="px-4 py-3">Picture</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Unit</th>
              <th className="px-4 py-3">Initial rent</th>
              <th className="px-4 py-3">From</th>
              <th className="px-4 py-3">To</th>
              <th className="px-4 py-3">Due day</th>
              <th className="px-4 py-3">Elec.</th>
              <th className="px-4 py-3">Gas</th>
              <th className="px-4 py-3">Active</th>
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
            ) : tenants.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-4 py-8 text-slate-400">
                  No tenants yet.
                </td>
              </tr>
            ) : (
              tenants.map((row) => (
                <tr key={row.id} className="border-t border-slate-800">
                  <td className="px-4 py-3">
                    {row.pictureUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={row.pictureUrl}
                        alt={`${row.firstName} ${row.lastName}`}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {row.firstName} {row.lastName}
                  </td>
                  <td className="px-4 py-3">
                    {row.unit ? formatUnitLabel(row.unit) : "—"}
                  </td>
                  <td className="px-4 py-3">{row.initialRent ?? "—"}</td>
                  <td className="px-4 py-3">{formatDate(row.leaseFrom)}</td>
                  <td className="px-4 py-3">{formatDate(row.leaseTo)}</td>
                  <td className="px-4 py-3">{row.monthlyDueDay ?? "—"}</td>
                  <td className="px-4 py-3">{row.initialElectricityUnits ?? "—"}</td>
                  <td className="px-4 py-3">{row.initialGasUnits ?? "—"}</td>
                  <td className="px-4 py-3">{row.isActive ? "Yes" : "No"}</td>
                  <td className="px-4 py-3">
                    <RowActions
                      canUpdate={grants.canUpdate}
                      canDelete={grants.canDelete}
                      onEdit={() => {
                        setEditingTenant(row);
                        setTenantForm({
                          firstName: row.firstName,
                          lastName: row.lastName,
                          email: row.email ?? "",
                          phone: row.phone ?? "",
                          idDocument: row.idDocument ?? "",
                          unitId: row.unit?.id ?? "",
                          pictureUrl: row.pictureUrl ?? "",
                          initialRent: row.initialRent ? String(row.initialRent) : "",
                          leaseFrom: row.leaseFrom ? formatDate(row.leaseFrom) : "",
                          leaseTo: row.leaseTo ? formatDate(row.leaseTo) : "",
                          monthlyDueDay: row.monthlyDueDay ? String(row.monthlyDueDay) : "",
                          initialGasUnits: row.initialGasUnits ? String(row.initialGasUnits) : "",
                          initialElectricityUnits: row.initialElectricityUnits
                            ? String(row.initialElectricityUnits)
                            : "",
                          isActive: row.isActive,
                          notes: row.notes ?? "",
                        });
                      }}
                      onDelete={async () => {
                        if (!confirm("Delete this tenant?")) return;
                        const res = await fetch(`/api/tenants/${row.id}`, {
                          method: "DELETE",
                        });
                        if (!res.ok) {
                          setError((await res.json()).error);
                          return;
                        }
                        await load();
                      }}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
