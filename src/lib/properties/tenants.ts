import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { parseId, type IdInput } from "@/lib/ids";
import type { PropertyAccessContext } from "@/lib/properties/ownership";
import {
  assertUserOwnsTenant,
  assertUserOwnsUnit,
  ownerTenantFilter,
} from "@/lib/properties/ownership";

const tenantSelect = {
  id: true,
  unitId: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  idDocument: true,
  pictureUrl: true,
  initialRent: true,
  leaseFrom: true,
  leaseTo: true,
  monthlyDueDay: true,
  initialGasUnits: true,
  initialElectricityUnits: true,
  isActive: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  unit: {
    select: {
      id: true,
      unitNumber: true,
      floor: {
        select: {
          building: {
            select: { name: true, property: { select: { name: true } } },
          },
        },
      },
    },
  },
  _count: { select: { rents: true } },
} as const;

type TenantInput = {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  idDocument?: string;
  unitId?: bigint;
  pictureUrl?: string;
  initialRent?: number;
  leaseFrom?: Date;
  leaseTo?: Date;
  monthlyDueDay?: number;
  initialGasUnits?: number;
  initialElectricityUnits?: number;
  isActive?: boolean;
  notes?: string;
};

type TenantUpdateInput = Partial<Omit<TenantInput, "unitId">> & {
  email?: string | null;
  phone?: string | null;
  idDocument?: string | null;
  unitId?: bigint | null;
  pictureUrl?: string | null;
  initialRent?: number | null;
  leaseFrom?: Date | null;
  leaseTo?: Date | null;
  monthlyDueDay?: number | null;
  initialGasUnits?: number | null;
  initialElectricityUnits?: number | null;
  notes?: string | null;
};

function tenantCreateData(ctx: PropertyAccessContext, data: TenantInput) {
  return {
    ownerId: ctx.userId,
    unitId: data.unitId ?? null,
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email || null,
    phone: data.phone || null,
    idDocument: data.idDocument || null,
    pictureUrl: data.pictureUrl || null,
    initialRent: data.initialRent != null ? new Prisma.Decimal(data.initialRent) : null,
    leaseFrom: data.leaseFrom ?? null,
    leaseTo: data.leaseTo ?? null,
    monthlyDueDay: data.monthlyDueDay ?? null,
    initialGasUnits:
      data.initialGasUnits != null ? new Prisma.Decimal(data.initialGasUnits) : null,
    initialElectricityUnits:
      data.initialElectricityUnits != null
        ? new Prisma.Decimal(data.initialElectricityUnits)
        : null,
    isActive: data.isActive ?? true,
    notes: data.notes || null,
  };
}

function tenantUpdateData(data: TenantUpdateInput) {
  return {
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    phone: data.phone,
    idDocument: data.idDocument,
    unitId: data.unitId,
    pictureUrl: data.pictureUrl,
    initialRent:
      data.initialRent != null ? new Prisma.Decimal(data.initialRent) : data.initialRent,
    leaseFrom: data.leaseFrom,
    leaseTo: data.leaseTo,
    monthlyDueDay: data.monthlyDueDay,
    initialGasUnits:
      data.initialGasUnits != null
        ? new Prisma.Decimal(data.initialGasUnits)
        : data.initialGasUnits,
    initialElectricityUnits:
      data.initialElectricityUnits != null
        ? new Prisma.Decimal(data.initialElectricityUnits)
        : data.initialElectricityUnits,
    isActive: data.isActive,
    notes: data.notes,
  };
}

async function assertTenantUnitOwnership(
  ctx: PropertyAccessContext,
  unitId: bigint | null | undefined,
) {
  if (unitId != null) {
    await assertUserOwnsUnit(ctx, unitId);
  }
}

export async function listTenants(ctx: PropertyAccessContext) {
  return prisma.tenant.findMany({
    where: ownerTenantFilter(ctx),
    select: tenantSelect,
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
}

export async function getTenant(ctx: PropertyAccessContext, id: IdInput) {
  await assertUserOwnsTenant(ctx, id);
  const tenant = await prisma.tenant.findUnique({
    where: { id: parseId(id) },
    select: tenantSelect,
  });
  if (!tenant) throw new Error("NOT_FOUND");
  return tenant;
}

export async function createTenant(ctx: PropertyAccessContext, data: TenantInput) {
  await assertTenantUnitOwnership(ctx, data.unitId);
  return prisma.tenant.create({
    data: tenantCreateData(ctx, data),
    select: tenantSelect,
  });
}

export async function updateTenant(
  ctx: PropertyAccessContext,
  id: IdInput,
  data: TenantUpdateInput,
) {
  await assertUserOwnsTenant(ctx, id);
  await assertTenantUnitOwnership(ctx, data.unitId);
  return prisma.tenant.update({
    where: { id: parseId(id) },
    data: tenantUpdateData(data),
    select: tenantSelect,
  });
}

export async function deleteTenant(ctx: PropertyAccessContext, id: IdInput) {
  await assertUserOwnsTenant(ctx, id);
  const rentCount = await prisma.rent.count({ where: { tenantId: parseId(id) } });
  if (rentCount > 0) {
    throw new Error("BAD_REQUEST:Remove rent assignments before deleting this tenant");
  }
  await prisma.tenant.delete({ where: { id: parseId(id) } });
}
