import { GstPaymentsAdmin } from "@/components/gst/gst-payments-admin";
import { getOrganizationForUser } from "@/lib/gst/organizations";
import { requireGstPage } from "@/lib/gst/page-auth";
import { redirect } from "next/navigation";

export default async function GstPaymentsPage() {
  const { session, grants } = await requireGstPage("gst_payment");
  const organization = await getOrganizationForUser(session.user.id);
  if (!organization) redirect("/hub/gst");

  return <GstPaymentsAdmin grants={grants} />;
}
