"use client";

import { useEffect, useState } from "react";
import { EntityCrudPanel } from "@/components/properties/entity-crud-panel";
import type { ResourceGrants } from "@/lib/permissions/grants";

export function BuildingsAdmin({ grants }: { grants: ResourceGrants }) {
  const [properties, setProperties] = useState<{ id: string; name: string }[]>([]);
  const [propertyId, setPropertyId] = useState("");

  useEffect(() => {
    void fetch("/api/properties")
      .then((res) => res.json())
      .then((data) => setProperties(data));
  }, []);

  return (
    <EntityCrudPanel
      title="Buildings"
      apiPath="/api/buildings"
      resource="building"
      grants={grants}
      fields={[
        {
          key: "propertyId",
          label: "Property",
          type: "select",
          required: true,
          options: properties.map((p) => ({ value: p.id, label: p.name })),
        },
        { key: "name", label: "Name", required: true },
      ]}
      columns={[
        { key: "name", label: "Name" },
        { key: "property", label: "Property", render: (row) => String((row.property as { name: string })?.name ?? "") },
      ]}
      filters={[
        {
          key: "propertyId",
          label: "Property",
          options: properties.map((p) => ({ id: p.id, label: p.name })),
          value: propertyId,
          onChange: setPropertyId,
        },
      ]}
      buildQuery={(filters) => (filters.propertyId ? `propertyId=${filters.propertyId}` : "")}
      getInitialForm={() => ({ propertyId: "", name: "" })}
      mapRowToForm={(row) => ({
        propertyId: String((row.property as { id: string })?.id ?? row.propertyId ?? ""),
        name: String(row.name ?? ""),
      })}
      buildPayload={(form) => ({ propertyId: form.propertyId, name: form.name })}
    />
  );
}
