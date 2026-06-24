import { prisma } from "@/lib/db";
import { parseId, type IdInput } from "@/lib/ids";
import type { PropertyAccessContext } from "@/lib/properties/ownership";
import { assertUserOwnsTenant } from "@/lib/properties/ownership";
import { createRent } from "@/lib/properties/rents";
import { calcDueDateFromPeriodStart } from "@/lib/properties/rent-calculations";
import { getActiveTenantAssignment } from "@/lib/properties/tenant-assignments";

export async function recordTenantExit(
  ctx: PropertyAccessContext,
  tenantId: IdInput,
  data: {
    startDate: Date;
    endDate: Date;
    electricityUnits?: number;
    gasUnits?: number;
    maintenance?: number;
    misc?: number;
    dueDate?: Date;
  },
) {
  await assertUserOwnsTenant(ctx, tenantId);
  const parsedTenantId = parseId(tenantId);

  if (data.endDate < data.startDate) {
    throw new Error("BAD_REQUEST:Exit date must be on or after the period start date");
  }

  const assignment = await getActiveTenantAssignment(ctx, parsedTenantId);
  if (!assignment) {
    throw new Error("BAD_REQUEST:No active assignment found for this tenant");
  }

  const monthlyRent =
    assignment.monthlyRent != null ? Number(assignment.monthlyRent) : null;
  if (monthlyRent == null || monthlyRent <= 0) {
    throw new Error("BAD_REQUEST:Active assignment has no monthly rent");
  }

  const dueDate =
    data.dueDate ??
    (assignment.monthlyDueDay != null
      ? new Date(
          calcDueDateFromPeriodStart(
            data.startDate.toISOString().slice(0, 10),
            assignment.monthlyDueDay,
          ) + "T00:00:00",
        )
      : data.endDate);

  const rent = await createRent(ctx, {
    tenantId: parsedTenantId,
    unitId: assignment.unitId,
    tenantAssignmentId: assignment.id,
    startDate: data.startDate,
    endDate: data.endDate,
    rent: monthlyRent,
    electricityUnits: data.electricityUnits,
    gasUnits: data.gasUnits,
    maintenance: data.maintenance,
    misc: data.misc,
    dueDate,
    isExitRent: true,
  });

  await prisma.$transaction([
    prisma.tenantAssignment.update({
      where: { id: assignment.id },
      data: {
        isActive: false,
        leaseTo: data.endDate,
      },
    }),
    prisma.tenant.update({
      where: { id: parsedTenantId },
      data: { unitId: null },
    }),
  ]);

  return rent;
}
