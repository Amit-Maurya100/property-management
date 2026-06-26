"use client";

import { useEffect, useState } from "react";
import { fetchJson } from "@/lib/api/client-cache";

type TenantProfile = {
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  idDocument: string | null;
  securityDeposit: string | number;
  advanceBalance: string | number;
  unit: {
    unitNumber: string;
    floor: {
      building: {
        name: string;
        property: { name: string };
      };
    };
  } | null;
  assignments: Array<{
    leaseFrom: string | null;
    leaseTo: string | null;
    monthlyRent: string | number | null;
    monthlyDueDay: number | null;
  }>;
};

export function TenantPortalProfile() {
  const [profile, setProfile] = useState<TenantProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJson<TenantProfile>("/api/portal/profile")
      .then(setProfile)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load profile"));
  }, []);

  if (error) {
    return <p className="text-red-300">{error}</p>;
  }

  if (!profile) {
    return <p className="text-slate-400">Loading profile...</p>;
  }

  const assignment = profile.assignments[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">My Profile</h1>
        <p className="mt-1 text-sm text-slate-400">Your tenant account details</p>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Name</dt>
            <dd className="mt-1 text-white">
              {profile.firstName} {profile.lastName}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Email</dt>
            <dd className="mt-1 text-white">{profile.email ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Phone</dt>
            <dd className="mt-1 text-white">{profile.phone ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">ID document</dt>
            <dd className="mt-1 text-white">{profile.idDocument ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Property</dt>
            <dd className="mt-1 text-white">
              {profile.unit?.floor.building.property.name ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Building / Unit</dt>
            <dd className="mt-1 text-white">
              {profile.unit
                ? `${profile.unit.floor.building.name} · Unit ${profile.unit.unitNumber}`
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Lease</dt>
            <dd className="mt-1 text-white">
              {assignment?.leaseFrom
                ? `${assignment.leaseFrom.slice(0, 10)} – ${assignment.leaseTo?.slice(0, 10) ?? "—"}`
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Monthly rent</dt>
            <dd className="mt-1 text-white">
              {assignment?.monthlyRent != null ? `₹${Number(assignment.monthlyRent).toFixed(2)}` : "—"}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
