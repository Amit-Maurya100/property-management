import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { parseId, type IdInput } from "@/lib/ids";
import type { PropertyAccessContext } from "@/lib/properties/ownership";
import {
  assertUserOwnsRent,
  assertUserOwnsTenant,
  assertUserOwnsUnit,
} from "@/lib/properties/ownership";
import {
  getBuildingIdForUnit,
  requireActiveBuildingUtilityRates,
} from "@/lib/properties/building-utility-rates";
import { getActiveTenantAssignment } from "@/lib/properties/tenant-assignments";
import { carryForwardTenantBalance } from "@/lib/properties/payments";
import {
  calcTotalRent,
  resolveUtilityBaselines,
} from "@/lib/properties/rent-calculations";

const rentSelect = {
  id: true,
  tenantId: true,
  tenantAssignmentId: true,
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
  utilityRateSnapshot: true,
  createdAt: true,
  updatedAt: true,
  tenant: {
    select: { id: true, firstName: true, lastName: true, email: true, phone: true },
  },
  tenantAssignment: {
    select: {
      id: true,
      monthlyRent: true,
      leaseFrom: true,
      leaseTo: true,
      monthlyDueDay: true,
      isActive: true,
    },
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

async function resolveTenantAssignmentId(
  ctx: PropertyAccessContext,
  tenantId: bigint,
  unitId: bigint,
  tenantAssignmentId?: bigint,
) {
  if (tenantAssignmentId != null) {
    const assignment = await prisma.tenantAssignment.findFirst({
      where: {
        id: tenantAssignmentId,
        tenantId,
        unitId,
      },
      select: { id: true },
    });
    if (!assignment) {
      throw new Error("BAD_REQUEST:Assignment does not match tenant and unit");
    }
    return tenantAssignmentId;
  }

  const active = await getActiveTenantAssignment(ctx, tenantId, unitId);
  if (!active) {
    throw new Error("BAD_REQUEST:No active assignment found for this tenant and unit");
  }
  return active.id;
}

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
    tenantAssignmentId?: bigint;
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
    utilityRateSnapshot?: {
      electricityUnitRate: number;
      gasUnitRate: number;
      cleaningCharge: number;
    };
  },
) {
  await assertUserOwnsTenant(ctx, data.tenantId);
  await assertUserOwnsUnit(ctx, data.unitId);

  const tenantAssignmentId = await resolveTenantAssignmentId(
    ctx,
    data.tenantId,
    data.unitId,
    data.tenantAssignmentId,
  );

  const buildingId = await getBuildingIdForUnit(data.unitId);
  const utilityRateSnapshot = await requireActiveBuildingUtilityRates(
    buildingId,
    data.startDate,
  );

  const priorBills = await prisma.rent.findMany({
    where: { tenantId: data.tenantId },
    select: {
      id: true,
      startDate: true,
      electricityUnits: true,
      gasUnits: true,
      utilityBaseline: true,
    },
    orderBy: [{ startDate: "desc" }, { id: "desc" }],
  });

  const assignment = await prisma.tenantAssignment.findUnique({
    where: { id: tenantAssignmentId },
    select: { initialElectricityUnits: true, initialGasUnits: true },
  });

  const baseline = resolveUtilityBaselines({
    assignment: assignment
      ? {
          initialElectricityUnits:
            assignment.initialElectricityUnits != null
              ? Number(assignment.initialElectricityUnits)
              : null,
          initialGasUnits:
            assignment.initialGasUnits != null ? Number(assignment.initialGasUnits) : null,
        }
      : {},
    monthlyBills: priorBills.map((bill) => ({
      id: String(bill.id),
      startDate: bill.startDate.toISOString().slice(0, 10),
      electricityUnits:
        bill.electricityUnits != null ? Number(bill.electricityUnits) : null,
      gasUnits: bill.gasUnits != null ? Number(bill.gasUnits) : null,
      utilityBaseline: bill.utilityBaseline,
    })),
    savedBaseline: data.utilityBaseline,
    periodStartDate: data.startDate.toISOString().slice(0, 10),
  });

  const computedTotalRent = calcTotalRent({
    monthlyRent: data.rent,
    electricityUnits: data.electricityUnits ?? 0,
    gasUnits: data.gasUnits ?? 0,
    baselineElectricityUnits: baseline.electricityUnits,
    baselineGasUnits: baseline.gasUnits,
    maintenance: data.maintenance ?? 0,
    misc: data.misc ?? 0,
    rates: utilityRateSnapshot,
  });

  return prisma.$transaction(async (tx) => {
    const priorBalance = await carryForwardTenantBalance(tx, data.tenantId);

    return tx.rent.create({
      data: {
        tenantId: data.tenantId,
        tenantAssignmentId,
        unitId: data.unitId,
        startDate: data.startDate,
        endDate: data.endDate ?? null,
        rent: new Prisma.Decimal(data.rent),
        totalRent: new Prisma.Decimal(computedTotalRent),
        electricityUnits:
          data.electricityUnits != null ? new Prisma.Decimal(data.electricityUnits) : null,
        gasUnits: data.gasUnits != null ? new Prisma.Decimal(data.gasUnits) : null,
        maintenance: data.maintenance != null ? new Prisma.Decimal(data.maintenance) : null,
        misc: data.misc != null ? new Prisma.Decimal(data.misc) : null,
        dueDate: data.dueDate,
        utilityBaseline: data.utilityBaseline ?? undefined,
        utilityRateSnapshot,
        priorBalance: new Prisma.Decimal(priorBalance),
        paymentStatus: "PENDING",
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
    tenantAssignmentId?: bigint;
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
  },
) {
  await assertUserOwnsRent(ctx, id);
  if (data.tenantId) await assertUserOwnsTenant(ctx, data.tenantId);
  if (data.unitId) await assertUserOwnsUnit(ctx, data.unitId);

  const rentId = parseId(id);
  const existing = await prisma.rent.findUnique({
    where: { id: rentId },
    select: {
      tenantId: true,
      unitId: true,
      tenantAssignmentId: true,
      startDate: true,
      rent: true,
      electricityUnits: true,
      gasUnits: true,
      maintenance: true,
      misc: true,
      utilityBaseline: true,
    },
  });
  if (!existing) throw new Error("NOT_FOUND");

  const tenantId = data.tenantId ?? existing.tenantId;
  const unitId = data.unitId ?? existing.unitId;
  const startDate = data.startDate ?? existing.startDate;
  const tenantAssignmentId =
    data.tenantAssignmentId ??
    (data.tenantId || data.unitId
      ? await resolveTenantAssignmentId(ctx, tenantId, unitId, data.tenantAssignmentId)
      : existing.tenantAssignmentId);

  const buildingId = await getBuildingIdForUnit(unitId);
  const utilityRateSnapshot = await requireActiveBuildingUtilityRates(buildingId, startDate);

  const priorBills = await prisma.rent.findMany({
    where: { tenantId },
    select: {
      id: true,
      startDate: true,
      electricityUnits: true,
      gasUnits: true,
      utilityBaseline: true,
    },
    orderBy: [{ startDate: "desc" }, { id: "desc" }],
  });

  const assignment = await prisma.tenantAssignment.findUnique({
    where: { id: tenantAssignmentId },
    select: { initialElectricityUnits: true, initialGasUnits: true },
  });

  const utilityBaseline =
    data.utilityBaseline === null
      ? null
      : data.utilityBaseline ??
        (existing.utilityBaseline as { electricityUnits: number; gasUnits: number } | null);

  const baseline = resolveUtilityBaselines({
    assignment: assignment
      ? {
          initialElectricityUnits:
            assignment.initialElectricityUnits != null
              ? Number(assignment.initialElectricityUnits)
              : null,
          initialGasUnits:
            assignment.initialGasUnits != null ? Number(assignment.initialGasUnits) : null,
        }
      : {},
    monthlyBills: priorBills.map((bill) => ({
      id: String(bill.id),
      startDate: bill.startDate.toISOString().slice(0, 10),
      electricityUnits:
        bill.electricityUnits != null ? Number(bill.electricityUnits) : null,
      gasUnits: bill.gasUnits != null ? Number(bill.gasUnits) : null,
      utilityBaseline: bill.utilityBaseline,
    })),
    savedBaseline: utilityBaseline ?? undefined,
    periodStartDate: startDate.toISOString().slice(0, 10),
    excludeRentId: String(rentId),
  });

  const monthlyRent = data.rent ?? Number(existing.rent);
  const electricityUnits =
    data.electricityUnits != null
      ? data.electricityUnits
      : existing.electricityUnits != null
        ? Number(existing.electricityUnits)
        : 0;
  const gasUnits =
    data.gasUnits != null ? data.gasUnits : existing.gasUnits != null ? Number(existing.gasUnits) : 0;
  const maintenance =
    data.maintenance != null
      ? data.maintenance
      : existing.maintenance != null
        ? Number(existing.maintenance)
        : 0;
  const misc =
    data.misc != null ? data.misc : existing.misc != null ? Number(existing.misc) : 0;

  const computedTotalRent = calcTotalRent({
    monthlyRent,
    electricityUnits,
    gasUnits,
    baselineElectricityUnits: baseline.electricityUnits,
    baselineGasUnits: baseline.gasUnits,
    maintenance,
    misc,
    rates: utilityRateSnapshot,
  });

  return prisma.rent.update({
    where: { id: rentId },
    data: {
      tenantId: data.tenantId,
      unitId: data.unitId,
      tenantAssignmentId,
      startDate: data.startDate,
      endDate: data.endDate,
      rent: data.rent != null ? new Prisma.Decimal(data.rent) : undefined,
      totalRent: new Prisma.Decimal(computedTotalRent),
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
        data.utilityBaseline === null ? Prisma.JsonNull : data.utilityBaseline,
      utilityRateSnapshot,
    },
    select: rentSelect,
  });
}

export async function deleteRent(ctx: PropertyAccessContext, id: IdInput) {
  await assertUserOwnsRent(ctx, id);
  await prisma.rent.delete({ where: { id: parseId(id) } });
}
