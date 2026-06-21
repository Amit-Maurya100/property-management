import { GstInvoicesAdmin } from "@/components/gst/gst-invoices-admin";
import { getOrganizationForUser } from "@/lib/gst/organizations";
import { requireGstPage } from "@/lib/gst/page-auth";
import { redirect } from "next/navigation";

export default async function GstPurchasePage() {
  const { session, grants } = await requireGstPage("gst_purchase");
  const organization = await getOrganizationForUser(BigInt(session.user.id));
  if (!organization) redirect("/hub/gst");

  return (
    <GstInvoicesAdmin
      invoiceType="PURCHASE"
      title="Purchase"
      grants={grants}
      organizationGstNumber={organization.gstNumber}
    />
  );
}
