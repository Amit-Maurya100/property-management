-- CreateEnum
CREATE TYPE "payment_mode" AS ENUM ('CASH', 'CHEQUE', 'NEFT', 'UPI', 'OTHER');
CREATE TYPE "payment_status" AS ENUM ('PENDING', 'PARTIAL', 'PAID');

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN "advance_balance" DECIMAL(12,2) NOT NULL DEFAULT 0;

ALTER TABLE "rents" ADD COLUMN "prior_balance" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "rents" ADD COLUMN "balance_carried_forward" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "rents" ADD COLUMN "payment_status" "payment_status" NOT NULL DEFAULT 'PENDING';

CREATE INDEX "idx_rents_payment_status" ON "rents"("payment_status");

-- CreateTable
CREATE TABLE "payments" (
    "id" BIGSERIAL NOT NULL,
    "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "rent_id" BIGINT NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "mode" "payment_mode" NOT NULL,
    "applied_to_rent" DECIMAL(12,2) NOT NULL,
    "to_advance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "paid_at" DATE NOT NULL DEFAULT CURRENT_DATE,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payments_uuid_key" ON "payments"("uuid");
CREATE INDEX "idx_payments_rent_id" ON "payments"("rent_id");
CREATE INDEX "idx_payments_tenant_id" ON "payments"("tenant_id");
CREATE INDEX "idx_payments_paid_at" ON "payments"("paid_at");

ALTER TABLE "payments" ADD CONSTRAINT "payments_rent_id_fkey" FOREIGN KEY ("rent_id") REFERENCES "rents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
