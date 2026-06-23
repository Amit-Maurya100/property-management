"use client";

import { FormEvent, useRef, useState } from "react";
import { buttonPrimaryClass, inputClass } from "@/components/admin/ui";
import { EntityCrudPanel } from "@/components/properties/entity-crud-panel";
import { useCachedFetch } from "@/hooks/use-cached-fetch";
import { fetchJson } from "@/lib/api/client-cache";
import type { ResourceGrants } from "@/lib/permissions/grants";

const unitTypes = ["APARTMENT", "ROOM", "OFFICE", "SHOP", "HALL"];
const billingCycles = ["HOURLY", "DAILY", "WEEKLY", "MONTHLY"];
const availabilityStatuses = ["AVAILABLE", "RESERVED", "OCCUPIED"];

function UnitPricingPanel({ unitId, canUpdate }: { unitId: string; canUpdate: boolean }) {
  const [pricingSubmitting, setPricingSubmitting] = useState(false);
  const [availabilitySubmitting, setAvailabilitySubmitting] = useState(false);
  const pricingSubmittingRef = useRef(false);
  const availabilitySubmittingRef = useRef(false);
  const [pricingForm, setPricingForm] = useState({
    currency: "INR",
    basePrice: "",
    billingCycle: "MONTHLY",
    securityDeposit: "",
  });
  const [availabilityForm, setAvailabilityForm] = useState({
    status: "AVAILABLE",
    availableFrom: "",
    availableTo: "",
  });

  const { data: pricing = [], reload: reloadPricing } = useCachedFetch<Record<string, unknown>[]>(
    `/api/units/${unitId}/pricing`,
  );
  const { data: availability = [], reload: reloadAvailability } = useCachedFetch<
    Record<string, unknown>[]
  >(`/api/units/${unitId}/pricing?type=availability`);

  async function addPricing(event: FormEvent) {
    event.preventDefault();
    if (pricingSubmittingRef.current) return;
    pricingSubmittingRef.current = true;
    setPricingSubmitting(true);
    try {
      await fetchJson(`/api/units/${unitId}/pricing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: {
            currency: pricingForm.currency,
            basePrice: Number(pricingForm.basePrice),
            billingCycle: pricingForm.billingCycle,
            securityDeposit: pricingForm.securityDeposit
              ? Number(pricingForm.securityDeposit)
              : undefined,
          },
        }),
      });
      setPricingForm({
        currency: "INR",
        basePrice: "",
        billingCycle: "MONTHLY",
        securityDeposit: "",
      });
      await reloadPricing(true);
    } finally {
      pricingSubmittingRef.current = false;
      setPricingSubmitting(false);
    }
  }

  async function addAvailability(event: FormEvent) {
    event.preventDefault();
    if (availabilitySubmittingRef.current) return;
    availabilitySubmittingRef.current = true;
    setAvailabilitySubmitting(true);
    try {
      await fetchJson(`/api/units/${unitId}/pricing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "availability",
          data: {
            status: availabilityForm.status,
            availableFrom: availabilityForm.availableFrom || undefined,
            availableTo: availabilityForm.availableTo || undefined,
          },
        }),
      });
      setAvailabilityForm({ status: "AVAILABLE", availableFrom: "", availableTo: "" });
      await reloadAvailability(true);
    } finally {
      availabilitySubmittingRef.current = false;
      setAvailabilitySubmitting(false);
    }
  }

  if (!canUpdate) return null;

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-2">
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
        <h3 className="font-medium text-emerald-400">Pricing</h3>
        <form onSubmit={addPricing} className="mt-3 grid gap-2">
          <input placeholder="Currency" value={pricingForm.currency} onChange={(e) => setPricingForm({ ...pricingForm, currency: e.target.value })} className={inputClass} />
          <input placeholder="Base price" type="number" required value={pricingForm.basePrice} onChange={(e) => setPricingForm({ ...pricingForm, basePrice: e.target.value })} className={inputClass} />
          <select value={pricingForm.billingCycle} onChange={(e) => setPricingForm({ ...pricingForm, billingCycle: e.target.value })} className={inputClass}>
            {billingCycles.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input placeholder="Security deposit" type="number" value={pricingForm.securityDeposit} onChange={(e) => setPricingForm({ ...pricingForm, securityDeposit: e.target.value })} className={inputClass} />
          <button type="submit" className={buttonPrimaryClass} disabled={pricingSubmitting}>
            {pricingSubmitting ? "Adding..." : "Add pricing"}
          </button>
        </form>
        <ul className="mt-3 space-y-1 text-sm text-slate-300">
          {pricing.map((p) => (
            <li key={String(p.id)}>{String(p.currency)} {String(p.basePrice)} / {String(p.billingCycle)}</li>
          ))}
        </ul>
      </div>
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
        <h3 className="font-medium text-emerald-400">Availability</h3>
        <form onSubmit={addAvailability} className="mt-3 grid gap-2">
          <select value={availabilityForm.status} onChange={(e) => setAvailabilityForm({ ...availabilityForm, status: e.target.value })} className={inputClass}>
            {availabilityStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <input type="datetime-local" value={availabilityForm.availableFrom} onChange={(e) => setAvailabilityForm({ ...availabilityForm, availableFrom: e.target.value })} className={inputClass} />
          <input type="datetime-local" value={availabilityForm.availableTo} onChange={(e) => setAvailabilityForm({ ...availabilityForm, availableTo: e.target.value })} className={inputClass} />
          <button type="submit" className={buttonPrimaryClass} disabled={availabilitySubmitting}>
            {availabilitySubmitting ? "Adding..." : "Add availability"}
          </button>
        </form>
        <ul className="mt-3 space-y-1 text-sm text-slate-300">
          {availability.map((a) => (
            <li key={String(a.id)}>{String(a.status)}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function UnitsAdmin({ grants }: { grants: ResourceGrants }) {
  const [floorId, setFloorId] = useState("");
  const [selectedUnitId, setSelectedUnitId] = useState("");

  const { data: floors = [] } = useCachedFetch<
    { id: string; floorNumber: number; building?: { name: string } }[]
  >("/api/floors");
  const { data: units = [] } = useCachedFetch<{ id: string; unitNumber: string }[]>("/api/units");

  return (
    <>
      <EntityCrudPanel
        title="Units"
        apiPath="/api/units"
        resource="unit"
        grants={grants}
        fields={[
          {
            key: "floorId",
            label: "Floor",
            type: "select",
            required: true,
            options: floors.map((f) => ({
              value: f.id,
              label: `Floor ${f.floorNumber}${f.building ? ` — ${f.building.name}` : ""}`,
            })),
          },
          { key: "unitNumber", label: "Unit Number", required: true },
          {
            key: "unitType",
            label: "Unit Type",
            type: "select",
            required: true,
            options: unitTypes.map((t) => ({ value: t, label: t })),
          },
          { key: "capacity", label: "Capacity", type: "number" },
          { key: "area", label: "Area (sq ft)", type: "number" },
        ]}
        columns={[
          { key: "unitNumber", label: "Unit #" },
          { key: "unitType", label: "Type" },
          { key: "capacity", label: "Capacity" },
          { key: "area", label: "Area" },
        ]}
        filters={[
          {
            key: "floorId",
            label: "Floor",
            options: floors.map((f) => ({
              id: f.id,
              label: `Floor ${f.floorNumber}${f.building ? ` — ${f.building.name}` : ""}`,
            })),
            value: floorId,
            onChange: setFloorId,
          },
        ]}
        buildQuery={(filters) => (filters.floorId ? `floorId=${filters.floorId}` : "")}
        getInitialForm={() => ({
          floorId: "",
          unitNumber: "",
          unitType: "APARTMENT",
          capacity: "",
          area: "",
        })}
        mapRowToForm={(row) => ({
          floorId: String((row.floor as { id: string })?.id ?? row.floorId ?? ""),
          unitNumber: String(row.unitNumber ?? ""),
          unitType: String(row.unitType ?? "APARTMENT"),
          capacity: row.capacity != null ? String(row.capacity) : "",
          area: row.area != null ? String(row.area) : "",
        })}
        buildPayload={(form) => ({
          floorId: form.floorId,
          unitNumber: form.unitNumber,
          unitType: form.unitType,
          capacity: form.capacity ? Number(form.capacity) : undefined,
          area: form.area ? Number(form.area) : undefined,
        })}
      />
      <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-lg font-medium">Pricing &amp; Availability</h2>
        <label className="mb-1 mt-4 block text-sm text-slate-300">Select unit</label>
        <select
          value={selectedUnitId}
          onChange={(e) => setSelectedUnitId(e.target.value)}
          className={inputClass}
        >
          <option value="">Choose a unit...</option>
          {units.map((unit) => (
            <option key={unit.id} value={unit.id}>{unit.unitNumber} (ID: {unit.id})</option>
          ))}
        </select>
        {selectedUnitId ? (
          <UnitPricingPanel unitId={selectedUnitId} canUpdate={grants.canUpdate} />
        ) : null}
      </div>
    </>
  );
}
