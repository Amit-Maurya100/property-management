"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  buttonPrimaryClass,
  buttonSecondaryClass,
  inputClass,
} from "@/components/admin/ui";
import { RowActions } from "@/components/admin/row-actions";
import type { ResourceGrants } from "@/lib/permissions/grants";

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
  username,
  showWelcome,
}: {
  grants: ResourceGrants;
  username?: string;
  showWelcome?: boolean;
}) {
  const [rows, setRows] = useState<PropertyRow[]>([]);
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<PropertyRow | null>(null);
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [propertiesRes, amenitiesRes] = await Promise.all([
        fetch("/api/properties"),
        fetch("/api/amenities"),
      ]);
      if (!propertiesRes.ok) throw new Error((await propertiesRes.json()).error);
      setRows(await propertiesRes.json());
      if (amenitiesRes.ok) setAmenities(await amenitiesRes.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function resetForm() {
    setEditing(null);
    setForm(emptyForm);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
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
      const res = await fetch(editing ? `/api/properties/${editing.id}` : "/api/properties", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    }
  }

  async function handleDelete(row: PropertyRow) {
    if (!confirm("Delete this property?")) return;
    const res = await fetch(`/api/properties/${row.id}`, { method: "DELETE" });
    if (!res.ok) {
      setError((await res.json()).error);
      return;
    }
    await load();
  }

  return (
    <div>
      {showWelcome ? (
        <div className="mb-8">
          <h1 className="text-3xl font-semibold">Properties</h1>
          <p className="mt-2 text-slate-400">
            Hello, <span className="text-emerald-400">{username}</span>. Manage your properties
            below.
          </p>
        </div>
      ) : (
        <h1 className="text-3xl font-semibold">Properties</h1>
      )}

      {(grants.canCreate || grants.canUpdate) && (
        <form
          onSubmit={handleSubmit}
          className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6"
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
            <button type="submit" className={buttonPrimaryClass}>{editing ? "Update" : "Create"}</button>
            {editing && <button type="button" onClick={resetForm} className={buttonSecondaryClass}>Cancel</button>}
          </div>
        </form>
      )}

      {error && <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}

      <div className="mt-8 overflow-x-auto rounded-2xl border border-slate-800">
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
                      onEdit={() => {
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
                      }}
                      onDelete={() => void handleDelete(row)}
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
