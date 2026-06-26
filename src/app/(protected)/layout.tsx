import { auth } from "@/lib/auth";
import { getAppNavContext, getDefaultHomePath } from "@/lib/navigation/nav";
import { AppHeader } from "@/components/layout/app-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { contentWidthClass } from "@/lib/layout/content-width";
import { redirect } from "next/navigation";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const navContext = await getAppNavContext(session);
  const homeHref = await getDefaultHomePath(session);

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-white">
      <AppHeader
        username={session.user.username}
        email={session.user.email ?? ""}
        navContext={navContext}
        homeHref={homeHref}
      />
      <main className={`mx-auto w-full ${contentWidthClass} flex-1 px-4 py-8 sm:px-6`}>{children}</main>
      <SiteFooter />
    </div>
  );
}
