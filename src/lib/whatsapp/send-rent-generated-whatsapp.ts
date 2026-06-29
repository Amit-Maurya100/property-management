import { buildRentGeneratedEmail } from "@/lib/email/rent-generated-template";
import { loadRentGeneratedNotification } from "@/lib/notifications/rent-generated-payload";
import { sendWhatsAppMediaMessage } from "@/lib/whatsapp/whatsapp-client";
import { isWhatsAppEnabled } from "@/lib/whatsapp/whatsapp-config";
import { normalizeWhatsAppNumber } from "@/lib/whatsapp/phone";
import {
  buildRentInvoiceImage,
  rentInvoiceImageFilename,
} from "@/lib/whatsapp/rent-invoice-image";

const WHATSAPP_CAPTION_LIMIT = 1024;

export type SendRentGeneratedWhatsAppResult =
  | {
      sent: false;
      reason:
        | "not_enabled"
        | "no_phone"
        | "not_registered"
        | "no_breakdown"
        | "not_found"
        | "queued";
    }
  | { sent: true; phone: string; queued?: boolean };

export async function sendRentGeneratedWhatsApp(
  rentId: bigint,
  options: { reminder?: boolean } = {},
): Promise<SendRentGeneratedWhatsAppResult> {
  if (!(await isWhatsAppEnabled())) {
    console.warn("WhatsApp is not enabled; skipping rent notification");
    return { sent: false, reason: "not_enabled" };
  }

  const loaded = await loadRentGeneratedNotification(rentId);
  if (!loaded.ok) {
    if (loaded.reason === "not_found") throw new Error("NOT_FOUND");
    console.warn(`Could not build rent breakdown for rent ${rentId}; skipping WhatsApp`);
    return { sent: false, reason: loaded.reason };
  }

  const data = loaded.data;
  const tenantPhone = data.tenantPhone;
  if (!tenantPhone) {
    console.warn(`Tenant ${data.tenantName} has no phone; skipping WhatsApp notification`);
    return { sent: false, reason: "no_phone" };
  }

  const whatsappNumber = normalizeWhatsAppNumber(tenantPhone);
  if (!whatsappNumber) {
    console.warn(`Invalid tenant phone "${tenantPhone}"; skipping WhatsApp notification`);
    return { sent: false, reason: "no_phone" };
  }

  const imageBuffer = await buildRentInvoiceImage(data);
  const { text } = buildRentGeneratedEmail({
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
    reminder: options.reminder,
  });

  const caption =
    text.length > WHATSAPP_CAPTION_LIMIT
      ? `${text.slice(0, WHATSAPP_CAPTION_LIMIT - 1)}…`
      : text;

  const result = await sendWhatsAppMediaMessage({
    whatsappNumber,
    mediaBase64: imageBuffer.toString("base64"),
    mediaFilename: rentInvoiceImageFilename(data),
    caption,
  });

  if (result === "queued") {
    console.log(
      `WhatsApp is still connecting; rent notification for ${tenantPhone} queued and will send when ready`,
    );
    return { sent: false, reason: "queued" };
  }

  return { sent: true, phone: tenantPhone };
}
