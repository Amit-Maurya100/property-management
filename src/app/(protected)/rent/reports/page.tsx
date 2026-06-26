import { RentReportAdmin } from "@/components/properties/rent-report-admin";
import { requirePropertyPage } from "@/lib/properties/page-auth";

export default async function RentReportsPage() {
  await requirePropertyPage("rent");
  return <RentReportAdmin />;
}
