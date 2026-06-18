import { FloorsAdmin } from "@/components/properties/floors-admin";
import { requirePropertyPage } from "@/lib/properties/page-auth";

export default async function FloorsPage() {
  const { grants } = await requirePropertyPage("floor");
  return <FloorsAdmin grants={grants} />;
}
