import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { parseId, type IdInput } from "@/lib/ids";
import type { PropertyAccessContext } from "@/lib/properties/ownership";
import { assertUserOwnsRoom, assertUserOwnsUnit, ownerPropertyFilter } from "@/lib/properties/ownership";

const roomSelect = {
  id: true,
  name: true,
  roomType: true,
  area: true,
  unitId: true,
  createdAt: true,
  updatedAt: true,
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
} as const;

export async function listRooms(
  ctx: PropertyAccessContext,
  filters: { unitId?: bigint; floorId?: bigint; propertyId?: bigint } = {},
) {
  return prisma.room.findMany({
    where: {
      ...(filters.unitId ? { unitId: filters.unitId } : {}),
      ...(filters.floorId ? { unit: { floorId: filters.floorId } } : {}),
      ...(filters.propertyId
        ? { unit: { floor: { building: { propertyId: filters.propertyId } } } }
        : {}),
      unit: { floor: { building: { property: ownerPropertyFilter(ctx) } } },
    },
    select: roomSelect,
    orderBy: { name: "asc" },
  });
}

export async function getRoom(ctx: PropertyAccessContext, id: IdInput) {
  const roomId = parseId(id);
  await assertUserOwnsRoom(ctx, roomId);
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: roomSelect,
  });
  if (!room) throw new Error("NOT_FOUND");
  return room;
}

export async function createRoom(
  ctx: PropertyAccessContext,
  data: {
    unitId: bigint;
    name: string;
    roomType: "BEDROOM" | "KITCHEN" | "BATHROOM" | "OFFICE_ROOM";
    area?: number;
  },
) {
  await assertUserOwnsUnit(ctx, data.unitId);
  return prisma.room.create({
    data: {
      unitId: data.unitId,
      name: data.name,
      roomType: data.roomType,
      area: data.area != null ? new Prisma.Decimal(data.area) : null,
    },
    select: roomSelect,
  });
}

export async function updateRoom(
  ctx: PropertyAccessContext,
  id: IdInput,
  data: {
    name?: string;
    roomType?: "BEDROOM" | "KITCHEN" | "BATHROOM" | "OFFICE_ROOM";
    area?: number | null;
    unitId?: bigint;
  },
) {
  const roomId = parseId(id);
  await assertUserOwnsRoom(ctx, roomId);
  if (data.unitId) await assertUserOwnsUnit(ctx, data.unitId);
  return prisma.room.update({
    where: { id: roomId },
    data: {
      name: data.name,
      roomType: data.roomType,
      area: data.area != null ? new Prisma.Decimal(data.area) : data.area,
      unitId: data.unitId,
    },
    select: roomSelect,
  });
}

export async function deleteRoom(ctx: PropertyAccessContext, id: IdInput) {
  const roomId = parseId(id);
  await assertUserOwnsRoom(ctx, roomId);
  await prisma.room.delete({ where: { id: roomId } });
}
