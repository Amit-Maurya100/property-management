import { auth } from "@/lib/auth";
import { HubEntryCard } from "@/components/home/hub-entry-card";
import { getDashboardHubCards } from "@/lib/navigation/hub-cards";
import { redirect } from "next/navigation";

const HUB_CARD_CONTENT = {
  admin: {
    title: "Administration",
    description: "Manage users, roles, permissions, and system settings.",
    href: "/hub/admin",
    accent: "sky" as const,
  },
  rent: {
    title: "Rent",
    description: "Manage properties, tenants, monthly bills, and payments.",
    href: "/hub/rent",
    accent: "emerald" as const,
  },
  gst: {
    title: "GST",
    description: "Register your organization and manage B2B, B2C, and purchase invoices.",
    href: "/hub/gst",
    accent: "violet" as const,
  },
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const hubCards = await getDashboardHubCards(session);

  return (
    <div>
      <h1 className="text-3xl font-semibold">Welcome back, {session.user.username}</h1>
      <p className="mt-2 text-slate-400">Choose an area to continue.</p>

      {hubCards.length > 0 ? (
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {hubCards.map((card) => {
            const content = HUB_CARD_CONTENT[card];
            return (
              <HubEntryCard
                key={card}
                title={content.title}
                description={content.description}
                href={content.href}
                accent={content.accent}
              />
            );
          })}
        </div>
      ) : (
        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-400">
          No areas are available for your account yet. Contact an administrator to assign roles
          and permissions.
        </div>
      )}
    </div>
  );
}
