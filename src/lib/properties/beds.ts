import { prisma } from "@/lib/db";
import { parseId, type IdInput } from "@/lib/ids";
import type { PropertyAccessContext } from "@/lib/properties/ownership";
import { assertUserOwnsBed, assertUserOwnsRoom, ownerPropertyFilter } from "@/lib/properties/ownership";

const bedSelect = {
  id: true,
  bedType: true,
  roomId: true,
  createdAt: true,
  updatedAt: true,
  room: {
    select: {
      id: true,
      name: true,
      unit: {
        select: {
          id: true,
          unitNumber: true,
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
        },
      },
    },
  },
} as const;

export async function listBeds(
  ctx: PropertyAccessContext,
  filters: { roomId?: bigint; unitId?: bigint; propertyId?: bigint } = {},
) {
  return prisma.bed.findMany({
    where: {
      ...(filters.roomId ? { roomId: filters.roomId } : {}),
      ...(filters.unitId ? { room: { unitId: filters.unitId } } : {}),
      ...(filters.propertyId
        ? { room: { unit: { floor: { building: { propertyId: filters.propertyId } } } } }
        : {}),
      room: { unit: { floor: { building: { property: ownerPropertyFilter(ctx) } } } },
    },
    select: bedSelect,
    orderBy: { createdAt: "asc" },
  });
}

export async function getBed(ctx: PropertyAccessContext, id: IdInput) {
  const bedId = parseId(id);
  await assertUserOwnsBed(ctx, bedId);
  const bed = await prisma.bed.findUnique({
    where: { id: bedId },
    select: bedSelect,
  });
  if (!bed) throw new Error("NOT_FOUND");
  return bed;
}

export async function createBed(
  ctx: PropertyAccessContext,
  data: { roomId: bigint; bedType: "SINGLE" | "DOUBLE" | "BUNK" },
) {
  await assertUserOwnsRoom(ctx, data.roomId);
  return prisma.bed.create({
    data: { roomId: data.roomId, bedType: data.bedType },
    select: bedSelect,
  });
}

export async function updateBed(
  ctx: PropertyAccessContext,
  id: IdInput,
  data: { bedType?: "SINGLE" | "DOUBLE" | "BUNK"; roomId?: bigint },
) {
  const bedId = parseId(id);
  await assertUserOwnsBed(ctx, bedId);
  if (data.roomId) await assertUserOwnsRoom(ctx, data.roomId);
  return prisma.bed.update({
    where: { id: bedId },
    data: { bedType: data.bedType, roomId: data.roomId },
    select: bedSelect,
  });
}

export async function deleteBed(ctx: PropertyAccessContext, id: IdInput) {
  const bedId = parseId(id);
  await assertUserOwnsBed(ctx, bedId);
  await prisma.bed.delete({ where: { id: bedId } });
}
