import { prisma } from "@/lib/db";
import { resolveUserId } from "@/lib/ids";

const SETTINGS_ID = 1;

export type NotificationSettingsSnapshot = {
  emailEnabled: boolean;
  whatsappEnabled: boolean;
  updatedAt: Date;
};

const globalForSettings = globalThis as unknown as {
  notificationSettingsCache?: NotificationSettingsSnapshot;
};

function envDefaults(): NotificationSettingsSnapshot {
  return {
    emailEnabled: process.env.EMAIL_ENABLED === "true",
    whatsappEnabled: process.env.WHATSAPP_ENABLED === "true",
    updatedAt: new Date(0),
  };
}

function setCache(settings: NotificationSettingsSnapshot) {
  globalForSettings.notificationSettingsCache = settings;
}

export function clearNotificationSettingsCache() {
  globalForSettings.notificationSettingsCache = undefined;
}

export function getNotificationSettingsCache() {
  return globalForSettings.notificationSettingsCache;
}

export function isEmailEnabledSync() {
  return getNotificationSettingsCache()?.emailEnabled ?? envDefaults().emailEnabled;
}

export function isWhatsAppEnabledSync() {
  return getNotificationSettingsCache()?.whatsappEnabled ?? envDefaults().whatsappEnabled;
}

export async function getNotificationSettings(): Promise<NotificationSettingsSnapshot> {
  const cached = getNotificationSettingsCache();
  if (cached) return cached;

  const existing = await prisma.notificationSettings.findUnique({
    where: { id: SETTINGS_ID },
    select: {
      emailEnabled: true,
      whatsappEnabled: true,
      updatedAt: true,
    },
  });

  if (existing) {
    const snapshot = {
      emailEnabled: existing.emailEnabled,
      whatsappEnabled: existing.whatsappEnabled,
      updatedAt: existing.updatedAt,
    };
    setCache(snapshot);
    return snapshot;
  }

  const defaults = envDefaults();
  const created = await prisma.notificationSettings.create({
    data: {
      id: SETTINGS_ID,
      emailEnabled: defaults.emailEnabled,
      whatsappEnabled: defaults.whatsappEnabled,
    },
    select: {
      emailEnabled: true,
      whatsappEnabled: true,
      updatedAt: true,
    },
  });

  const snapshot = {
    emailEnabled: created.emailEnabled,
    whatsappEnabled: created.whatsappEnabled,
    updatedAt: created.updatedAt,
  };
  setCache(snapshot);
  return snapshot;
}

export async function isEmailEnabled() {
  return (await getNotificationSettings()).emailEnabled;
}

export async function isWhatsAppEnabled() {
  return (await getNotificationSettings()).whatsappEnabled;
}

export async function updateNotificationSettings(
  data: Partial<Pick<NotificationSettingsSnapshot, "emailEnabled" | "whatsappEnabled">>,
  updatedByUserId?: string,
) {
  const current = await getNotificationSettings();
  const updatedById = updatedByUserId ? await resolveUserId(updatedByUserId) : undefined;

  const row = await prisma.notificationSettings.upsert({
    where: { id: SETTINGS_ID },
    create: {
      id: SETTINGS_ID,
      emailEnabled: data.emailEnabled ?? current.emailEnabled,
      whatsappEnabled: data.whatsappEnabled ?? current.whatsappEnabled,
      updatedById,
    },
    update: {
      ...(data.emailEnabled !== undefined ? { emailEnabled: data.emailEnabled } : {}),
      ...(data.whatsappEnabled !== undefined ? { whatsappEnabled: data.whatsappEnabled } : {}),
      ...(updatedById !== undefined ? { updatedById } : {}),
    },
    select: {
      emailEnabled: true,
      whatsappEnabled: true,
      updatedAt: true,
    },
  });

  const snapshot = {
    emailEnabled: row.emailEnabled,
    whatsappEnabled: row.whatsappEnabled,
    updatedAt: row.updatedAt,
  };
  setCache(snapshot);
  return snapshot;
}
