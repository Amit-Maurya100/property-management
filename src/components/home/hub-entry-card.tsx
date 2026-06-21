import Link from "next/link";

type HubEntryCardProps = {
  title: string;
  description: string;
  href: string;
  accent: "emerald" | "sky" | "violet";
};

const accentStyles = {
  emerald: {
    border: "border-emerald-500/30 hover:border-emerald-500/60",
    bg: "bg-emerald-500/5 hover:bg-emerald-500/10",
    title: "text-emerald-300",
  },
  sky: {
    border: "border-sky-500/30 hover:border-sky-500/60",
    bg: "bg-sky-500/5 hover:bg-sky-500/10",
    title: "text-sky-300",
  },
  violet: {
    border: "border-violet-500/30 hover:border-violet-500/60",
    bg: "bg-violet-500/5 hover:bg-violet-500/10",
    title: "text-violet-300",
  },
} as const;

export function HubEntryCard({ title, description, href, accent }: HubEntryCardProps) {
  const styles = accentStyles[accent];

  return (
    <Link
      href={href}
      className={`block rounded-2xl border ${styles.border} ${styles.bg} bg-slate-900 p-8 transition`}
    >
      <h2 className={`text-2xl font-semibold ${styles.title}`}>{title}</h2>
      <p className="mt-3 text-sm text-slate-400">{description}</p>
      <p className="mt-6 text-sm font-medium text-slate-200">Open →</p>
    </Link>
  );
}
