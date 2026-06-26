"use client";

import { useMemo, useState } from "react";
import { EntityCrudPanel } from "@/components/properties/entity-crud-panel";
import { useCachedFetch } from "@/hooks/use-cached-fetch";
import type { ResourceGrants } from "@/lib/permissions/grants";

const roomTypes = ["BEDROOM", "KITCHEN", "BATHROOM", "OFFICE_ROOM"];

type UnitOption = { id: string; unitNumber: string };

export function RoomsAdmin({ grants }: { grants: ResourceGrants }) {
  const [unitId, setUnitId] = useState("");
  const { data: units = [] } = useCachedFetch<UnitOption[]>("/api/units");

  const unitOptions = useMemo(
    () => units.map((u) => ({ value: u.id, label: u.unitNumber })),
    [units],
  );

  return (
    <EntityCrudPanel
      title="Rooms"
      apiPath="/api/rooms"
      resource="room"
      grants={grants}
      fields={[
        {
          key: "unitId",
          label: "Unit",
          type: "select",
          required: true,
          options: unitOptions,
        },
        { key: "name", label: "Name", required: true },
        {
          key: "roomType",
          label: "Room Type",
          type: "select",
          required: true,
          options: roomTypes.map((t) => ({ value: t, label: t })),
        },
        { key: "area", label: "Area", type: "number" },
      ]}
      columns={[
        {
          key: "unit",
          label: "Unit #",
          render: (row) => String((row.unit as { unitNumber: string })?.unitNumber ?? ""),
        },
        { key: "name", label: "Name" },
        { key: "roomType", label: "Type" },
        { key: "area", label: "Area" },
      ]}
      filters={[
        {
          key: "unitId",
          label: "Unit",
          options: units.map((u) => ({ id: u.id, label: u.unitNumber })),
          value: unitId,
          onChange: setUnitId,
        },
      ]}
      buildQuery={(filters) => (filters.unitId ? `unitId=${filters.unitId}` : "")}
      getInitialForm={() => ({ unitId: "", name: "", roomType: "BEDROOM", area: "" })}
      mapRowToForm={(row) => ({
        unitId: String((row.unit as { id: string })?.id ?? row.unitId ?? ""),
        name: String(row.name ?? ""),
        roomType: String(row.roomType ?? "BEDROOM"),
        area: row.area != null ? String(row.area) : "",
      })}
      buildPayload={(form) => ({
        unitId: form.unitId,
        name: form.name,
        roomType: form.roomType,
        area: form.area ? Number(form.area) : undefined,
      })}
    />
  );
}
