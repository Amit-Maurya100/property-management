import type { Session } from "next-auth";
import { ForbiddenError } from "@/lib/errors";
import { prisma } from "@/lib/db";
import { resolveUserId } from "@/lib/ids";

export async function isTenantPortalUser(session: Session | null) {
  const roles = session?.user?.roles ?? [];
  if (!roles.includes("tenant")) return false;
  return !roles.some((role) => ["super_admin", "admin", "manager"].includes(role));
}

export async function getTenantPortalContext(session: Session | null) {
  if (!session?.user?.id) {
    throw new ForbiddenError("Unauthorized");
  }

  const userId = await resolveUserId(session.user.id);
  const tenant = await prisma.tenant.findFirst({
    where: { userId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      idDocument: true,
      pictureUrl: true,
      securityDeposit: true,
      advanceBalance: true,
      unit: {
        select: {
          unitNumber: true,
          floor: {
            select: {
              building: {
                select: {
                  name: true,
                  property: { select: { name: true } },
                },
              },
            },
          },
        },
      },
      assignments: {
        where: { isActive: true },
        take: 1,
        orderBy: { createdAt: "desc" },
        select: {
          leaseFrom: true,
          leaseTo: true,
          monthlyRent: true,
          monthlyDueDay: true,
        },
      },
    },
  });

  if (!tenant) {
    throw new ForbiddenError("Tenant profile not linked to this account");
  }

  return { userId, tenantId: tenant.id, tenant };
}
