"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { buttonPrimaryClass, inputClass } from "@/components/admin/ui";
import { DatePickerField } from "@/components/properties/date-picker-field";
import { formatGstNumberInput } from "@/lib/gst/gst-number";
import type { ResourceGrants } from "@/lib/permissions/grants";

const STATUS_OPTIONS = ["ACTIVE", "INACTIVE", "PENDING", "SUSPENDED"] as const;

const emptyForm = {
  name: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  country: "India",
  zipcode: "",
  gstNumber: "",
  ownerName: "",
  registrationDate: "",
  currentStatus: "ACTIVE" as (typeof STATUS_OPTIONS)[number],
};

export function OrganizationRegisterForm({ grants }: { grants: ResourceGrants }) {
  const router = useRouter();
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!grants.canCreate) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/gst/organization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          gstNumber: form.gstNumber,
          ownerName: form.ownerName,
          registrationDate: form.registrationDate,
          currentStatus: form.currentStatus,
          address: {
            line1: form.line1,
            line2: form.line2 || undefined,
            city: form.city,
            state: form.state || undefined,
            country: form.country,
            zipcode: form.zipcode || undefined,
          },
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      router.refresh();
      router.push("/hub/gst/tax-config");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  if (!grants.canCreate) {
    return (
      <p className="text-sm text-slate-400">
        You do not have permission to register an organization.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <h2 className="text-lg font-medium">Register your organization</h2>
      <p className="mt-1 text-sm text-slate-400">
        Provide organization details. Address is saved in the shared address table.
      </p>

      {error ? (
        <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="mb-1 block text-sm text-slate-300">Organization name</label>
          <input
            required
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-300">GST number</label>
          <input
            required
            value={form.gstNumber}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, gstNumber: formatGstNumberInput(e.target.value) }))
            }
            className={`${inputClass} uppercase`}
            maxLength={15}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-300">Owner name</label>
          <input
            required
            value={form.ownerName}
            onChange={(e) => setForm((prev) => ({ ...prev, ownerName: e.target.value }))}
            className={inputClass}
          />
        </div>
        <DatePickerField
          label="Registration date"
          value={form.registrationDate}
          allowPastDates
          onChange={(registrationDate) => setForm((prev) => ({ ...prev, registrationDate }))}
        />
        <div>
          <label className="mb-1 block text-sm text-slate-300">Current status</label>
          <select
            required
            value={form.currentStatus}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                currentStatus: e.target.value as (typeof STATUS_OPTIONS)[number],
              }))
            }
            className={inputClass}
          >
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status.charAt(0) + status.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2 mt-2 border-t border-slate-800 pt-4">
          <h3 className="text-sm font-medium text-slate-200">Address</h3>
        </div>
        <div className="md:col-span-2">
          <label className="mb-1 block text-sm text-slate-300">Line 1</label>
          <input
            required
            value={form.line1}
            onChange={(e) => setForm((prev) => ({ ...prev, line1: e.target.value }))}
            className={inputClass}
          />
        </div>
        <div className="md:col-span-2">
          <label className="mb-1 block text-sm text-slate-300">Line 2</label>
          <input
            value={form.line2}
            onChange={(e) => setForm((prev) => ({ ...prev, line2: e.target.value }))}
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-300">City</label>
          <input
            required
            value={form.city}
            onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-300">State</label>
          <input
            value={form.state}
            onChange={(e) => setForm((prev) => ({ ...prev, state: e.target.value }))}
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-300">Country</label>
          <input
            required
            value={form.country}
            onChange={(e) => setForm((prev) => ({ ...prev, country: e.target.value }))}
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-300">Zipcode</label>
          <input
            value={form.zipcode}
            onChange={(e) => setForm((prev) => ({ ...prev, zipcode: e.target.value }))}
            className={inputClass}
          />
        </div>
      </div>

      <button type="submit" disabled={loading} className={`${buttonPrimaryClass} mt-6`}>
        {loading ? "Saving..." : "Register organization"}
      </button>
    </form>
  );
}
