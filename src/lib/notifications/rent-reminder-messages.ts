import { buildRentGeneratedEmail } from "@/lib/email/rent-generated-template";
import type { RentGeneratedNotification } from "@/lib/notifications/rent-generated-payload";

const WHATSAPP_CAPTION_LIMIT = 1024;

export function buildRentReminderMessages(data: RentGeneratedNotification) {
  const email = buildRentGeneratedEmail({
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
    reminder: true,
  });

  const whatsappText =
    email.text.length > WHATSAPP_CAPTION_LIMIT
      ? `${email.text.slice(0, WHATSAPP_CAPTION_LIMIT - 1)}…`
      : email.text;

  return {
    emailSubject: email.subject,
    emailText: email.text,
    whatsappText,
    whatsappIncludesImage: true,
  };
}
