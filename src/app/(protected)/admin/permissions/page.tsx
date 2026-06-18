import { auth } from "@/lib/auth";
import { getResourceGrantsFromDb } from "@/lib/permissions/grants";
import { userHasPermissionInDb } from "@/lib/permissions/db";
import { redirect } from "next/navigation";
import { PermissionsAdmin } from "@/components/admin/permissions-admin";

export default async function PermissionsAdminPage() {
  const session = await auth();
  if (
    !session?.user?.id ||
    !(await userHasPermissionInDb(session.user.id, "permission", "read"))
  ) {
    redirect("/dashboard");
  }

  const [grants, canViewResources, canViewActions] = await Promise.all([
    getResourceGrantsFromDb(session.user.id, "permission"),
    userHasPermissionInDb(session.user.id, "resource", "read"),
    userHasPermissionInDb(session.user.id, "action", "read"),
  ]);

  return (
    <PermissionsAdmin
      grants={grants}
      canViewResources={canViewResources}
      canViewActions={canViewActions}
    />
  );
}
