import Link from "next/link";
import { signOut } from "@/lib/auth";
import { CompanyLogo } from "@/components/layout/company-logo";
import { AppHeaderNav } from "@/components/layout/app-header-nav";
import { COMPANY_NAME } from "@/components/auth/ui";
import { contentWidthClass } from "@/lib/layout/content-width";
import type { AppNavContext } from "@/lib/navigation/nav-client";

type AppHeaderProps = {
  username: string;
  email: string;
  navContext: AppNavContext;
  homeHref?: string;
};

export function AppHeader({
  username,
  email,
  navContext,
  homeHref = "/dashboard",
}: AppHeaderProps) {
  return (
    <header className="border-b border-slate-800 bg-slate-900/80">
      <div className={`mx-auto flex ${contentWidthClass} items-center justify-between gap-4 px-4 py-4 sm:px-6`}>
        <Link href={homeHref} className="flex items-center gap-3">
          <CompanyLogo />
          <div>
            <p className="text-lg font-semibold text-white">{COMPANY_NAME}</p>
            <p className="text-sm text-slate-400">
              Hello, <span className="text-emerald-400">{username}</span>
            </p>
            <p className="text-xs text-slate-500">{email}</p>
          </div>
        </Link>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button
            type="submit"
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
          >
            Sign out
          </button>
        </form>
      </div>
      <AppHeaderNav navContext={navContext} />
    </header>
  );
}
