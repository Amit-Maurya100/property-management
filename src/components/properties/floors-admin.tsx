"use client";

import { useMemo, useState } from "react";
import { EntityCrudPanel } from "@/components/properties/entity-crud-panel";
import { useCachedFetch } from "@/hooks/use-cached-fetch";
import type { ResourceGrants } from "@/lib/permissions/grants";

type BuildingOption = { id: string; name: string; property?: { name: string } };

export function FloorsAdmin({
  grants,
  embedded = false,
}: {
  grants: ResourceGrants;
  embedded?: boolean;
}) {
  const [buildingId, setBuildingId] = useState("");
  const { data: buildings = [] } = useCachedFetch<BuildingOption[]>("/api/buildings");

  const buildingOptions = useMemo(
    () =>
      buildings.map((b) => ({
        value: b.id,
        label: `${b.name}${b.property ? ` (${b.property.name})` : ""}`,
      })),
    [buildings],
  );

  return (
    <EntityCrudPanel
      title="Floors"
      embedded={embedded}
      apiPath="/api/floors"
      resource="floor"
      grants={grants}
      fields={[
        {
          key: "buildingId",
          label: "Building",
          type: "select",
          required: true,
          options: buildingOptions,
        },
        { key: "floorNumber", label: "Floor Number", type: "number", required: true },
      ]}
      columns={[
        { key: "floorNumber", label: "Floor #" },
        {
          key: "building",
          label: "Building",
          render: (row) => String((row.building as { name: string })?.name ?? ""),
        },
      ]}
      filters={[
        {
          key: "buildingId",
          label: "Building",
          options: buildings.map((b) => ({
            id: b.id,
            label: `${b.name}${b.property ? ` (${b.property.name})` : ""}`,
          })),
          value: buildingId,
          onChange: setBuildingId,
        },
      ]}
      buildQuery={(filters) => (filters.buildingId ? `buildingId=${filters.buildingId}` : "")}
      getInitialForm={() => ({ buildingId: "", floorNumber: "" })}
      mapRowToForm={(row) => ({
        buildingId: String((row.building as { id: string })?.id ?? row.buildingId ?? ""),
        floorNumber: String(row.floorNumber ?? ""),
      })}
      buildPayload={(form) => ({
        buildingId: form.buildingId,
        floorNumber: Number(form.floorNumber),
      })}
    />
  );
}
