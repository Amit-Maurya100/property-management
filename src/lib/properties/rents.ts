import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { parseId, type IdInput } from "@/lib/ids";
import type { PropertyAccessContext } from "@/lib/properties/ownership";
import {
  assertUserOwnsRent,
  assertUserOwnsTenant,
  assertUserOwnsUnit,
} from "@/lib/properties/ownership";

const rentSelect = {
  id: true,
  tenantId: true,
  unitId: true,
  startDate: true,
  endDate: true,
  rent: true,
  totalRent: true,
  electricityUnits: true,
  gasUnits: true,
  maintenance: true,
  misc: true,
  dueDate: true,
  utilityBaseline: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  tenant: {
    select: { id: true, firstName: true, lastName: true, email: true, phone: true },
  },
  unit: {
    select: {
      id: true,
      unitNumber: true,
      floor: {
        select: {
          floorNumber: true,
          building: {
            select: { name: true, property: { select: { name: true } } },
          },
        },
      },
    },
  },
} as const;

export async function listRents(
  ctx: PropertyAccessContext,
  filters: { tenantId?: bigint; unitId?: bigint } = {},
) {
  const ownerFilter = ctx.isStaff
    ? {}
    : {
        tenant: { ownerId: ctx.userId },
        unit: { floor: { building: { property: { ownerId: ctx.userId } } } },
      };

  return prisma.rent.findMany({
    where: {
      ...(filters.tenantId ? { tenantId: filters.tenantId } : {}),
      ...(filters.unitId ? { unitId: filters.unitId } : {}),
      ...ownerFilter,
    },
    select: rentSelect,
    orderBy: [{ startDate: "desc" }, { id: "desc" }],
  });
}

export async function getRent(ctx: PropertyAccessContext, id: IdInput) {
  await assertUserOwnsRent(ctx, id);
  const rent = await prisma.rent.findUnique({
    where: { id: parseId(id) },
    select: rentSelect,
  });
  if (!rent) throw new Error("NOT_FOUND");
  return rent;
}

export async function createRent(
  ctx: PropertyAccessContext,
  data: {
    tenantId: bigint;
    unitId: bigint;
    startDate: Date;
    endDate?: Date;
    rent: number;
    totalRent?: number;
    electricityUnits?: number;
    gasUnits?: number;
    maintenance?: number;
    misc?: number;
    dueDate: Date;
    utilityBaseline?: { electricityUnits: number; gasUnits: number };
    isActive?: boolean;
  },
) {
  await assertUserOwnsTenant(ctx, data.tenantId);
  await assertUserOwnsUnit(ctx, data.unitId);

  const isActive = data.isActive ?? true;

  return prisma.$transaction(async (tx) => {
    if (isActive) {
      await tx.rent.updateMany({
        where: {
          tenantId: data.tenantId,
          unitId: data.unitId,
          isActive: true,
        },
        data: { isActive: false },
      });
    }

    return tx.rent.create({
      data: {
        tenantId: data.tenantId,
        unitId: data.unitId,
        startDate: data.startDate,
        endDate: data.endDate ?? null,
        rent: new Prisma.Decimal(data.rent),
        totalRent: data.totalRent != null ? new Prisma.Decimal(data.totalRent) : null,
        electricityUnits:
          data.electricityUnits != null ? new Prisma.Decimal(data.electricityUnits) : null,
        gasUnits: data.gasUnits != null ? new Prisma.Decimal(data.gasUnits) : null,
        maintenance: data.maintenance != null ? new Prisma.Decimal(data.maintenance) : null,
        misc: data.misc != null ? new Prisma.Decimal(data.misc) : null,
        dueDate: data.dueDate,
        utilityBaseline: data.utilityBaseline ?? undefined,
        isActive,
      },
      select: rentSelect,
    });
  });
}

export async function updateRent(
  ctx: PropertyAccessContext,
  id: IdInput,
  data: {
    tenantId?: bigint;
    unitId?: bigint;
    startDate?: Date;
    endDate?: Date | null;
    rent?: number;
    totalRent?: number | null;
    electricityUnits?: number | null;
    gasUnits?: number | null;
    maintenance?: number | null;
    misc?: number | null;
    dueDate?: Date;
    utilityBaseline?: { electricityUnits: number; gasUnits: number } | null;
    isActive?: boolean;
  },
) {
  await assertUserOwnsRent(ctx, id);
  if (data.tenantId) await assertUserOwnsTenant(ctx, data.tenantId);
  if (data.unitId) await assertUserOwnsUnit(ctx, data.unitId);

  const rentId = parseId(id);
  const existing = await prisma.rent.findUnique({
    where: { id: rentId },
    select: { tenantId: true, unitId: true },
  });
  if (!existing) throw new Error("NOT_FOUND");

  const tenantId = data.tenantId ?? existing.tenantId;
  const unitId = data.unitId ?? existing.unitId;

  return prisma.$transaction(async (tx) => {
    if (data.isActive) {
      await tx.rent.updateMany({
        where: {
          tenantId,
          unitId,
          isActive: true,
          id: { not: rentId },
        },
        data: { isActive: false },
      });
    }

    return tx.rent.update({
      where: { id: rentId },
      data: {
        tenantId: data.tenantId,
        unitId: data.unitId,
        startDate: data.startDate,
        endDate: data.endDate,
        rent: data.rent != null ? new Prisma.Decimal(data.rent) : undefined,
        totalRent:
          data.totalRent != null ? new Prisma.Decimal(data.totalRent) : data.totalRent,
        electricityUnits:
          data.electricityUnits != null
            ? new Prisma.Decimal(data.electricityUnits)
            : data.electricityUnits,
        gasUnits:
          data.gasUnits != null ? new Prisma.Decimal(data.gasUnits) : data.gasUnits,
        maintenance:
          data.maintenance != null ? new Prisma.Decimal(data.maintenance) : data.maintenance,
        misc: data.misc != null ? new Prisma.Decimal(data.misc) : data.misc,
        dueDate: data.dueDate,
        utilityBaseline:
          data.utilityBaseline === null
            ? Prisma.JsonNull
            : data.utilityBaseline,
        isActive: data.isActive,
      },
      select: rentSelect,
    });
  });
}

export async function deleteRent(ctx: PropertyAccessContext, id: IdInput) {
  await assertUserOwnsRent(ctx, id);
  await prisma.rent.delete({ where: { id: parseId(id) } });
}
