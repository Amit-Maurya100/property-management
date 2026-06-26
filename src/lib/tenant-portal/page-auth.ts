import { auth } from "@/lib/auth";
import { isTenantPortalUser } from "@/lib/tenant-portal/context";
import { redirect } from "next/navigation";

export async function requireTenantPortalPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  if (!(await isTenantPortalUser(session))) {
    redirect("/dashboard");
  }
  return session;
}
