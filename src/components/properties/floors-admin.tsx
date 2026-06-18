"use client";

import { useEffect, useState } from "react";
import { EntityCrudPanel } from "@/components/properties/entity-crud-panel";
import type { ResourceGrants } from "@/lib/permissions/grants";

export function FloorsAdmin({ grants }: { grants: ResourceGrants }) {
  const [buildings, setBuildings] = useState<{ id: string; name: string; property?: { name: string } }[]>([]);
  const [buildingId, setBuildingId] = useState("");

  useEffect(() => {
    void fetch("/api/buildings")
      .then((res) => res.json())
      .then((data) => setBuildings(data));
  }, []);

  return (
    <EntityCrudPanel
      title="Floors"
      apiPath="/api/floors"
      resource="floor"
      grants={grants}
      fields={[
        {
          key: "buildingId",
          label: "Building",
          type: "select",
          required: true,
          options: buildings.map((b) => ({
            value: b.id,
            label: `${b.name}${b.property ? ` (${b.property.name})` : ""}`,
          })),
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
