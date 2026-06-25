export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.WHATSAPP_ENABLED === "true") {
    const { warmUpWhatsAppClient } = await import("@/lib/whatsapp/whatsapp-client");
    warmUpWhatsAppClient();
  }
}
