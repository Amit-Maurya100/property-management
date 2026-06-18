import { PropertiesAdmin } from "@/components/properties/properties-admin";
import { requirePropertyPage } from "@/lib/properties/page-auth";
import { isCustomerUser } from "@/lib/navigation/nav";

export default async function PropertiesPage() {
  const { session, grants } = await requirePropertyPage("property");
  const showWelcome = await isCustomerUser(session);

  return (
    <PropertiesAdmin
      grants={grants}
      username={session.user.username}
      showWelcome={showWelcome}
    />
  );
}
