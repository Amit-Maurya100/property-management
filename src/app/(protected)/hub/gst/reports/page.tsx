import { GstReportAdmin } from "@/components/gst/gst-report-admin";
import { getOrganizationForUser } from "@/lib/gst/organizations";
import { requireGstPage } from "@/lib/gst/page-auth";
import { redirect } from "next/navigation";

export default async function GstReportPage() {
  const { session } = await requireGstPage("gst_report");
  const organization = await getOrganizationForUser(session.user.id);
  if (!organization) redirect("/hub/gst");

  return <GstReportAdmin />;
}
