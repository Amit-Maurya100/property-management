import Link from "next/link";
import { CompanyLogo } from "@/components/layout/company-logo";
import { COMPANY_NAME } from "@/components/auth/ui";

type SiteHeaderProps = {
  showAuthLinks?: boolean;
};

export function SiteHeader({ showAuthLinks = true }: SiteHeaderProps) {
  return (
    <header className="border-b border-slate-800 bg-slate-900/80">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <CompanyLogo />
          <span className="text-lg font-semibold text-white">{COMPANY_NAME}</span>
        </Link>
        {showAuthLinks ? (
          <nav className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-emerald-400"
            >
              Register
            </Link>
          </nav>
        ) : null}
      </div>
    </header>
  );
}
