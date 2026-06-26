"use client";

import { useEffect, useState } from "react";
import {
  RentListTable,
  type RentListDisplayRow,
} from "@/components/properties/rent-list-table";
import { fetchJson } from "@/lib/api/client-cache";
import type { calcRentBreakdown } from "@/lib/properties/rent-calculations";

type PortalRent = {
  id: string;
  startDate: string;
  endDate: string | null;
  isExitRent: boolean;
  rent: string | number;
  totalRent: string | number | null;
  electricityUnits: string | number | null;
  gasUnits: string | number | null;
  maintenance: string | number | null;
  misc: string | number | null;
  dueDate: string;
  paymentStatus: "PENDING" | "PARTIAL" | "PAID";
  unit: {
    unitNumber: string;
    floor: { building: { name: string; property: { name: string } } };
  };
  rentBreakdown: ReturnType<typeof calcRentBreakdown> | null;
};

function toDisplayRow(rent: PortalRent): RentListDisplayRow {
  const propertyLabel = `${rent.unit.floor.building.property.name} · ${rent.unit.floor.building.name} · Unit ${rent.unit.unitNumber}`;
  const periodLabel = rent.endDate
    ? `${rent.startDate.slice(0, 10)} to ${rent.endDate.slice(0, 10)}`
    : rent.startDate.slice(0, 10);

  return {
    id: rent.id,
    startDate: rent.startDate,
    endDate: rent.endDate,
    isExitRent: rent.isExitRent,
    rent: rent.rent,
    totalRent: rent.totalRent,
    electricityUnits: rent.electricityUnits,
    gasUnits: rent.gasUnits,
    maintenance: rent.maintenance,
    misc: rent.misc,
    dueDate: rent.dueDate,
    paymentStatus: rent.paymentStatus,
    breakdown: rent.rentBreakdown,
    breakdownSubtitle: `${propertyLabel} · ${periodLabel}`,
  };
}

export function TenantPortalRents() {
  const [rents, setRents] = useState<PortalRent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJson<PortalRent[]>("/api/portal/rents")
      .then(setRents)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load rents"))
      .finally(() => setLoading(false));
  }, []);

  if (error) {
    return <p className="text-red-300">{error}</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">My Rents</h1>
        <p className="mt-1 text-sm text-slate-400">Monthly rent bills with breakdown</p>
      </div>

      <RentListTable
        rows={rents.map(toDisplayRow)}
        loading={loading}
        emptyMessage="No rent bills found."
        showPaymentStatus
      />
    </div>
  );
}
