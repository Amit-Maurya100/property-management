import { TenantPortalRents } from "@/components/tenant-portal/tenant-portal-rents";
import { requireTenantPortalPage } from "@/lib/tenant-portal/page-auth";

export default async function PortalRentsPage() {
  await requireTenantPortalPage();
  return <TenantPortalRents />;
}
