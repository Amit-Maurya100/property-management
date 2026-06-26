import { TenantPortalPaymentMethods } from "@/components/tenant-portal/tenant-portal-payment-methods";
import { requireTenantPortalPage } from "@/lib/tenant-portal/page-auth";

export default async function PortalPaymentMethodsPage() {
  await requireTenantPortalPage();
  return <TenantPortalPaymentMethods />;
}
