"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  getAppNavItemsForSection,
  type AppNavContext,
} from "@/lib/navigation/nav-client";
import { getSectionForPath } from "@/lib/navigation/sections";

export function AppHeaderNav({
  navContext,
}: {
  navContext: AppNavContext;
}) {
  const pathname = usePathname();
  const section = getSectionForPath(pathname);
  const navItems = getAppNavItemsForSection(navContext, section);

  if (navItems.length === 0) {
    return null;
  }

  return (
    <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-6 pb-3">
      {navItems.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== navContext.homeHref && pathname.startsWith(`${item.href}/`));

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-lg px-4 py-2 text-sm transition ${
              isActive
                ? "bg-slate-800 text-white"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
