import { z } from "zod";

export const updateNotificationSettingsSchema = z
  .object({
    emailEnabled: z.boolean().optional(),
    whatsappEnabled: z.boolean().optional(),
    whatsappAction: z.enum(["reconnect", "logout"]).optional(),
  })
  .refine(
    (value) =>
      value.emailEnabled !== undefined ||
      value.whatsappEnabled !== undefined ||
      value.whatsappAction !== undefined,
    { message: "At least one field is required" },
  );
