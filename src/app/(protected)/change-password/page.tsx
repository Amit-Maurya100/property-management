import { auth } from "@/lib/auth";
import { ChangePasswordForm } from "@/components/tenant-portal/change-password-form";
import { redirect } from "next/navigation";

export default async function ChangePasswordPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  if (!session.user.mustChangePassword) {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg items-center justify-center">
      <ChangePasswordForm email={session.user.email ?? ""} />
    </div>
  );
}
