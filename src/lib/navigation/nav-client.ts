import type { HubSection } from "@/lib/navigation/sections";

export type AppNavItem = { href: string; label: string };

export type AppNavContext = {
  homeHref: string;
  adminItems: AppNavItem[];
  propertyItems: AppNavItem[];
  gstItems: AppNavItem[];
};

export function getAppNavItemsForSection(
  context: AppNavContext,
  section: HubSection | null,
): AppNavItem[] {
  if (!section) return [];

  const home = { href: context.homeHref, label: "Home" };
  if (section === "admin") {
    return [home, ...context.adminItems];
  }
  if (section === "gst") {
    return context.gstItems.length > 0 ? [home, ...context.gstItems] : [home];
  }
  return [home, ...context.propertyItems];
}
