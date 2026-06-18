import { RentAdmin } from "@/components/properties/rent-admin";
import { requirePropertyPage } from "@/lib/properties/page-auth";

export default async function RentPage() {
  const { grants } = await requirePropertyPage("rent");
  return <RentAdmin grants={grants} />;
}
