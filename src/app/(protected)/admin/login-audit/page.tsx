import { auth } from "@/lib/auth";
import { userHasPermissionInDb } from "@/lib/permissions/db";
import { redirect } from "next/navigation";
import { LoginAuditAdmin } from "@/components/admin/login-audit-admin";

export default async function LoginAuditAdminPage() {
  const session = await auth();
  if (
    !session?.user?.id ||
    !(await userHasPermissionInDb(session.user.id, "login_audit", "read"))
  ) {
    redirect("/dashboard");
  }

  return <LoginAuditAdmin />;
}
