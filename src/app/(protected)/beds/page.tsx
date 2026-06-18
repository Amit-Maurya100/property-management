import { BedsAdmin } from "@/components/properties/beds-admin";
import { requirePropertyPage } from "@/lib/properties/page-auth";

export default async function BedsPage() {
  const { grants } = await requirePropertyPage("bed");
  return <BedsAdmin grants={grants} />;
}
