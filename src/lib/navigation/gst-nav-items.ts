import type { AdminNavItem } from "@/lib/admin/nav-items";

export const GST_NAV_ITEMS: AdminNavItem[] = [
  {
    href: "/hub/gst/master",
    label: "GST Master",
    resource: "gst_master",
    action: "read",
  },
  {
    href: "/hub/gst/tax-config",
    label: "Tax Configuration",
    resource: "gst_tax_configuration",
    action: "read",
  },
  {
    href: "/hub/gst/b2b",
    label: "B2B Sales",
    resource: "gst_b2b_sale",
    action: "read",
  },
  {
    href: "/hub/gst/b2c",
    label: "B2C Sales",
    resource: "gst_b2c_sale",
    action: "read",
  },
  {
    href: "/hub/gst/purchase",
    label: "Purchase",
    resource: "gst_purchase",
    action: "read",
  },
  {
    href: "/hub/gst/reports",
    label: "Report",
    resource: "gst_report",
    action: "read",
  },
];
