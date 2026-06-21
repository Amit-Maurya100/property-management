import {
  ADMIN_NAV_ITEMS,
  filterAdminNavByPermissions,
  type AdminNavItem,
} from "@/lib/admin/nav-items";
import { getUserPermissionsFromDb } from "@/lib/permissions/db";

export type { AdminNavItem };
export { ADMIN_NAV_ITEMS, filterAdminNavByPermissions };

function permissionKey(resource: string, action: string) {
  return `${resource}:${action}`;
}

export async function getVisibleAdminNavItems(userId: string) {
  const rows = await getUserPermissionsFromDb(userId);
  const granted = rows.map((row) => permissionKey(row.resource, row.action));
  return filterAdminNavByPermissions(ADMIN_NAV_ITEMS, granted);
}

export async function userCanAccessAdminPath(userId: string, pathname: string) {
  const item = ADMIN_NAV_ITEMS.find((entry) => pathname.startsWith(entry.href));
  if (!item) {
    return true;
  }

  const rows = await getUserPermissionsFromDb(userId);
  const granted = new Set(rows.map((row) => permissionKey(row.resource, row.action)));
  return granted.has(permissionKey(item.resource, item.action));
}
