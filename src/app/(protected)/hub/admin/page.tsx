import { auth } from "@/lib/auth";
import { getVisibleAdminNavItems } from "@/lib/admin/nav";
import { HubCard } from "@/components/home/hub-card";
import { getDashboardHubCards } from "@/lib/navigation/hub-cards";
import { redirect } from "next/navigation";

export default async function AdminHubPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const hubCards = await getDashboardHubCards(session);
  if (!hubCards.includes("admin")) {
    redirect("/dashboard");
  }

  const adminNavItems = await getVisibleAdminNavItems(session.user.id);
  if (adminNavItems.length === 0) {
    redirect("/dashboard");
  }

  return (
    <div>
      <h1 className="text-3xl font-semibold">Administration</h1>
      <p className="mt-2 text-slate-400">
        Use the tabs above or choose a section below.
      </p>
      <div className="mt-8">
        <HubCard
          title="Administration"
          description="Manage users, roles, permissions, and system settings."
          links={adminNavItems}
          accent="sky"
        />
      </div>
    </div>
  );
}
