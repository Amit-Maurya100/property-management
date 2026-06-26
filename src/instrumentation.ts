export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { getNotificationSettings } = await import("@/lib/notifications/settings");
    const settings = await getNotificationSettings();
    if (settings.whatsappEnabled) {
      const { warmUpWhatsAppClient } = await import("@/lib/whatsapp/whatsapp-client");
      warmUpWhatsAppClient();
    }
  }
}
