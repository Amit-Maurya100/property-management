import type { Session } from "next-auth";
import { filterAdminNavByPermissions } from "@/lib/admin/nav-items";
import { getVisibleAdminNavItems } from "@/lib/admin/nav";
import { getUserPermissionsFromDb } from "@/lib/permissions/db";
import { getOrganizationForUser } from "@/lib/gst/organizations";
import {
  getAppNavItemsForSection,
  type AppNavContext,
  type AppNavItem,
} from "@/lib/navigation/nav-client";
import { GST_NAV_ITEMS } from "@/lib/navigation/gst-nav-items";
import { PROPERTY_NAV_ITEMS } from "@/lib/navigation/property-nav-items";
import {
  getSectionForPath,
  type HubSection,
} from "@/lib/navigation/sections";

export { PROPERTY_NAV_ITEMS };
export type { AppNavContext, AppNavItem, HubSection };
export { getAppNavItemsForSection };

function permissionKey(resource: string, action: string) {
  return `${resource}:${action}`;
}

export async function getVisiblePropertyNavItems(userId: string) {
  const rows = await getUserPermissionsFromDb(userId);
  const granted = rows.map((row) => permissionKey(row.resource, row.action));
  return filterAdminNavByPermissions(PROPERTY_NAV_ITEMS, granted);
}

export async function isCustomerUser(session: Session): Promise<boolean> {
  const roles = session.user?.roles ?? [];
  if (!roles.includes("customer")) return false;
  const hasSuperAdmin = roles.includes("super_admin");
  const hasAdmin = roles.includes("admin");
  return !hasSuperAdmin && !hasAdmin;
}

export async function getVisibleGstNavItems(userId: string) {
  const organization = await getOrganizationForUser(BigInt(userId));
  if (!organization) return [];

  const rows = await getUserPermissionsFromDb(userId);
  const granted = rows.map((row) => permissionKey(row.resource, row.action));
  return filterAdminNavByPermissions(GST_NAV_ITEMS, granted);
}

export async function getAppNavContext(session: Session): Promise<AppNavContext> {
  const [adminNavItems, propertyNavItems, gstNavItems] = await Promise.all([
    getVisibleAdminNavItems(session.user.id),
    getVisiblePropertyNavItems(session.user.id),
    getVisibleGstNavItems(session.user.id),
  ]);

  return {
    homeHref: "/dashboard",
    adminItems: adminNavItems.map(({ href, label }) => ({ href, label })),
    propertyItems: propertyNavItems.map(({ href, label }) => ({ href, label })),
    gstItems: gstNavItems.map(({ href, label }) => ({ href, label })),
  };
}

export async function getAppNavItems(
  session: Session,
  pathname: string,
): Promise<AppNavItem[]> {
  const context = await getAppNavContext(session);
  return getAppNavItemsForSection(context, getSectionForPath(pathname));
}

export async function getDefaultHomePath(_session: Session): Promise<string> {
  return "/dashboard";
}

export { getVisibleAdminNavItems };
