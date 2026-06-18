import { RoomsAdmin } from "@/components/properties/rooms-admin";
import { requirePropertyPage } from "@/lib/properties/page-auth";

export default async function RoomsPage() {
  const { grants } = await requirePropertyPage("room");
  return <RoomsAdmin grants={grants} />;
}
