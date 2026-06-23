"use client";

import { useMemo, useState } from "react";
import { EntityCrudPanel } from "@/components/properties/entity-crud-panel";
import { useCachedFetch } from "@/hooks/use-cached-fetch";
import type { ResourceGrants } from "@/lib/permissions/grants";

type PropertyOption = { id: string; name: string };

export function BuildingsAdmin({
  grants,
  embedded = false,
}: {
  grants: ResourceGrants;
  embedded?: boolean;
}) {
  const [propertyId, setPropertyId] = useState("");
  const { data: properties = [] } = useCachedFetch<PropertyOption[]>("/api/properties");

  const propertyOptions = useMemo(
    () => properties.map((p) => ({ value: p.id, label: p.name })),
    [properties],
  );

  return (
    <EntityCrudPanel
      title="Buildings"
      embedded={embedded}
      apiPath="/api/buildings"
      resource="building"
      grants={grants}
      fields={[
        {
          key: "propertyId",
          label: "Property",
          type: "select",
          required: true,
          options: propertyOptions,
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
