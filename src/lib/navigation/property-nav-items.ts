import type { AdminNavItem } from "@/lib/admin/nav-items";

export const PROPERTY_NAV_ITEMS: AdminNavItem[] = [
  { href: "/properties", label: "Properties", resource: "property", action: "read" },
  { href: "/units", label: "Units", resource: "unit", action: "read" },
  { href: "/rooms", label: "Rooms", resource: "room", action: "read" },
  { href: "/beds", label: "Beds", resource: "bed", action: "read" },
  { href: "/amenities", label: "Amenities", resource: "amenity", action: "read" },
  { href: "/tenants", label: "Tenants", resource: "tenant", action: "read" },
  { href: "/rent", label: "Rent", resource: "rent", action: "read" },
  { href: "/rent/reports", label: "Rent Report", resource: "rent", action: "read" },
  { href: "/payments", label: "Payments", resource: "payment", action: "read" },
];
