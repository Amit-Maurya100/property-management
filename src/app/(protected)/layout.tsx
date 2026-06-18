import { auth } from "@/lib/auth";
import { getAppNavItems, getDefaultHomePath } from "@/lib/navigation/nav";
import { AppHeader } from "@/components/layout/app-header";
import { SiteFooter } from "@/components/layout/site-footer";
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

  const navItems = await getAppNavItems(session);
  const homeHref = await getDefaultHomePath(session);

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-white">
      <AppHeader
        username={session.user.username}
        email={session.user.email ?? ""}
        navItems={navItems}
        homeHref={homeHref}
      />
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">{children}</main>
      <SiteFooter />
    </div>
  );
}
