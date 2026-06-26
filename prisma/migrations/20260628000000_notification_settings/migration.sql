CREATE TABLE "notification_settings" (
    "id" INTEGER NOT NULL,
    "email_enabled" BOOLEAN NOT NULL DEFAULT false,
    "whatsapp_enabled" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by_id" BIGINT,

    CONSTRAINT "notification_settings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "notification_settings" ("id", "email_enabled", "whatsapp_enabled", "updated_at")
VALUES (1, false, false, NOW());
