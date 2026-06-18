import type { Session } from "next-auth";
import { getVisibleAdminNavItems } from "@/lib/admin/nav";

export const PROPERTY_NAV_ITEMS = [
  { href: "/properties", label: "Properties" },
  { href: "/buildings", label: "Buildings" },
  { href: "/floors", label: "Floors" },
  { href: "/units", label: "Units" },
  { href: "/rooms", label: "Rooms" },
  { href: "/beds", label: "Beds" },
  { href: "/amenities", label: "Amenities" },
  { href: "/tenants", label: "Tenants" },
  { href: "/rent", label: "Rent" },
] as const;

export type AppNavItem = { href: string; label: string };

export async function isCustomerUser(session: Session): Promise<boolean> {
  const roles = session.user?.roles ?? [];
  if (!roles.includes("customer")) return false;
  const adminNav = await getVisibleAdminNavItems(session.user.id);
  return adminNav.length === 0;
}

export async function getAppNavItems(session: Session): Promise<AppNavItem[]> {
  const adminNavItems = await getVisibleAdminNavItems(session.user.id);
  const propertyTabs = [...PROPERTY_NAV_ITEMS];

  if (await isCustomerUser(session)) {
    return propertyTabs;
  }

  return [{ href: "/dashboard", label: "Dashboard" }, ...adminNavItems, ...propertyTabs];
}

export async function getDefaultHomePath(session: Session): Promise<string> {
  if (await isCustomerUser(session)) return "/properties";
  return "/dashboard";
}
