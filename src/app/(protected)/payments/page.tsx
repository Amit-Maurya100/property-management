import { PaymentsAdmin } from "@/components/properties/payments-admin";
import { requirePropertyPage } from "@/lib/properties/page-auth";

export default async function PaymentsPage() {
  const { grants } = await requirePropertyPage("payment");
  return <PaymentsAdmin grants={grants} />;
}
