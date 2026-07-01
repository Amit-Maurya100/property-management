import { QuoteRequestsAdmin } from "@/components/admin/quote-requests-admin";
import { auth } from "@/lib/auth";
import { userHasPermissionInDb } from "@/lib/permissions/db";
import { redirect } from "next/navigation";

export default async function QuoteRequestsAdminPage() {
  const session = await auth();
  if (
    !session?.user?.id ||
    !(await userHasPermissionInDb(session.user.id, "quote_request", "read"))
  ) {
    redirect("/dashboard");
  }

  return <QuoteRequestsAdmin />;
}
