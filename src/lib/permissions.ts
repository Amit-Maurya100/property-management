import { ForbiddenError } from "@/lib/errors";
import { handleApiError } from "@/lib/api/response";
import { auth } from "@/lib/auth";
import type { Session } from "next-auth";
import {
  getUserPermissionsFromDb,
  userHasPermissionInDb,
} from "@/lib/permissions/db";

export { getUserPermissionsFromDb, userHasPermissionInDb } from "@/lib/permissions/db";

export type UserScope = {
  type: string;
  value: string;
};

export type AuthUser = {
  id: string;
  email: string;
  username: string;
  permissions: string[];
  scopes: UserScope[];
  roles: string[];
};

export function getAuthUser(session: Session | null): AuthUser | null {
  if (!session?.user?.id) {
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email ?? "",
    username: session.user.username ?? "",
    permissions: session.user.permissions ?? [],
    scopes: session.user.scopes ?? [],
    roles: session.user.roles ?? [],
  };
}

export function hasPermission(
  session: Session | null,
  resource: string,
  action: string,
): boolean {
  const permissionName = `${resource}:${action}`;
  const user = getAuthUser(session);
  return user?.permissions.includes(permissionName) ?? false;
}

export function hasPermissionWithScope(
  session: Session | null,
  resource: string,
  action: string,
  scopeType: string,
  scopeValue: string,
): boolean {
  if (!hasPermission(session, resource, action)) {
    return false;
  }

  const user = getAuthUser(session);
  if (!user) {
    return false;
  }

  if (user.scopes.length === 0) {
    return true;
  }

  return user.scopes.some(
    (scope) => scope.type === scopeType && scope.value === scopeValue,
  );
}

export async function requirePermission(
  resource: string,
  action: string,
  options: { fresh?: boolean } = {},
): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new ForbiddenError("Unauthorized");
  }

  const allowed = options.fresh
    ? await userHasPermissionInDb(session.user.id, resource, action)
    : hasPermission(session, resource, action) ||
      (await userHasPermissionInDb(session.user.id, resource, action));

  if (!allowed) {
    throw new ForbiddenError(`Missing permission: ${resource}:${action}`);
  }
}

export async function requireAnyPermission(
  checks: { resource: string; action: string }[],
  options: { fresh?: boolean } = {},
): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new ForbiddenError("Unauthorized");
  }

  for (const check of checks) {
    const allowed = options.fresh
      ? await userHasPermissionInDb(session.user.id, check.resource, check.action)
      : hasPermission(session, check.resource, check.action) ||
        (await userHasPermissionInDb(session.user.id, check.resource, check.action));

    if (allowed) {
      return;
    }
  }

  const required = checks.map((check) => `${check.resource}:${check.action}`).join(" or ");
  throw new ForbiddenError(`Missing permission: ${required}`);
}

type RouteHandler = (
  request: Request,
  context?: { params: Promise<Record<string, string>> },
) => Promise<Response>;

export function withPermission(
  handler: RouteHandler,
  resource: string,
  action: string,
): RouteHandler {
  return async (request, context) => {
    try {
      await requirePermission(resource, action, { fresh: true });
      return handler(request, context);
    } catch (error) {
      return handleApiError(error);
    }
  };
}

export function withAnyPermission(
  handler: RouteHandler,
  checks: { resource: string; action: string }[],
): RouteHandler {
  return async (request, context) => {
    try {
      await requireAnyPermission(checks, { fresh: true });
      return handler(request, context);
    } catch (error) {
      return handleApiError(error);
    }
  };
}
