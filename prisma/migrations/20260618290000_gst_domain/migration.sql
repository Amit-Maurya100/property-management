-- CreateEnum
CREATE TYPE "organization_status" AS ENUM ('ACTIVE', 'INACTIVE', 'PENDING', 'SUSPENDED');
CREATE TYPE "gst_invoice_type" AS ENUM ('B2B_SALE', 'B2C_SALE', 'PURCHASE');

-- CreateTable
CREATE TABLE "organizations" (
    "id" BIGSERIAL NOT NULL,
    "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "owner_id" BIGINT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "address_id" BIGINT NOT NULL,
    "gst_number" VARCHAR(15) NOT NULL,
    "owner_name" VARCHAR(255) NOT NULL,
    "registration_date" DATE NOT NULL,
    "current_status" "organization_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "gst_invoices" (
    "id" BIGSERIAL NOT NULL,
    "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" BIGINT NOT NULL,
    "invoice_type" "gst_invoice_type" NOT NULL,
    "invoice_number" VARCHAR(100) NOT NULL,
    "invoice_date" DATE NOT NULL,
    "gst_number" VARCHAR(15),
    "customer_name" VARCHAR(255),
    "customer_address" TEXT,
    "taxable_value" DECIMAL(12,2) NOT NULL,
    "cgst" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "sgst" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "igst" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "cess" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_tax_amount" DECIMAL(12,2) NOT NULL,
    "invoice_value" DECIMAL(12,2) NOT NULL,
    "description" TEXT,
    "payment_status" "payment_status" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gst_invoices_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "organizations_uuid_key" ON "organizations"("uuid");
CREATE UNIQUE INDEX "organizations_owner_id_key" ON "organizations"("owner_id");
CREATE UNIQUE INDEX "organizations_address_id_key" ON "organizations"("address_id");
CREATE INDEX "idx_organizations_gst_number" ON "organizations"("gst_number");

CREATE UNIQUE INDEX "gst_invoices_uuid_key" ON "gst_invoices"("uuid");
CREATE UNIQUE INDEX "unique_org_type_invoice_number" ON "gst_invoices"("organization_id", "invoice_type", "invoice_number");
CREATE INDEX "idx_gst_invoices_org_type" ON "gst_invoices"("organization_id", "invoice_type");
CREATE INDEX "idx_gst_invoices_date" ON "gst_invoices"("invoice_date");

ALTER TABLE "organizations" ADD CONSTRAINT "organizations_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_address_id_fkey" FOREIGN KEY ("address_id") REFERENCES "addresses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "gst_invoices" ADD CONSTRAINT "gst_invoices_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
