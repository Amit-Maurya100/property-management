import { auth } from "@/lib/auth";
import { getResourceGrantsFromDb } from "@/lib/permissions/grants";
import { userHasPermissionInDb } from "@/lib/permissions/db";
import { redirect } from "next/navigation";
import { CatalogAdmin } from "@/components/admin/catalog-admin";

export default async function ActionsAdminPage() {
  const session = await auth();
  if (
    !session?.user?.id ||
    !(await userHasPermissionInDb(session.user.id, "action", "read"))
  ) {
    redirect("/dashboard");
  }

  const grants = await getResourceGrantsFromDb(session.user.id, "action");
  return (
    <CatalogAdmin
      title="Actions"
      description="Manage permission actions used when defining resource:action permissions."
      apiPath="/api/admin/actions"
      namePlaceholder="Action name (e.g. read)"
      grants={grants}
    />
  );
}
