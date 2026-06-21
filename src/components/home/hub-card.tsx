import Link from "next/link";
import type { AdminNavItem } from "@/lib/admin/nav";

type HubCardProps = {
  title: string;
  description: string;
  links: AdminNavItem[];
  accent: "emerald" | "sky";
};

const accentStyles = {
  emerald: {
    border: "border-emerald-500/30",
    bg: "bg-emerald-500/5",
    title: "text-emerald-300",
    link: "hover:border-emerald-500/40 hover:bg-emerald-500/10",
  },
  sky: {
    border: "border-sky-500/30",
    bg: "bg-sky-500/5",
    title: "text-sky-300",
    link: "hover:border-sky-500/40 hover:bg-sky-500/10",
  },
} as const;

export function HubCard({ title, description, links, accent }: HubCardProps) {
  const styles = accentStyles[accent];

  return (
    <section
      className={`rounded-2xl border ${styles.border} ${styles.bg} bg-slate-900 p-6`}
    >
      <h2 className={`text-xl font-semibold ${styles.title}`}>{title}</h2>
      <p className="mt-2 text-sm text-slate-400">{description}</p>
      <ul className="mt-6 grid gap-2 sm:grid-cols-2">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className={`flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-200 transition ${styles.link}`}
            >
              <span>{link.label}</span>
              <span className="text-slate-500">→</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
