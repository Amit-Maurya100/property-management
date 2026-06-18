import { BuildingsAdmin } from "@/components/properties/buildings-admin";
import { requirePropertyPage } from "@/lib/properties/page-auth";

export default async function BuildingsPage() {
  const { grants } = await requirePropertyPage("building");
  return <BuildingsAdmin grants={grants} />;
}
