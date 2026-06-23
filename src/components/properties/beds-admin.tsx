"use client";

import { useMemo, useState } from "react";
import { EntityCrudPanel } from "@/components/properties/entity-crud-panel";
import { useCachedFetch } from "@/hooks/use-cached-fetch";
import type { ResourceGrants } from "@/lib/permissions/grants";

const bedTypes = ["SINGLE", "DOUBLE", "BUNK"];

type RoomOption = { id: string; name: string };

export function BedsAdmin({ grants }: { grants: ResourceGrants }) {
  const [roomId, setRoomId] = useState("");
  const { data: rooms = [] } = useCachedFetch<RoomOption[]>("/api/rooms");

  const roomOptions = useMemo(
    () => rooms.map((r) => ({ value: r.id, label: r.name })),
    [rooms],
  );

  return (
    <EntityCrudPanel
      title="Beds"
      apiPath="/api/beds"
      resource="bed"
      grants={grants}
      fields={[
        {
          key: "roomId",
          label: "Room",
          type: "select",
          required: true,
          options: roomOptions,
        },
        {
          key: "bedType",
          label: "Bed Type",
          type: "select",
          required: true,
          options: bedTypes.map((t) => ({ value: t, label: t })),
        },
      ]}
      columns={[
        { key: "bedType", label: "Type" },
        {
          key: "room",
          label: "Room",
          render: (row) => String((row.room as { name: string })?.name ?? ""),
        },
      ]}
      filters={[
        {
          key: "roomId",
          label: "Room",
          options: rooms.map((r) => ({ id: r.id, label: r.name })),
          value: roomId,
          onChange: setRoomId,
        },
      ]}
      buildQuery={(filters) => (filters.roomId ? `roomId=${filters.roomId}` : "")}
      getInitialForm={() => ({ roomId: "", bedType: "SINGLE" })}
      mapRowToForm={(row) => ({
        roomId: String((row.room as { id: string })?.id ?? row.roomId ?? ""),
        bedType: String(row.bedType ?? "SINGLE"),
      })}
      buildPayload={(form) => ({ roomId: form.roomId, bedType: form.bedType })}
    />
  );
}
