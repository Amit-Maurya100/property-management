"use client";

import { EntityCrudPanel } from "@/components/properties/entity-crud-panel";
import type { ResourceGrants } from "@/lib/permissions/grants";

const categories = ["INTERNET", "PARKING", "SECURITY"];

export function AmenitiesAdmin({ grants }: { grants: ResourceGrants }) {
  return (
    <EntityCrudPanel
      title="Amenities"
      apiPath="/api/amenities"
      resource="amenity"
      grants={grants}
      fields={[
        { key: "name", label: "Name", required: true },
        {
          key: "category",
          label: "Category",
          type: "select",
          required: true,
          options: categories.map((c) => ({ value: c, label: c })),
        },
      ]}
      columns={[
        { key: "name", label: "Name" },
        { key: "category", label: "Category" },
      ]}
      getInitialForm={() => ({ name: "", category: "INTERNET" })}
      mapRowToForm={(row) => ({
        name: String(row.name ?? ""),
        category: String(row.category ?? "INTERNET"),
      })}
      buildPayload={(form) => ({ name: form.name, category: form.category })}
    />
  );
}
