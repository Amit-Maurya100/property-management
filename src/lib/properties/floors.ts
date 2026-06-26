import { prisma } from "@/lib/db";
import {
  SERVER_CACHE_TTL,
  cachedQuery,
  invalidatePropertyCache,
  propertyCacheKey,
} from "@/lib/api/server-cache";
import { parseId, type IdInput } from "@/lib/ids";
import type { PropertyAccessContext } from "@/lib/properties/ownership";
import {
  assertUserOwnsFloor,
  assertUserOwnsBuilding,
  ownerPropertyFilter,
} from "@/lib/properties/ownership";

const floorSelect = {
  id: true,
  floorNumber: true,
  buildingId: true,
  createdAt: true,
  updatedAt: true,
  building: {
    select: {
      id: true,
      name: true,
      property: { select: { id: true, name: true } },
    },
  },
} as const;

export async function listFloors(
  ctx: PropertyAccessContext,
  filters: { buildingId?: bigint; propertyId?: bigint } = {},
) {
  return cachedQuery(
    propertyCacheKey(ctx.userId, "floors", filters),
    SERVER_CACHE_TTL.reference,
    () =>
      prisma.floor.findMany({
        where: {
          ...(filters.buildingId ? { buildingId: filters.buildingId } : {}),
          ...(filters.propertyId ? { building: { propertyId: filters.propertyId } } : {}),
          building: { property: ownerPropertyFilter(ctx) },
        },
        select: floorSelect,
        orderBy: { floorNumber: "asc" },
      }),
  );
}

export async function getFloor(ctx: PropertyAccessContext, id: IdInput) {
  const floorId = parseId(id);
  await assertUserOwnsFloor(ctx, floorId);
  const floor = await prisma.floor.findUnique({
    where: { id: floorId },
    select: floorSelect,
  });
  if (!floor) throw new Error("NOT_FOUND");
  return floor;
}

export async function createFloor(
  ctx: PropertyAccessContext,
  data: { buildingId: bigint; floorNumber: number },
) {
  await assertUserOwnsBuilding(ctx, data.buildingId);
  const floor = await prisma.floor.create({
    data: { buildingId: data.buildingId, floorNumber: data.floorNumber },
    select: floorSelect,
  });
  invalidatePropertyCache(ctx.userId);
  return floor;
}

export async function updateFloor(
  ctx: PropertyAccessContext,
  id: IdInput,
  data: { floorNumber?: number; buildingId?: bigint },
) {
  const floorId = parseId(id);
  await assertUserOwnsFloor(ctx, floorId);
  if (data.buildingId) await assertUserOwnsBuilding(ctx, data.buildingId);
  const floor = await prisma.floor.update({
    where: { id: floorId },
    data: { floorNumber: data.floorNumber, buildingId: data.buildingId },
    select: floorSelect,
  });
  invalidatePropertyCache(ctx.userId);
  return floor;
}

export async function deleteFloor(ctx: PropertyAccessContext, id: IdInput) {
  const floorId = parseId(id);
  await assertUserOwnsFloor(ctx, floorId);
  await prisma.floor.delete({ where: { id: floorId } });
  invalidatePropertyCache(ctx.userId);
}
