import { UnitsAdmin } from "@/components/properties/units-admin";
import { requirePropertyPage } from "@/lib/properties/page-auth";

export default async function UnitsPage() {
  const { grants } = await requirePropertyPage("unit");
  return <UnitsAdmin grants={grants} />;
}
