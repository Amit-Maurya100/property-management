import { GstMasterAdmin } from "@/components/gst/gst-master-admin";
import { getOrganizationForUser } from "@/lib/gst/organizations";
import { requireGstPage } from "@/lib/gst/page-auth";
import { redirect } from "next/navigation";

export default async function GstMasterPage() {
  const { session, grants } = await requireGstPage("gst_master");
  const organization = await getOrganizationForUser(BigInt(session.user.id));
  if (!organization) redirect("/hub/gst");

  return <GstMasterAdmin grants={grants} />;
}
