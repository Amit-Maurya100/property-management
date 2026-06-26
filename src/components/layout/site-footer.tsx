import Link from "next/link";
import { CompanyLogo } from "@/components/layout/company-logo";
import { COMPANY_NAME } from "@/components/auth/ui";
import { contentWidthClass } from "@/lib/layout/content-width";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-800 bg-slate-900/80">
      <div className={`mx-auto flex ${contentWidthClass} flex-col items-center gap-3 px-4 py-6 text-center sm:flex-row sm:justify-between sm:px-6 sm:text-left`}>
        <div className="flex items-center gap-3">
          <CompanyLogo className="h-9 w-9" />
          <div>
            <p className="font-medium text-white">{COMPANY_NAME}</p>
            <p className="text-xs text-slate-400">Property management made simple</p>
          </div>
        </div>
        <p className="text-sm text-slate-500">
          © {year} {COMPANY_NAME}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
