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
  assertUserOwnsBuilding,
  assertUserOwnsProperty,
  ownerPropertyFilter,
} from "@/lib/properties/ownership";

const buildingSelect = {
  id: true,
  name: true,
  propertyId: true,
  createdAt: true,
  updatedAt: true,
  property: { select: { id: true, name: true } },
} as const;

export async function listBuildings(
  ctx: PropertyAccessContext,
  filters: { propertyId?: bigint } = {},
) {
  const propertyFilter = ownerPropertyFilter(ctx);
  return cachedQuery(
    propertyCacheKey(ctx.userId, "buildings", filters),
    SERVER_CACHE_TTL.reference,
    () =>
      prisma.building.findMany({
        where: {
          ...(filters.propertyId ? { propertyId: filters.propertyId } : {}),
          property: propertyFilter,
        },
        select: buildingSelect,
        orderBy: { name: "asc" },
      }),
  );
}

export async function getBuilding(ctx: PropertyAccessContext, id: IdInput) {
  const buildingId = parseId(id);
  await assertUserOwnsBuilding(ctx, buildingId);
  const building = await prisma.building.findUnique({
    where: { id: buildingId },
    select: buildingSelect,
  });
  if (!building) throw new Error("NOT_FOUND");
  return building;
}

export async function createBuilding(
  ctx: PropertyAccessContext,
  data: { propertyId: bigint; name: string },
) {
  await assertUserOwnsProperty(ctx, data.propertyId);
  const building = await prisma.building.create({
    data: { propertyId: data.propertyId, name: data.name },
    select: buildingSelect,
  });
  invalidatePropertyCache(ctx.userId);
  return building;
}

export async function updateBuilding(
  ctx: PropertyAccessContext,
  id: IdInput,
  data: { name?: string; propertyId?: bigint },
) {
  const buildingId = parseId(id);
  await assertUserOwnsBuilding(ctx, buildingId);
  if (data.propertyId) await assertUserOwnsProperty(ctx, data.propertyId);
  const building = await prisma.building.update({
    where: { id: buildingId },
    data: { name: data.name, propertyId: data.propertyId },
    select: buildingSelect,
  });
  invalidatePropertyCache(ctx.userId);
  return building;
}

export async function deleteBuilding(ctx: PropertyAccessContext, id: IdInput) {
  const buildingId = parseId(id);
  await assertUserOwnsBuilding(ctx, buildingId);
  await prisma.building.delete({ where: { id: buildingId } });
  invalidatePropertyCache(ctx.userId);
}
