import { OrganizationRegisterForm } from "@/components/gst/organization-register-form";
import { getOrganizationForUser } from "@/lib/gst/organizations";
import { requireGstPage } from "@/lib/gst/page-auth";
import { redirect } from "next/navigation";

export default async function GstHubPage() {
  const { session, grants } = await requireGstPage("gst_organization");
  const organization = await getOrganizationForUser(BigInt(session.user.id));

  if (organization) {
    redirect("/hub/gst/tax-config");
  }

  return (
    <div>
      <h1 className="text-3xl font-semibold">GST</h1>
      <p className="mt-2 text-slate-400">
        Register your organization to start recording B2B sales, B2C sales, and purchase invoices.
      </p>
      <OrganizationRegisterForm grants={grants} />
    </div>
  );
}
