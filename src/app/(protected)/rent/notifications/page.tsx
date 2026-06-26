import { NotificationsAdmin } from "@/components/notifications/notifications-admin";
import { requirePropertyPage } from "@/lib/properties/page-auth";

export default async function RentNotificationsPage() {
  const { grants } = await requirePropertyPage("rent");
  return <NotificationsAdmin grants={grants} />;
}
