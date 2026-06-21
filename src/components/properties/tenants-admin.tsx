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

type AssignmentRow = {
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
  notes?: string | null;
  unit: {
    id: string;
    unitNumber: string;
    floor?: {
      building?: {
        name: string;
        property?: { name: string };
      };
    };
  };
};

type TenantRow = {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  idDocument?: string | null;
  pictureUrl?: string | null;
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
  assignments?: AssignmentRow[];
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
};

const emptyAssignmentForm = {
  unitId: "",
  monthlyRent: "",
  leaseFrom: "",
  leaseTo: "",
  monthlyDueDay: "",
  initialGasUnits: "",
  initialElectricityUnits: "",
  notes: "",
  isActive: true,
};

function assignmentFormFromRow(row: AssignmentRow) {
  return {
    unitId: row.unit.id,
    monthlyRent: row.monthlyRent ? String(row.monthlyRent) : "",
    leaseFrom: row.leaseFrom ? formatDate(row.leaseFrom) : "",
    leaseTo: row.leaseTo ? formatDate(row.leaseTo) : "",
    monthlyDueDay: row.monthlyDueDay ? String(row.monthlyDueDay) : "",
    initialGasUnits: row.initialGasUnits ? String(row.initialGasUnits) : "",
    initialElectricityUnits: row.initialElectricityUnits
      ? String(row.initialElectricityUnits)
      : "",
    notes: row.notes ?? "",
    isActive: row.isActive,
  };
}

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

function tenantName(row: { firstName: string; lastName: string }) {
  return `${row.firstName} ${row.lastName}`;
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
  };

  if (form.unitId) {
    payload.unitId = form.unitId;
  } else if (options.isUpdate) {
    payload.unitId = null;
  }

  return payload;
}

function buildAssignmentCreatePayload(tenantId: string, form: typeof emptyAssignmentForm) {
  return {
    tenantId,
    unitId: form.unitId,
    monthlyRent: form.monthlyRent ? Number(form.monthlyRent) : undefined,
    leaseFrom: form.leaseFrom || undefined,
    leaseTo: form.leaseTo || undefined,
    monthlyDueDay: form.monthlyDueDay ? Number(form.monthlyDueDay) : undefined,
    initialGasUnits: form.initialGasUnits ? Number(form.initialGasUnits) : undefined,
    initialElectricityUnits: form.initialElectricityUnits
      ? Number(form.initialElectricityUnits)
      : undefined,
    notes: form.notes || undefined,
    isActive: true,
  };
}

function buildAssignmentUpdatePayload(form: typeof emptyAssignmentForm) {
  return {
    unitId: form.unitId,
    monthlyRent: form.monthlyRent !== "" ? Number(form.monthlyRent) : null,
    leaseFrom: form.leaseFrom || null,
    leaseTo: form.leaseTo || null,
    monthlyDueDay: form.monthlyDueDay !== "" ? Number(form.monthlyDueDay) : null,
    initialGasUnits: form.initialGasUnits !== "" ? Number(form.initialGasUnits) : null,
    initialElectricityUnits:
      form.initialElectricityUnits !== "" ? Number(form.initialElectricityUnits) : null,
    notes: form.notes || null,
    isActive: form.isActive,
  };
}

export function TenantsAdmin({ grants }: { grants: ResourceGrants }) {
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingTenant, setEditingTenant] = useState<TenantRow | null>(null);
  const [tenantForm, setTenantForm] = useState(emptyTenantForm);
  const [assignmentForm, setAssignmentForm] = useState(emptyAssignmentForm);
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<AssignmentRow | null>(null);

  function closeAssignmentEditor() {
    setAssignmentForm(emptyAssignmentForm);
    setShowAssignmentForm(false);
    setEditingAssignment(null);
  }

  const loadTenants = useCallback(async () => {
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

  const loadAssignments = useCallback(async (tenantId: string) => {
    const res = await fetch(`/api/tenant-assignments?tenantId=${tenantId}`);
    if (!res.ok) throw new Error((await res.json()).error);
    const rows = await res.json();
    setAssignments(rows);
    return rows as AssignmentRow[];
  }, []);

  useEffect(() => {
    void loadTenants();
  }, [loadTenants]);

  useEffect(() => {
    if (!editingTenant) {
      setAssignments([]);
      closeAssignmentEditor();
      return;
    }
    void loadAssignments(editingTenant.id).catch((err) => {
      setError(err instanceof Error ? err.message : "Failed to load assignments");
    });
  }, [editingTenant, loadAssignments]);

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
      const saved = await res.json();
      setEditingTenant(saved);
      setTenantForm({
        firstName: saved.firstName,
        lastName: saved.lastName,
        email: saved.email ?? "",
        phone: saved.phone ?? "",
        idDocument: saved.idDocument ?? "",
        unitId: saved.unit?.id ?? "",
        pictureUrl: saved.pictureUrl ?? "",
      });
      await loadTenants();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    }
  }

  async function handleAssignmentSubmit(event: FormEvent) {
    event.preventDefault();
    if (!editingTenant) return;
    setError(null);
    try {
      const isUpdate = editingAssignment != null;
      const res = await fetch(
        isUpdate
          ? `/api/tenant-assignments/${editingAssignment.id}`
          : "/api/tenant-assignments",
        {
          method: isUpdate ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            isUpdate
              ? buildAssignmentUpdatePayload(assignmentForm)
              : buildAssignmentCreatePayload(editingTenant.id, assignmentForm),
          ),
        },
      );
      if (!res.ok) throw new Error((await res.json()).error);
      const saved = (await res.json()) as AssignmentRow;
      closeAssignmentEditor();
      const tenantsRes = await fetch("/api/tenants");
      if (tenantsRes.ok) {
        const tenantsData = (await tenantsRes.json()) as TenantRow[];
        setTenants(tenantsData);
        setEditingTenant((current) =>
          current ? tenantsData.find((row) => row.id === current.id) ?? current : current,
        );
      } else {
        await loadTenants();
      }
      setAssignments((current) => {
        const index = current.findIndex((row) => row.id === saved.id);
        if (index === -1) return [saved, ...current];
        return current.map((row) => (row.id === saved.id ? saved : row));
      });
      void loadAssignments(editingTenant.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    }
  }

  const activeAssignment =
    assignments.find((row) => row.isActive) ??
    editingTenant?.assignments?.[0] ??
    null;

  return (
    <div>
      <h1 className="text-3xl font-semibold">Tenants</h1>
      <p className="mt-2 text-slate-400">
        Manage tenant contact details and unit assignments. Lease and rent terms live in
        rent assignments so tenants can continue after a lease expires.
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

      {editingTenant && (grants.canCreate || grants.canUpdate) ? (
        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-medium">Rent assignment for {tenantName(editingTenant)}</h2>
              <p className="mt-1 text-sm text-slate-400">
                Add a new assignment to renew lease terms or change unit. Previous assignments
                for the same unit are deactivated automatically.
              </p>
            </div>
            {grants.canCreate && !showAssignmentForm ? (
              <button
                type="button"
                className={buttonSecondaryClass}
                onClick={() => {
                  setEditingAssignment(null);
                  setShowAssignmentForm(true);
                  setAssignmentForm({
                    ...emptyAssignmentForm,
                    unitId: tenantForm.unitId || activeAssignment?.unit.id || "",
                  });
                }}
              >
                New assignment
              </button>
            ) : null}
          </div>

          {showAssignmentForm ? (
            <form onSubmit={handleAssignmentSubmit} className="mt-4 grid gap-4 md:grid-cols-2">
              <h3 className="md:col-span-2 text-sm font-medium text-slate-300">
                {editingAssignment ? "Edit assignment" : "New assignment"}
              </h3>
              <div>
                <label className="mb-1 block text-sm text-slate-300">Unit</label>
                <select
                  required
                  value={assignmentForm.unitId}
                onChange={(e) =>
                  setAssignmentForm((prev) => ({ ...prev, unitId: e.target.value }))
                }
                  className={inputClass}
                >
                  <option value="">Select unit...</option>
                  {units.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {formatUnitLabel(unit)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-300">Monthly rent</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={assignmentForm.monthlyRent}
                onChange={(e) =>
                  setAssignmentForm((prev) => ({ ...prev, monthlyRent: e.target.value }))
                }
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-300">Due days after From date</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={assignmentForm.monthlyDueDay}
                onChange={(e) =>
                  setAssignmentForm((prev) => ({ ...prev, monthlyDueDay: e.target.value }))
                }
                  className={inputClass}
                />
              </div>
              <DatePickerField
                label="Lease from"
                value={assignmentForm.leaseFrom}
                allowPastDates
                allowPastValue={
                  editingAssignment?.leaseFrom
                    ? formatDate(editingAssignment.leaseFrom)
                    : undefined
                }
                onChange={(leaseFrom) =>
                  setAssignmentForm((prev) => ({ ...prev, leaseFrom }))
                }
              />
              <DatePickerField
                label="Lease to"
                value={assignmentForm.leaseTo}
                allowPastDates
                allowPastValue={
                  editingAssignment?.leaseTo
                    ? formatDate(editingAssignment.leaseTo)
                    : undefined
                }
                onChange={(leaseTo) => setAssignmentForm((prev) => ({ ...prev, leaseTo }))}
              />
              <div>
                <label className="mb-1 block text-sm text-slate-300">Initial electricity units</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={assignmentForm.initialElectricityUnits}
                  onChange={(e) =>
                    setAssignmentForm((prev) => ({
                      ...prev,
                      initialElectricityUnits: e.target.value,
                    }))
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
                  value={assignmentForm.initialGasUnits}
                  onChange={(e) =>
                    setAssignmentForm((prev) => ({ ...prev, initialGasUnits: e.target.value }))
                  }
                  className={inputClass}
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm text-slate-300">Notes</label>
                <textarea
                  value={assignmentForm.notes}
                  onChange={(e) =>
                    setAssignmentForm((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  className={inputClass}
                  rows={2}
                />
              </div>
              {editingAssignment ? (
                <div className="flex items-center gap-2 md:col-span-2">
                  <input
                    id="assignment-active"
                    type="checkbox"
                    checked={assignmentForm.isActive}
                    onChange={(e) =>
                      setAssignmentForm((prev) => ({ ...prev, isActive: e.target.checked }))
                    }
                    className="h-4 w-4 rounded border-slate-600 bg-slate-800"
                  />
                  <label htmlFor="assignment-active" className="text-sm text-slate-300">
                    Active assignment (deactivates other assignments for this unit)
                  </label>
                </div>
              ) : null}
              <div className="md:col-span-2 flex gap-3">
                <button type="submit" className={buttonPrimaryClass}>
                  {editingAssignment ? "Update assignment" : "Save assignment"}
                </button>
                <button
                  type="button"
                  className={buttonSecondaryClass}
                  onClick={closeAssignmentEditor}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : null}

          <div className="mt-6 overflow-x-auto rounded-xl border border-slate-800">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-950 text-left text-slate-400">
                <tr>
                  <th className="px-4 py-3">Unit</th>
                  <th className="px-4 py-3">Rent</th>
                  <th className="px-4 py-3">From</th>
                  <th className="px-4 py-3">To</th>
                  <th className="px-4 py-3">Due days</th>
                  <th className="px-4 py-3">Active</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {assignments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-slate-400">
                      No assignments yet. Add one to set lease and rent terms.
                    </td>
                  </tr>
                ) : (
                  assignments.map((row) => (
                    <tr key={row.id} className="border-t border-slate-800">
                      <td className="px-4 py-3">{formatUnitLabel(row.unit)}</td>
                      <td className="px-4 py-3">{row.monthlyRent ?? "—"}</td>
                      <td className="px-4 py-3">{formatDate(row.leaseFrom)}</td>
                      <td className="px-4 py-3">{formatDate(row.leaseTo)}</td>
                      <td className="px-4 py-3">{row.monthlyDueDay ?? "—"}</td>
                      <td className="px-4 py-3">{row.isActive ? "Yes" : "No"}</td>
                      <td className="px-4 py-3">
                        <RowActions
                          canUpdate={grants.canUpdate}
                          canDelete={grants.canDelete}
                          onEdit={() => {
                            setEditingAssignment(row);
                            setShowAssignmentForm(true);
                            setAssignmentForm(assignmentFormFromRow(row));
                          }}
                          onDelete={async () => {
                            if (!confirm("Delete this assignment?")) return;
                            const res = await fetch(`/api/tenant-assignments/${row.id}`, {
                              method: "DELETE",
                            });
                            if (!res.ok) {
                              setError((await res.json()).error);
                              return;
                            }
                            if (editingAssignment?.id === row.id) {
                              closeAssignmentEditor();
                            }
                            if (editingTenant) {
                              await Promise.all([
                                loadTenants(),
                                loadAssignments(editingTenant.id),
                              ]);
                            }
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
      ) : null}

      <div className="mt-8 overflow-x-auto rounded-2xl border border-slate-800">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-900 text-left text-slate-400">
            <tr>
              <th className="px-4 py-3">Picture</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Unit</th>
              <th className="px-4 py-3">Active rent</th>
              <th className="px-4 py-3">Lease to</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-slate-400">
                  Loading...
                </td>
              </tr>
            ) : tenants.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-slate-400">
                  No tenants yet.
                </td>
              </tr>
            ) : (
              tenants.map((row) => {
                const active = row.assignments?.[0];
                return (
                  <tr key={row.id} className="border-t border-slate-800">
                    <td className="px-4 py-3">
                      {row.pictureUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={row.pictureUrl}
                          alt={tenantName(row)}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3">{tenantName(row)}</td>
                    <td className="px-4 py-3">{row.email ?? "—"}</td>
                    <td className="px-4 py-3">{row.phone ?? "—"}</td>
                    <td className="px-4 py-3">
                      {row.unit ? formatUnitLabel(row.unit) : "—"}
                    </td>
                    <td className="px-4 py-3">{active?.monthlyRent ?? "—"}</td>
                    <td className="px-4 py-3">{formatDate(active?.leaseTo)}</td>
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
                          if (editingTenant?.id === row.id) {
                            setEditingTenant(null);
                            setTenantForm(emptyTenantForm);
                          }
                          await loadTenants();
                        }}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
