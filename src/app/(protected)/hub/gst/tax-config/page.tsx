import { TaxConfigAdmin } from "@/components/gst/tax-config-admin";
import { getOrganizationForUser } from "@/lib/gst/organizations";
import { requireGstPage } from "@/lib/gst/page-auth";
import { redirect } from "next/navigation";

export default async function GstTaxConfigPage() {
  const { session, grants } = await requireGstPage("gst_tax_configuration");
  const organization = await getOrganizationForUser(session.user.id);
  if (!organization) redirect("/hub/gst");

  return <TaxConfigAdmin grants={grants} />;
}
