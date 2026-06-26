import { getWhatsAppDefaultCountryCode } from "@/lib/whatsapp/whatsapp-config";

export function normalizeWhatsAppNumber(
  phone: string,
  countryCode = getWhatsAppDefaultCountryCode(),
) {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length === 10) return `${countryCode}${digits}`;
  if (digits.startsWith(countryCode)) return digits;
  return digits;
}

export function toWhatsAppChatId(phone: string) {
  const normalized = normalizeWhatsAppNumber(phone);
  if (!normalized) return null;
  return `${normalized}@c.us`;
}
