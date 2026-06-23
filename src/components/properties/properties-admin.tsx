"use client";

import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  buttonPrimaryClass,
  buttonSecondaryClass,
  inputClass,
  saveButtonLabel,
} from "@/components/admin/ui";
import { RowActions } from "@/components/admin/row-actions";
import { BuildingsAdmin } from "@/components/properties/buildings-admin";
import { BuildingUtilityRatesAdmin } from "@/components/properties/building-utility-rates-admin";
import { FloorsAdmin } from "@/components/properties/floors-admin";
import { useCachedFetch } from "@/hooks/use-cached-fetch";
import { useCachedList } from "@/hooks/use-cached-list";
import type { ResourceGrants } from "@/lib/permissions/grants";

type PropertySection = "properties" | "buildings" | "utilities" | "floors";

type Amenity = { id: string; name: string; category: string };
type PropertyRow = {
  id: string;
  name: string;
  description?: string | null;
  propertyType: string;
  address: {
    line1: string;
    line2?: string | null;
    city: string;
    state?: string | null;
    country: string;
    zipcode?: string | null;
  };
  amenities: { amenity: Amenity }[];
};

const propertyTypes = ["APARTMENT", "HOTEL", "HOSTEL", "OFFICE"];

const emptyForm = {
  name: "",
  description: "",
  propertyType: "APARTMENT",
  line1: "",
  line2: "",
  city: "",
  state: "",
  country: "",
  zipcode: "",
  amenityIds: [] as string[],
};

export function PropertiesAdmin({
  grants,
  buildingGrants,
  floorGrants,
  showBuildings,
  showFloors,
  username,
  showWelcome,
  initialSection = "properties",
}: {
  grants: ResourceGrants;
  buildingGrants?: ResourceGrants;
  floorGrants?: ResourceGrants;
  showBuildings?: boolean;
  showFloors?: boolean;
  username?: string;
  showWelcome?: boolean;
  initialSection?: PropertySection;
}) {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const resolvedInitial: PropertySection =
    tabParam === "buildings" && showBuildings
      ? "buildings"
      : tabParam === "utilities" && showBuildings
        ? "utilities"
        : tabParam === "floors" && showFloors
          ? "floors"
          : initialSection;

  const [section, setSection] = useState<PropertySection>(resolvedInitial);
  const [editing, setEditing] = useState<PropertyRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);

  const {
    items: rows,
    loading,
    error,
    submitting,
    deletingId,
    setError,
    save,
    remove,
  } = useCachedList<PropertyRow>("/api/properties");
  const { data: amenities = [] } = useCachedFetch<Amenity[]>("/api/amenities");

  useEffect(() => {
    if (tabParam === "buildings" && showBuildings) setSection("buildings");
    else if (tabParam === "floors" && showFloors) setSection("floors");
    else if (tabParam === "properties") setSection("properties");
    setShowForm(false);
    setEditing(null);
    setForm(emptyForm);
  }, [tabParam, showBuildings, showFloors]);

  useEffect(() => {
    setShowForm(false);
    setEditing(null);
    setForm(emptyForm);
  }, [section]);

  const sectionTabs: { id: PropertySection; label: string }[] = [
    { id: "properties", label: "Properties" },
    ...(showBuildings ? [{ id: "buildings" as const, label: "Buildings" }] : []),
    ...(showBuildings ? [{ id: "utilities" as const, label: "Utility rates" }] : []),
    ...(showFloors ? [{ id: "floors" as const, label: "Floors" }] : []),
  ];

  function resetForm() {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(false);
  }

  function openCreateForm() {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEditForm(row: PropertyRow) {
    setEditing(row);
    setForm({
      name: row.name,
      description: row.description ?? "",
      propertyType: row.propertyType,
      line1: row.address.line1,
      line2: row.address.line2 ?? "",
      city: row.address.city,
      state: row.address.state ?? "",
      country: row.address.country,
      zipcode: row.address.zipcode ?? "",
      amenityIds: row.amenities.map((a) => a.amenity.id),
    });
    setShowForm(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setError(null);
    const payload = {
      name: form.name,
      description: form.description || undefined,
      propertyType: form.propertyType,
      address: {
        line1: form.line1,
        line2: form.line2 || undefined,
        city: form.city,
        state: form.state || undefined,
        country: form.country,
        zipcode: form.zipcode || undefined,
      },
      amenityIds: form.amenityIds,
    };
    try {
      await save({
        url: editing ? `/api/properties/${editing.id}` : "/api/properties",
        method: editing ? "PATCH" : "POST",
        body: payload,
      });
      resetForm();
    } catch {
      // Error message is set by the cache hook.
    }
  }

  async function handleDelete(row: PropertyRow) {
    if (!confirm("Delete this property?")) return;
    setError(null);
    try {
      await remove(`/api/properties/${row.id}`, row.id);
    } catch {
      // Error message is set by the cache hook.
    }
  }

  return (
    <div>
      {showWelcome ? (
        <div className="mb-8">
          <h1 className="text-3xl font-semibold">Properties</h1>
          <p className="mt-2 text-slate-400">
            Hello, <span className="text-emerald-400">{username}</span>. Manage properties,
            buildings, and floors below.
          </p>
        </div>
      ) : (
        <h1 className="text-3xl font-semibold">Properties</h1>
      )}

      {sectionTabs.length > 1 ? (
        <div className="mt-6 flex flex-wrap gap-2 border-b border-slate-800 pb-1">
          {sectionTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSection(tab.id)}
              className={
                section === tab.id
                  ? "rounded-t-lg border border-b-0 border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-emerald-400"
                  : "rounded-t-lg px-4 py-2 text-sm text-slate-400 hover:text-slate-200"
              }
            >
              {tab.label}
            </button>
          ))}
        </div>
      ) : null}

      {section === "buildings" && buildingGrants ? (
        <div className="mt-6">
          <BuildingsAdmin grants={buildingGrants} embedded />
        </div>
      ) : null}

      {section === "utilities" && buildingGrants ? (
        <div className="mt-6">
          <BuildingUtilityRatesAdmin grants={buildingGrants} embedded />
        </div>
      ) : null}

      {section === "floors" && floorGrants ? (
        <div className="mt-6">
          <FloorsAdmin grants={floorGrants} embedded />
        </div>
      ) : null}

      {section === "properties" ? (
        <>
      {grants.canCreate && !showForm ? (
        <div className="mt-6">
          <button type="button" onClick={openCreateForm} className={buttonPrimaryClass}>
            Add Property
          </button>
        </div>
      ) : null}

      {showForm && (grants.canCreate || grants.canUpdate) ? (
        <form
          onSubmit={handleSubmit}
          className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-6"
        >
          <h2 className="text-lg font-medium">{editing ? "Edit" : "Create"} Property</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-slate-300">Name</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-300">Type</label>
              <select value={form.propertyType} onChange={(e) => setForm({ ...form, propertyType: e.target.value })} className={inputClass}>
                {propertyTypes.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm text-slate-300">Description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputClass} rows={2} />
            </div>
            {(["line1", "line2", "city", "state", "country", "zipcode"] as const).map((field) => (
              <div key={field}>
                <label className="mb-1 block text-sm text-slate-300">{field}</label>
                <input
                  required={field === "line1" || field === "city" || field === "country"}
                  value={form[field]}
                  onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                  className={inputClass}
                />
              </div>
            ))}
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm text-slate-300">Amenities</label>
              <div className="flex flex-wrap gap-2">
                {amenities.map((amenity) => (
                  <label key={amenity.id} className="flex items-center gap-2 text-sm text-slate-300">
                    <input
                      type="checkbox"
                      checked={form.amenityIds.includes(amenity.id)}
                      onChange={(e) => {
                        setForm((prev) => ({
                          ...prev,
                          amenityIds: e.target.checked
                            ? [...prev.amenityIds, amenity.id]
                            : prev.amenityIds.filter((id) => id !== amenity.id),
                        }));
                      }}
                    />
                    {amenity.name}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <button type="submit" className={buttonPrimaryClass} disabled={submitting}>
              {saveButtonLabel({ submitting, isEdit: !!editing })}
            </button>
            <button type="button" onClick={resetForm} className={buttonSecondaryClass} disabled={submitting}>
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {error && <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}

      <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-800">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-900 text-left text-slate-400">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">City</th>
              <th className="px-4 py-3">Amenities</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-slate-400">Loading...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-slate-400">No properties yet.</td></tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t border-slate-800">
                  <td className="px-4 py-3">{row.name}</td>
                  <td className="px-4 py-3">{row.propertyType}</td>
                  <td className="px-4 py-3">{row.address.city}</td>
                  <td className="px-4 py-3">{row.amenities.map((a) => a.amenity.name).join(", ") || "—"}</td>
                  <td className="px-4 py-3">
                    <RowActions
                      canUpdate={grants.canUpdate}
                      canDelete={grants.canDelete}
                      onEdit={() => openEditForm(row)}
                      onDelete={() => void handleDelete(row)}
                      deleting={deletingId === row.id}
                      disabled={submitting}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
        </>
      ) : null}
    </div>
  );
}
