import { auth } from "@/lib/auth";
import { getResourceGrantsFromDb } from "@/lib/permissions/grants";
import { userHasPermissionInDb } from "@/lib/permissions/db";
import { redirect } from "next/navigation";
import { UsersAdmin } from "@/components/admin/users-admin";

export default async function UsersAdminPage() {
  const session = await auth();
  if (
    !session?.user?.id ||
    !(await userHasPermissionInDb(session.user.id, "user", "read"))
  ) {
    redirect("/dashboard");
  }

  const grants = await getResourceGrantsFromDb(session.user.id, "user");
  return <UsersAdmin grants={grants} />;
}
