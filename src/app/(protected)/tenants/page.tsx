import { TenantsAdmin } from "@/components/properties/tenants-admin";
import { requirePropertyPage } from "@/lib/properties/page-auth";

export default async function TenantsPage() {
  const { grants } = await requirePropertyPage("tenant");
  return <TenantsAdmin grants={grants} />;
}
