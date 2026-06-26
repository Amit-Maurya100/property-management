ALTER TABLE "gst_masters"
  ADD COLUMN "primary_contact" VARCHAR(255),
  ADD COLUMN "secondary_contact" VARCHAR(255);

CREATE TABLE "gst_master_bank_accounts" (
    "id" BIGSERIAL NOT NULL,
    "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "gst_master_id" BIGINT NOT NULL,
    "account_holder_name" VARCHAR(255) NOT NULL,
    "bank_name" VARCHAR(255) NOT NULL,
    "account_number" VARCHAR(50) NOT NULL,
    "branch" VARCHAR(255) NOT NULL,
    "ifsc_code" VARCHAR(11) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gst_master_bank_accounts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "gst_master_bank_accounts_uuid_key" ON "gst_master_bank_accounts"("uuid");
CREATE INDEX "idx_gst_master_bank_accounts_master" ON "gst_master_bank_accounts"("gst_master_id");

ALTER TABLE "gst_master_bank_accounts" ADD CONSTRAINT "gst_master_bank_accounts_gst_master_id_fkey" FOREIGN KEY ("gst_master_id") REFERENCES "gst_masters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
