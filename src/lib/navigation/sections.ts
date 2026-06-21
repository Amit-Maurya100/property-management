import { GST_NAV_ITEMS } from "@/lib/navigation/gst-nav-items";
import { PROPERTY_NAV_ITEMS } from "@/lib/navigation/property-nav-items";

export type HubSection = "rent" | "admin" | "gst";

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

export function getSectionForPath(pathname: string): HubSection | null {
  if (isAdminSectionPath(pathname)) return "admin";
  if (isGstSectionPath(pathname)) return "gst";
  if (isRentSectionPath(pathname)) return "rent";
  return null;
}
