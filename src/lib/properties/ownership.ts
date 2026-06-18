import type { Session } from "next-auth";
import { getVisibleAdminNavItems } from "@/lib/admin/nav";
import { ForbiddenError } from "@/lib/errors";
import { prisma } from "@/lib/db";
import { parseId, resolveUserId, type IdInput } from "@/lib/ids";

export type PropertyAccessContext = {
  userId: bigint;
  isStaff: boolean;
};

export async function getPropertyAccessContext(
  session: Session | null,
): Promise<PropertyAccessContext> {
  if (!session?.user?.id) {
    throw new ForbiddenError("Unauthorized");
  }

  const userId = await resolveUserId(session.user.id);
  const adminNav = await getVisibleAdminNavItems(session.user.id);
  const isStaff = adminNav.length > 0;

  return { userId, isStaff };
}

export async function getOwnedPropertyIds(userId: bigint): Promise<bigint[]> {
  const rows = await prisma.property.findMany({
    where: { ownerId: userId },
    select: { id: true },
  });
  return rows.map((row) => row.id);
}

export async function getPropertyIdForBuilding(buildingId: bigint): Promise<bigint> {
  const building = await prisma.building.findUnique({
    where: { id: buildingId },
    select: { propertyId: true },
  });
  if (!building) throw new Error("NOT_FOUND");
  return building.propertyId;
}

export async function getPropertyIdForFloor(floorId: bigint): Promise<bigint> {
  const floor = await prisma.floor.findUnique({
    where: { id: floorId },
    select: { building: { select: { propertyId: true } } },
  });
  if (!floor) throw new Error("NOT_FOUND");
  return floor.building.propertyId;
}

export async function getPropertyIdForUnit(unitId: bigint): Promise<bigint> {
  const unit = await prisma.unit.findUnique({
    where: { id: unitId },
    select: { floor: { select: { building: { select: { propertyId: true } } } } },
  });
  if (!unit) throw new Error("NOT_FOUND");
  return unit.floor.building.propertyId;
}

export async function getPropertyIdForRoom(roomId: bigint): Promise<bigint> {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: {
      unit: { select: { floor: { select: { building: { select: { propertyId: true } } } } } },
    },
  });
  if (!room) throw new Error("NOT_FOUND");
  return room.unit.floor.building.propertyId;
}

export async function getPropertyIdForBed(bedId: bigint): Promise<bigint> {
  const bed = await prisma.bed.findUnique({
    where: { id: bedId },
    select: {
      room: {
        select: {
          unit: { select: { floor: { select: { building: { select: { propertyId: true } } } } } },
        },
      },
    },
  });
  if (!bed) throw new Error("NOT_FOUND");
  return bed.room.unit.floor.building.propertyId;
}

export async function assertUserOwnsProperty(
  ctx: PropertyAccessContext,
  propertyId: bigint,
): Promise<void> {
  if (ctx.isStaff) return;

  const property = await prisma.property.findFirst({
    where: { id: propertyId, ownerId: ctx.userId },
    select: { id: true },
  });
  if (!property) {
    throw new ForbiddenError("You do not own this property");
  }
}

export async function assertUserOwnsBuilding(
  ctx: PropertyAccessContext,
  buildingId: IdInput,
): Promise<bigint> {
  const id = parseId(buildingId);
  const propertyId = await getPropertyIdForBuilding(id);
  await assertUserOwnsProperty(ctx, propertyId);
  return propertyId;
}

export async function assertUserOwnsFloor(
  ctx: PropertyAccessContext,
  floorId: IdInput,
): Promise<bigint> {
  const id = parseId(floorId);
  const propertyId = await getPropertyIdForFloor(id);
  await assertUserOwnsProperty(ctx, propertyId);
  return propertyId;
}

export async function assertUserOwnsUnit(
  ctx: PropertyAccessContext,
  unitId: IdInput,
): Promise<bigint> {
  const id = parseId(unitId);
  const propertyId = await getPropertyIdForUnit(id);
  await assertUserOwnsProperty(ctx, propertyId);
  return propertyId;
}

export async function assertUserOwnsRoom(
  ctx: PropertyAccessContext,
  roomId: IdInput,
): Promise<bigint> {
  const id = parseId(roomId);
  const propertyId = await getPropertyIdForRoom(id);
  await assertUserOwnsProperty(ctx, propertyId);
  return propertyId;
}

export async function assertUserOwnsBed(
  ctx: PropertyAccessContext,
  bedId: IdInput,
): Promise<bigint> {
  const id = parseId(bedId);
  const propertyId = await getPropertyIdForBed(id);
  await assertUserOwnsProperty(ctx, propertyId);
  return propertyId;
}

export function ownerPropertyFilter(ctx: PropertyAccessContext) {
  if (ctx.isStaff) return {};
  return { ownerId: ctx.userId };
}

export function ownerTenantFilter(ctx: PropertyAccessContext) {
  if (ctx.isStaff) return {};
  return { ownerId: ctx.userId };
}

export async function assertUserOwnsTenant(
  ctx: PropertyAccessContext,
  tenantId: IdInput,
): Promise<void> {
  if (ctx.isStaff) return;
  const tenant = await prisma.tenant.findFirst({
    where: { id: parseId(tenantId), ownerId: ctx.userId },
    select: { id: true },
  });
  if (!tenant) throw new ForbiddenError("You do not own this tenant record");
}

export async function assertUserOwnsRent(
  ctx: PropertyAccessContext,
  rentId: IdInput,
): Promise<void> {
  const rent = await prisma.rent.findUnique({
    where: { id: parseId(rentId) },
    select: {
      tenant: { select: { ownerId: true } },
      unitId: true,
    },
  });
  if (!rent) throw new Error("NOT_FOUND");
  if (!ctx.isStaff && rent.tenant.ownerId !== ctx.userId) {
    throw new ForbiddenError("You do not own this rent record");
  }
  await assertUserOwnsUnit(ctx, rent.unitId);
}
