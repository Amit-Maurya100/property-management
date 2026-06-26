import { TenantPortalPayments } from "@/components/tenant-portal/tenant-portal-payments";
import { requireTenantPortalPage } from "@/lib/tenant-portal/page-auth";

export default async function PortalPaymentsPage() {
  await requireTenantPortalPage();
  return <TenantPortalPayments />;
}
