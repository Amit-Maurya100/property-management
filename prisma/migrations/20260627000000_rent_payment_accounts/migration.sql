CREATE TYPE "rent_payment_account_type" AS ENUM ('BANK', 'UPI');

CREATE TABLE "rent_payment_accounts" (
    "id" BIGSERIAL NOT NULL,
    "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "owner_id" BIGINT NOT NULL,
    "label" VARCHAR(100) NOT NULL,
    "account_type" "rent_payment_account_type" NOT NULL,
    "account_holder_name" VARCHAR(255),
    "bank_name" VARCHAR(255),
    "account_number" VARCHAR(50),
    "branch" VARCHAR(255),
    "ifsc_code" VARCHAR(11),
    "upi_id" VARCHAR(255),
    "upi_barcode_url" VARCHAR(2048),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rent_payment_accounts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "rent_payment_accounts_uuid_key" ON "rent_payment_accounts"("uuid");
CREATE INDEX "idx_rent_payment_accounts_owner_id" ON "rent_payment_accounts"("owner_id");
CREATE INDEX "idx_rent_payment_accounts_active" ON "rent_payment_accounts"("is_active");

ALTER TABLE "rent_payment_accounts" ADD CONSTRAINT "rent_payment_accounts_owner_id_fkey"
FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "tenant_rent_payment_accounts" (
    "tenant_id" BIGINT NOT NULL,
    "rent_payment_account_id" BIGINT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_rent_payment_accounts_pkey" PRIMARY KEY ("tenant_id","rent_payment_account_id")
);

CREATE INDEX "idx_tenant_rent_payment_accounts_account" ON "tenant_rent_payment_accounts"("rent_payment_account_id");

ALTER TABLE "tenant_rent_payment_accounts" ADD CONSTRAINT "tenant_rent_payment_accounts_tenant_id_fkey"
FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tenant_rent_payment_accounts" ADD CONSTRAINT "tenant_rent_payment_accounts_rent_payment_account_id_fkey"
FOREIGN KEY ("rent_payment_account_id") REFERENCES "rent_payment_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
