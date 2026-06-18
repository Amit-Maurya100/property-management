import { auth } from "@/lib/auth";
import { getResourceGrantsFromDb } from "@/lib/permissions/grants";
import { userHasPermissionInDb } from "@/lib/permissions/db";
import { redirect } from "next/navigation";
import { CatalogAdmin } from "@/components/admin/catalog-admin";

export default async function ResourcesAdminPage() {
  const session = await auth();
  if (
    !session?.user?.id ||
    !(await userHasPermissionInDb(session.user.id, "resource", "read"))
  ) {
    redirect("/dashboard");
  }

  const grants = await getResourceGrantsFromDb(session.user.id, "resource");
  return (
    <CatalogAdmin
      title="Resources"
      description="Manage permission resources used when defining resource:action permissions."
      apiPath="/api/admin/resources"
      namePlaceholder="Resource name (e.g. invoice)"
      grants={grants}
    />
  );
}
