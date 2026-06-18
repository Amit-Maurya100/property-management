import { prisma } from "@/lib/db";
import type { UserScope } from "@/lib/permissions";
import { userHasPermissionInDb } from "@/lib/permissions/db";

export async function getUserScopes(
  userId: string,
  scopeType?: string,
): Promise<UserScope[]> {
  const scopes = await prisma.userRoleScope.findMany({
    where: {
      userRole: {
        userId,
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      ...(scopeType ? { scopeType } : {}),
    },
    select: {
      scopeType: true,
      scopeValue: true,
    },
  });

  return scopes.map((scope) => ({
    type: scope.scopeType,
    value: scope.scopeValue,
  }));
}

export async function canAccessResource(
  userId: string,
  resource: string,
  action: string,
  context: { propertyId?: string; departmentId?: string } = {},
): Promise<boolean> {
  const allowed = await userHasPermissionInDb(userId, resource, action);
  if (!allowed) {
    return false;
  }

  const scopes = await getUserScopes(userId);
  if (scopes.length === 0) {
    return true;
  }

  const requiredScopes: UserScope[] = [];
  if (context.propertyId) {
    requiredScopes.push({ type: "property", value: context.propertyId });
  }
  if (context.departmentId) {
    requiredScopes.push({ type: "department", value: context.departmentId });
  }

  if (requiredScopes.length === 0) {
    return true;
  }

  return requiredScopes.every((required) =>
    scopes.some(
      (scope) => scope.type === required.type && scope.value === required.value,
    ),
  );
}
