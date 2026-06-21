import { auth } from "@/lib/auth";
import { HubCard } from "@/components/home/hub-card";
import { getDashboardHubCards } from "@/lib/navigation/hub-cards";
import { getVisiblePropertyNavItems } from "@/lib/navigation/nav";
import { redirect } from "next/navigation";

export default async function RentHubPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const hubCards = await getDashboardHubCards(session);
  if (!hubCards.includes("rent")) {
    redirect("/dashboard");
  }

  const propertyNavItems = await getVisiblePropertyNavItems(session.user.id);
  if (propertyNavItems.length === 0) {
    redirect("/dashboard");
  }

  return (
    <div>
      <h1 className="text-3xl font-semibold">Rent</h1>
      <p className="mt-2 text-slate-400">
        Use the tabs above or choose a section below.
      </p>
      <div className="mt-8">
        <HubCard
          title="Rent"
          description="Manage properties, tenants, monthly bills, and payments."
          links={propertyNavItems}
          accent="emerald"
        />
      </div>
    </div>
  );
}
