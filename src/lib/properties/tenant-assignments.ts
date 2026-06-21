import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { ForbiddenError } from "@/lib/errors";
import { parseId, type IdInput } from "@/lib/ids";
import type { PropertyAccessContext } from "@/lib/properties/ownership";
import {
  assertUserOwnsTenant,
  assertUserOwnsUnit,
  ownerTenantFilter,
} from "@/lib/properties/ownership";

export const assignmentSelect = {
  id: true,
  tenantId: true,
  unitId: true,
  monthlyRent: true,
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
} as const;

type AssignmentInput = {
  tenantId: bigint;
  unitId: bigint;
  monthlyRent?: number;
  leaseFrom?: Date;
  leaseTo?: Date;
  monthlyDueDay?: number;
  initialGasUnits?: number;
  initialElectricityUnits?: number;
  isActive?: boolean;
  notes?: string;
};

type AssignmentUpdateInput = {
  unitId?: bigint;
  monthlyRent?: number | null;
  leaseFrom?: Date | null;
  leaseTo?: Date | null;
  monthlyDueDay?: number | null;
  initialGasUnits?: number | null;
  initialElectricityUnits?: number | null;
  isActive?: boolean;
  notes?: string | null;
};

function assignmentDateValue(value: Date | null | undefined): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const year = value.getUTCFullYear();
  const month = value.getUTCMonth();
  const day = value.getUTCDate();
  return new Date(Date.UTC(year, month, day));
}

function assignmentCreateData(data: AssignmentInput) {
  return {
    tenantId: data.tenantId,
    unitId: data.unitId,
    monthlyRent:
      data.monthlyRent != null ? new Prisma.Decimal(data.monthlyRent) : null,
    leaseFrom: assignmentDateValue(data.leaseFrom ?? null) ?? null,
    leaseTo: assignmentDateValue(data.leaseTo ?? null) ?? null,
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

function assignmentUpdateData(data: AssignmentUpdateInput & { unitId?: bigint }) {
  const update: Prisma.TenantAssignmentUncheckedUpdateInput = {};

  if (data.unitId !== undefined) update.unitId = data.unitId;
  if (data.monthlyRent !== undefined) {
    update.monthlyRent =
      data.monthlyRent != null ? new Prisma.Decimal(data.monthlyRent) : null;
  }
  if (data.leaseFrom !== undefined) {
    update.leaseFrom = assignmentDateValue(data.leaseFrom);
  }
  if (data.leaseTo !== undefined) {
    update.leaseTo = assignmentDateValue(data.leaseTo);
  }
  if (data.monthlyDueDay !== undefined) update.monthlyDueDay = data.monthlyDueDay;
  if (data.initialGasUnits !== undefined) {
    update.initialGasUnits =
      data.initialGasUnits != null ? new Prisma.Decimal(data.initialGasUnits) : null;
  }
  if (data.initialElectricityUnits !== undefined) {
    update.initialElectricityUnits =
      data.initialElectricityUnits != null
        ? new Prisma.Decimal(data.initialElectricityUnits)
        : null;
  }
  if (data.isActive !== undefined) update.isActive = data.isActive;
  if (data.notes !== undefined) update.notes = data.notes;

  return update;
}

async function deactivateOtherAssignments(
  tx: Prisma.TransactionClient,
  tenantId: bigint,
  unitId: bigint,
  exceptId?: bigint,
) {
  await tx.tenantAssignment.updateMany({
    where: {
      tenantId,
      unitId,
      isActive: true,
      ...(exceptId ? { id: { not: exceptId } } : {}),
    },
    data: { isActive: false },
  });
}

export async function listTenantAssignments(
  ctx: PropertyAccessContext,
  filters: { tenantId?: bigint; unitId?: bigint; activeOnly?: boolean } = {},
) {
  const ownerFilter = ctx.isStaff
    ? {}
    : { tenant: ownerTenantFilter(ctx) };

  return prisma.tenantAssignment.findMany({
    where: {
      ...(filters.tenantId ? { tenantId: filters.tenantId } : {}),
      ...(filters.unitId ? { unitId: filters.unitId } : {}),
      ...(filters.activeOnly ? { isActive: true } : {}),
      ...ownerFilter,
    },
    select: assignmentSelect,
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }, { id: "desc" }],
  });
}

export async function getTenantAssignment(ctx: PropertyAccessContext, id: IdInput) {
  await assertUserOwnsTenantAssignment(ctx, id);
  const assignment = await prisma.tenantAssignment.findUnique({
    where: { id: parseId(id) },
    select: assignmentSelect,
  });
  if (!assignment) throw new Error("NOT_FOUND");
  return assignment;
}

export async function getActiveTenantAssignment(
  ctx: PropertyAccessContext,
  tenantId: IdInput,
  unitId?: IdInput,
) {
  await assertUserOwnsTenant(ctx, tenantId);
  const parsedTenantId = parseId(tenantId);
  const parsedUnitId = unitId != null ? parseId(unitId) : undefined;

  return prisma.tenantAssignment.findFirst({
    where: {
      tenantId: parsedTenantId,
      ...(parsedUnitId != null ? { unitId: parsedUnitId } : {}),
      isActive: true,
    },
    select: assignmentSelect,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
}

export async function createTenantAssignment(
  ctx: PropertyAccessContext,
  data: AssignmentInput,
) {
  await assertUserOwnsTenant(ctx, data.tenantId);
  await assertUserOwnsUnit(ctx, data.unitId);

  const isActive = data.isActive ?? true;

  return prisma.$transaction(async (tx) => {
    if (isActive) {
      await deactivateOtherAssignments(tx, data.tenantId, data.unitId);
    }

    const assignment = await tx.tenantAssignment.create({
      data: assignmentCreateData(data),
      select: assignmentSelect,
    });

    if (isActive) {
      await tx.tenant.update({
        where: { id: data.tenantId },
        data: { unitId: data.unitId },
      });
    }

    return assignment;
  });
}

export async function updateTenantAssignment(
  ctx: PropertyAccessContext,
  id: IdInput,
  data: AssignmentUpdateInput,
) {
  await assertUserOwnsTenantAssignment(ctx, id);
  const assignmentId = parseId(id);

  const existing = await prisma.tenantAssignment.findUnique({
    where: { id: assignmentId },
    select: { tenantId: true, unitId: true },
  });
  if (!existing) throw new Error("NOT_FOUND");

  const unitId = data.unitId ?? existing.unitId;
  if (data.unitId) await assertUserOwnsUnit(ctx, data.unitId);

  return prisma.$transaction(async (tx) => {
    if (data.isActive === true) {
      await deactivateOtherAssignments(
        tx,
        existing.tenantId,
        unitId,
        assignmentId,
      );
    }

    const updateData = assignmentUpdateData({ ...data, unitId });
    if (Object.keys(updateData).length === 0) {
      throw new Error("BAD_REQUEST:No assignment fields to update");
    }

    const assignment = await tx.tenantAssignment.update({
      where: { id: assignmentId },
      data: updateData,
      select: assignmentSelect,
    });

    if (data.isActive === true) {
      await tx.tenant.update({
        where: { id: existing.tenantId },
        data: { unitId },
      });
    }

    return assignment;
  });
}

export async function deleteTenantAssignment(ctx: PropertyAccessContext, id: IdInput) {
  await assertUserOwnsTenantAssignment(ctx, id);
  const assignmentId = parseId(id);
  const rentCount = await prisma.rent.count({
    where: { tenantAssignmentId: assignmentId },
  });
  if (rentCount > 0) {
    throw new Error("BAD_REQUEST:Remove rent bills linked to this assignment before deleting");
  }
  await prisma.tenantAssignment.delete({ where: { id: assignmentId } });
}

export async function assertUserOwnsTenantAssignment(
  ctx: PropertyAccessContext,
  assignmentId: IdInput,
): Promise<void> {
  const assignment = await prisma.tenantAssignment.findUnique({
    where: { id: parseId(assignmentId) },
    select: {
      tenant: { select: { ownerId: true } },
      unitId: true,
    },
  });
  if (!assignment) throw new Error("NOT_FOUND");
  if (!ctx.isStaff && assignment.tenant.ownerId !== ctx.userId) {
    throw new ForbiddenError("You do not own this tenant assignment");
  }
  await assertUserOwnsUnit(ctx, assignment.unitId);
}
