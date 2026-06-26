import QRCode from "qrcode";
import { auth } from "@/lib/auth";
import { jsonOk, handleApiError, jsonError } from "@/lib/api/response";
import {
  getNotificationSettings,
  updateNotificationSettings,
} from "@/lib/notifications/settings";
import { updateNotificationSettingsSchema } from "@/lib/notifications/schemas";
import {
  getResendFromAddress,
  isResendConfigured,
} from "@/lib/email/resend-config";
import {
  getWhatsAppConnectionState,
  reconnectWhatsAppClient,
  logoutWhatsAppClient,
  shutdownWhatsAppClient,
  warmUpWhatsAppClient,
} from "@/lib/whatsapp/whatsapp-client";
import {
  isVercelDeployment,
  isWhatsAppRuntimeAvailable,
} from "@/lib/whatsapp/whatsapp-config";
import { withPermission } from "@/lib/permissions";

async function buildWhatsAppPayload() {
  warmUpWhatsAppClient();
  const state = getWhatsAppConnectionState();
  const qrDataUrl =
    state.qr != null ? await QRCode.toDataURL(state.qr, { margin: 2, width: 320 }) : null;

  const settings = await getNotificationSettings();

  return {
    enabled: settings.whatsappEnabled,
    runtimeAvailable: isWhatsAppRuntimeAvailable(),
    hostedOnVercel: isVercelDeployment(),
    status: state.status,
    linkedPhone: state.linkedPhone,
    error: state.error,
    qrDataUrl,
    updatedAt: state.updatedAt,
  };
}

async function buildNotificationsPayload() {
  const settings = await getNotificationSettings();

  return {
    settings: {
      emailEnabled: settings.emailEnabled,
      whatsappEnabled: settings.whatsappEnabled,
      updatedAt: settings.updatedAt.toISOString(),
    },
    email: {
      enabled: settings.emailEnabled,
      configured: isResendConfigured(),
      fromAddress: isResendConfigured() ? getResendFromAddress() : null,
    },
    whatsapp: await buildWhatsAppPayload(),
  };
}

export const GET = withPermission(async () => {
  try {
    return jsonOk(await buildNotificationsPayload());
  } catch (error) {
    return handleApiError(error);
  }
}, "rent", "read");

export const PATCH = withPermission(async (request) => {
  try {
    const session = await auth();
    const body = updateNotificationSettingsSchema.parse(await request.json());

    if (body.emailEnabled !== undefined || body.whatsappEnabled !== undefined) {
      const previous = await getNotificationSettings();
      await updateNotificationSettings(
        {
          emailEnabled: body.emailEnabled,
          whatsappEnabled: body.whatsappEnabled,
        },
        session?.user?.id,
      );

      if (body.whatsappEnabled === false && previous.whatsappEnabled) {
        await shutdownWhatsAppClient();
      } else if (body.whatsappEnabled === true && !previous.whatsappEnabled) {
        warmUpWhatsAppClient();
      }
    }

    if (body.whatsappAction === "reconnect") {
      await reconnectWhatsAppClient();
    } else if (body.whatsappAction === "logout") {
      await logoutWhatsAppClient();
    }

    return jsonOk(await buildNotificationsPayload());
  } catch (error) {
    if (error instanceof Error && error.message === "WHATSAPP_UNAVAILABLE") {
      return jsonError(
        "WhatsApp is not available in this environment. It cannot run on Vercel serverless.",
        503,
      );
    }
    return handleApiError(error);
  }
}, "rent", "update");
