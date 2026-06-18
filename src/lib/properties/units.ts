import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { parseId, type IdInput } from "@/lib/ids";
import type { PropertyAccessContext } from "@/lib/properties/ownership";
import { assertUserOwnsFloor, assertUserOwnsUnit, ownerPropertyFilter } from "@/lib/properties/ownership";

const unitSelect = {
  id: true,
  unitNumber: true,
  unitType: true,
  capacity: true,
  area: true,
  floorId: true,
  createdAt: true,
  updatedAt: true,
  floor: {
    select: {
      id: true,
      floorNumber: true,
      building: {
        select: {
          id: true,
          name: true,
          property: { select: { id: true, name: true } },
        },
      },
    },
  },
} as const;

export async function listUnits(
  ctx: PropertyAccessContext,
  filters: { floorId?: bigint; buildingId?: bigint; propertyId?: bigint } = {},
) {
  return prisma.unit.findMany({
    where: {
      ...(filters.floorId ? { floorId: filters.floorId } : {}),
      ...(filters.buildingId ? { floor: { buildingId: filters.buildingId } } : {}),
      ...(filters.propertyId
        ? { floor: { building: { propertyId: filters.propertyId } } }
        : {}),
      floor: { building: { property: ownerPropertyFilter(ctx) } },
    },
    select: unitSelect,
    orderBy: { unitNumber: "asc" },
  });
}

export async function getUnit(ctx: PropertyAccessContext, id: IdInput) {
  const unitId = parseId(id);
  await assertUserOwnsUnit(ctx, unitId);
  const unit = await prisma.unit.findUnique({
    where: { id: unitId },
    select: unitSelect,
  });
  if (!unit) throw new Error("NOT_FOUND");
  return unit;
}

export async function createUnit(
  ctx: PropertyAccessContext,
  data: {
    floorId: bigint;
    unitNumber: string;
    unitType: "APARTMENT" | "ROOM" | "OFFICE" | "SHOP" | "HALL";
    capacity?: number;
    area?: number;
  },
) {
  await assertUserOwnsFloor(ctx, data.floorId);
  return prisma.unit.create({
    data: {
      floorId: data.floorId,
      unitNumber: data.unitNumber,
      unitType: data.unitType,
      capacity: data.capacity,
      area: data.area != null ? new Prisma.Decimal(data.area) : null,
    },
    select: unitSelect,
  });
}

export async function updateUnit(
  ctx: PropertyAccessContext,
  id: IdInput,
  data: {
    unitNumber?: string;
    unitType?: "APARTMENT" | "ROOM" | "OFFICE" | "SHOP" | "HALL";
    capacity?: number | null;
    area?: number | null;
    floorId?: bigint;
  },
) {
  const unitId = parseId(id);
  await assertUserOwnsUnit(ctx, unitId);
  if (data.floorId) await assertUserOwnsFloor(ctx, data.floorId);
  return prisma.unit.update({
    where: { id: unitId },
    data: {
      unitNumber: data.unitNumber,
      unitType: data.unitType,
      capacity: data.capacity,
      area: data.area != null ? new Prisma.Decimal(data.area) : data.area,
      floorId: data.floorId,
    },
    select: unitSelect,
  });
}

export async function deleteUnit(ctx: PropertyAccessContext, id: IdInput) {
  const unitId = parseId(id);
  await assertUserOwnsUnit(ctx, unitId);
  await prisma.unit.delete({ where: { id: unitId } });
}
