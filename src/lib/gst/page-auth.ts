import { auth } from "@/lib/auth";
import { getResourceGrantsFromDb } from "@/lib/permissions/grants";
import { userHasPermissionInDb } from "@/lib/permissions/db";
import { getDefaultHomePath } from "@/lib/navigation/nav";
import { redirect } from "next/navigation";

export async function requireGstPage(resource: string) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  if (!(await userHasPermissionInDb(session.user.id, resource, "read"))) {
    redirect(await getDefaultHomePath(session));
  }

  const grants = await getResourceGrantsFromDb(session.user.id, resource);
  return { session, grants };
}
