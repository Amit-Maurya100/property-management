import { GST_NAV_ITEMS } from "@/lib/navigation/gst-nav-items";
import { PROPERTY_NAV_ITEMS } from "@/lib/navigation/property-nav-items";
import { TENANT_PORTAL_NAV_ITEMS } from "@/lib/navigation/tenant-portal-nav-items";

export type HubSection = "rent" | "admin" | "gst" | "portal";

export function isAdminSectionPath(pathname: string) {
  return pathname === "/hub/admin" || pathname.startsWith("/admin");
}

export function isRentSectionPath(pathname: string) {
  if (pathname === "/hub/rent") return true;
  return PROPERTY_NAV_ITEMS.some(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
}

export function isGstSectionPath(pathname: string) {
  if (pathname === "/hub/gst") return true;
  return GST_NAV_ITEMS.some(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
}

export function isPortalSectionPath(pathname: string) {
  return TENANT_PORTAL_NAV_ITEMS.some(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
}

export function getSectionForPath(pathname: string): HubSection | null {
  if (isAdminSectionPath(pathname)) return "admin";
  if (isGstSectionPath(pathname)) return "gst";
  if (isPortalSectionPath(pathname)) return "portal";
  if (isRentSectionPath(pathname)) return "rent";
  return null;
}
