import Link from "next/link";
import { auth } from "@/lib/auth";
import { getVisibleAdminNavItems } from "@/lib/admin/nav";
import { isCustomerUser } from "@/lib/navigation/nav";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  if (await isCustomerUser(session)) {
    redirect("/properties");
  }

  const adminNavItems = await getVisibleAdminNavItems(session.user.id);

  return (
    <div>
      <h1 className="text-3xl font-semibold">Dashboard</h1>
      <p className="mt-2 text-slate-400">
        Signed in as {session.user.username} ({session.user.email})
      </p>

      {adminNavItems.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-lg font-medium text-emerald-400">Administration</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            {adminNavItems.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm hover:border-emerald-500/50"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-10 grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-lg font-medium">Your Roles</h2>
          <ul className="mt-4 space-y-2 text-sm text-slate-300">
            {session.user.roles.map((role) => (
              <li key={role} className="rounded-lg bg-slate-950 px-3 py-2">
                {role}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-lg font-medium">Your Permissions</h2>
          <ul className="mt-4 max-h-64 space-y-2 overflow-y-auto text-sm text-slate-300">
            {session.user.permissions.map((permission) => (
              <li key={permission} className="rounded-lg bg-slate-950 px-3 py-2">
                {permission}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
