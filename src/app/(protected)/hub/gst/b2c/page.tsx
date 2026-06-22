import { GstInvoicesAdmin } from "@/components/gst/gst-invoices-admin";
import { getOrganizationForUser } from "@/lib/gst/organizations";
import { requireGstPage } from "@/lib/gst/page-auth";
import { redirect } from "next/navigation";

export default async function GstB2cPage() {
  const { session, grants } = await requireGstPage("gst_b2c_sale");
  const organization = await getOrganizationForUser(session.user.id);
  if (!organization) redirect("/hub/gst");

  return (
    <GstInvoicesAdmin
      invoiceType="B2C_SALE"
      title="B2C Sales"
      grants={grants}
      organizationGstNumber={organization.gstNumber}
    />
  );
}
