import { Resend } from "resend";
import { buildRentGeneratedEmail } from "@/lib/email/rent-generated-template";
import {
  getResendApiKey,
  getResendFromAddress,
  isEmailEnabled,
  isResendConfigured,
} from "@/lib/email/resend-config";
import { loadRentGeneratedNotification } from "@/lib/notifications/rent-generated-payload";

export type SendRentGeneratedEmailResult =
  | {
      sent: false;
      reason: "not_enabled" | "not_configured" | "no_email" | "no_breakdown" | "not_found";
    }
  | { sent: true; email: string; id?: string };

export async function sendRentGeneratedEmail(
  rentId: bigint,
): Promise<SendRentGeneratedEmailResult> {
  if (!(await isEmailEnabled())) {
    return { sent: false, reason: "not_enabled" };
  }

  if (!isResendConfigured()) {
    console.warn("Resend is not configured; skipping rent notification email");
    return { sent: false, reason: "not_configured" };
  }

  const loaded = await loadRentGeneratedNotification(rentId);
  if (!loaded.ok) {
    if (loaded.reason === "not_found") throw new Error("NOT_FOUND");
    console.warn(`Could not build rent breakdown for rent ${rentId}; skipping email`);
    return { sent: false, reason: loaded.reason };
  }

  const data = loaded.data;
  const tenantEmail = data.tenantEmail;
  if (!tenantEmail) {
    console.warn(`Tenant ${data.tenantName} has no email; skipping rent notification`);
    return { sent: false, reason: "no_email" };
  }

  const { subject, html, text } = buildRentGeneratedEmail({
    tenantName: data.tenantName,
    propertyName: data.propertyName,
    buildingName: data.buildingName,
    unitNumber: data.unitNumber,
    periodStart: data.periodStart,
    periodEnd: data.periodEnd,
    dueDate: data.dueDate,
    lineItems: data.lineItems,
    periodTotal: data.periodTotal,
    priorBalance: data.priorBalance,
    amountDue: data.amountDue,
    isExitRent: data.isExitRent,
  });

  const resend = new Resend(getResendApiKey());
  const { data: response, error } = await resend.emails.send({
    from: getResendFromAddress(),
    to: tenantEmail,
    subject,
    html,
    text,
  });

  if (error) {
    throw new Error(error.message);
  }

  return { sent: true, email: tenantEmail, id: response?.id };
}
