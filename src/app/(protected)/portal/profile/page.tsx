import { TenantPortalProfile } from "@/components/tenant-portal/tenant-portal-profile";
import { requireTenantPortalPage } from "@/lib/tenant-portal/page-auth";

export default async function PortalProfilePage() {
  await requireTenantPortalPage();
  return <TenantPortalProfile />;
}
