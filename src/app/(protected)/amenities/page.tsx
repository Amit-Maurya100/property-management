import { AmenitiesAdmin } from "@/components/properties/amenities-admin";
import { requirePropertyPage } from "@/lib/properties/page-auth";

export default async function AmenitiesPage() {
  const { grants } = await requirePropertyPage("amenity");
  return <AmenitiesAdmin grants={grants} />;
}
