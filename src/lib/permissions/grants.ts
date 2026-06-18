export type ResourceGrants = {
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
};

export function hasResourcePermission(
  permissions: string[],
  resource: string,
  action: string,
): boolean {
  return permissions.includes(`${resource}:${action}`);
}

export function getResourceGrants(
  permissions: string[],
  resource: string,
): ResourceGrants {
  return {
    canCreate: hasResourcePermission(permissions, resource, "create"),
    canUpdate: hasResourcePermission(permissions, resource, "update"),
    canDelete: hasResourcePermission(permissions, resource, "delete"),
  };
}

export function getResourceGrantsFromRows(
  rows: { resource: string; action: string }[],
  resource: string,
): ResourceGrants {
  const actions = new Set(
    rows.filter((row) => row.resource === resource).map((row) => row.action),
  );

  return {
    canCreate: actions.has("create"),
    canUpdate: actions.has("update"),
    canDelete: actions.has("delete"),
  };
}

export async function getResourceGrantsFromDb(
  userId: string,
  resource: string,
): Promise<ResourceGrants> {
  const { getUserPermissionsFromDb } = await import("@/lib/permissions/db");
  const rows = await getUserPermissionsFromDb(userId);
  return getResourceGrantsFromRows(rows, resource);
}
