import type { Session } from "next-auth";
import { getVisibleAdminNavItems } from "@/lib/admin/nav";
import type { HubSection } from "@/lib/navigation/sections";
import { getVisiblePropertyNavItems, getVisibleTenantPortalNavItems } from "@/lib/navigation/nav";
import { userHasPermissionInDb } from "@/lib/permissions/db";

function hasRole(session: Session, role: string) {
  return (session.user?.roles ?? []).includes(role);
}

export async function getDashboardHubCards(session: Session): Promise<HubSection[]> {
  const hasCustomer = hasRole(session, "customer");
  const hasSuperAdmin = hasRole(session, "super_admin");
  const hasAdmin = hasRole(session, "admin");
  const hasGst = hasRole(session, "gst");
  const hasTenant = hasRole(session, "tenant");

  const [propertyNavItems, adminNavItems, tenantPortalNavItems, canAccessGst] =
    await Promise.all([
      getVisiblePropertyNavItems(session.user.id),
      getVisibleAdminNavItems(session.user.id),
      hasTenant ? getVisibleTenantPortalNavItems(session.user.id) : Promise.resolve([]),
      hasGst
        ? userHasPermissionInDb(session.user.id, "gst_organization", "read")
        : Promise.resolve(false),
    ]);

  const cards: HubSection[] = [];
  if ((hasSuperAdmin || hasAdmin) && adminNavItems.length > 0) cards.push("admin");
  if (hasCustomer && propertyNavItems.length > 0) cards.push("rent");
  if (hasGst && canAccessGst) cards.push("gst");
  if (hasTenant && tenantPortalNavItems.length > 0) cards.push("portal");
  return cards;
}
