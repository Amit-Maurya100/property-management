import { GstInvoicesAdmin } from "@/components/gst/gst-invoices-admin";
import { getOrganizationForUser } from "@/lib/gst/organizations";
import { requireGstPage } from "@/lib/gst/page-auth";
import { redirect } from "next/navigation";

export default async function GstB2bPage() {
  const { session, grants } = await requireGstPage("gst_b2b_sale");
  const organization = await getOrganizationForUser(BigInt(session.user.id));
  if (!organization) redirect("/hub/gst");

  return (
    <GstInvoicesAdmin
      invoiceType="B2B_SALE"
      title="B2B Sales"
      grants={grants}
      organizationGstNumber={organization.gstNumber}
    />
  );
}
