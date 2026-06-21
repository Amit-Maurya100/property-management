export type AdminNavItem = {
  href: string;
  label: string;
  resource: string;
  action: string;
};

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { href: "/admin/users", label: "Users", resource: "user", action: "read" },
  { href: "/admin/roles", label: "Roles", resource: "role", action: "read" },
  {
    href: "/admin/resources",
    label: "Resources",
    resource: "resource",
    action: "read",
  },
  {
    href: "/admin/actions",
    label: "Actions",
    resource: "action",
    action: "read",
  },
  {
    href: "/admin/permissions",
    label: "Permissions",
    resource: "permission",
    action: "read",
  },
  {
    href: "/admin/login-audit",
    label: "Login Audit",
    resource: "login_audit",
    action: "read",
  },
];

function permissionKey(resource: string, action: string) {
  return `${resource}:${action}`;
}

export function filterAdminNavByPermissions(
  items: AdminNavItem[],
  granted: Iterable<string>,
) {
  const grantedSet = new Set(granted);
  return items.filter((item) => grantedSet.has(permissionKey(item.resource, item.action)));
}
