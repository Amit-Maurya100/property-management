import { prisma } from "@/lib/db";
import { parseId, type IdInput } from "@/lib/ids";
import type { PropertyAccessContext } from "@/lib/properties/ownership";
import { assertUserOwnsUnit } from "@/lib/properties/ownership";

const availabilitySelect = {
  id: true,
  unitId: true,
  availableFrom: true,
  availableTo: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function listAvailability(ctx: PropertyAccessContext, unitId: IdInput) {
  await assertUserOwnsUnit(ctx, unitId);
  return prisma.availability.findMany({
    where: { unitId: parseId(unitId) },
    select: availabilitySelect,
    orderBy: { createdAt: "desc" },
  });
}

export async function createAvailability(
  ctx: PropertyAccessContext,
  unitId: IdInput,
  data: {
    availableFrom?: Date;
    availableTo?: Date;
    status: "AVAILABLE" | "RESERVED" | "OCCUPIED";
  },
) {
  const id = parseId(unitId);
  await assertUserOwnsUnit(ctx, id);
  return prisma.availability.create({
    data: {
      unitId: id,
      availableFrom: data.availableFrom,
      availableTo: data.availableTo,
      status: data.status,
    },
    select: availabilitySelect,
  });
}

export async function updateAvailability(
  ctx: PropertyAccessContext,
  availabilityId: IdInput,
  data: {
    availableFrom?: Date | null;
    availableTo?: Date | null;
    status?: "AVAILABLE" | "RESERVED" | "OCCUPIED";
  },
) {
  const id = parseId(availabilityId);
  const existing = await prisma.availability.findUnique({
    where: { id },
    select: { unitId: true },
  });
  if (!existing) throw new Error("NOT_FOUND");
  await assertUserOwnsUnit(ctx, existing.unitId);
  return prisma.availability.update({
    where: { id },
    data,
    select: availabilitySelect,
  });
}

export async function deleteAvailability(
  ctx: PropertyAccessContext,
  availabilityId: IdInput,
) {
  const id = parseId(availabilityId);
  const existing = await prisma.availability.findUnique({
    where: { id },
    select: { unitId: true },
  });
  if (!existing) throw new Error("NOT_FOUND");
  await assertUserOwnsUnit(ctx, existing.unitId);
  await prisma.availability.delete({ where: { id } });
}
