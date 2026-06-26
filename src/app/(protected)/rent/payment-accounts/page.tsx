import { RentPaymentAccountsAdmin } from "@/components/properties/rent-payment-accounts-admin";
import { requirePropertyPage } from "@/lib/properties/page-auth";

export default async function RentPaymentAccountsPage() {
  const { grants } = await requirePropertyPage("payment");
  return <RentPaymentAccountsAdmin grants={grants} />;
}
