import type { AdminNavItem } from "@/lib/admin/nav-items";

export const TENANT_PORTAL_NAV_ITEMS: AdminNavItem[] = [
  { href: "/portal/profile", label: "My Profile", resource: "tenant", action: "read" },
  { href: "/portal/rents", label: "My Rents", resource: "rent", action: "read" },
  { href: "/portal/payment-methods", label: "Payment Methods", resource: "payment", action: "read" },
  { href: "/portal/payments", label: "My Payments", resource: "payment", action: "read" },
];
