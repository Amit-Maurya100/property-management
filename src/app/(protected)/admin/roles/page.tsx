import { auth } from "@/lib/auth";
import { getResourceGrantsFromDb } from "@/lib/permissions/grants";
import { userHasPermissionInDb } from "@/lib/permissions/db";
import { redirect } from "next/navigation";
import { RolesAdmin } from "@/components/admin/roles-admin";

export default async function RolesAdminPage() {
  const session = await auth();
  if (
    !session?.user?.id ||
    !(await userHasPermissionInDb(session.user.id, "role", "read"))
  ) {
    redirect("/dashboard");
  }

  const grants = await getResourceGrantsFromDb(session.user.id, "role");
  return <RolesAdmin grants={grants} />;
}
