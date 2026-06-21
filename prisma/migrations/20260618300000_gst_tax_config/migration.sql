-- CreateTable
CREATE TABLE "gst_tax_configurations" (
    "id" BIGSERIAL NOT NULL,
    "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" BIGINT NOT NULL,
    "cgst_rate" DECIMAL(5,2) NOT NULL,
    "sgst_rate" DECIMAL(5,2) NOT NULL,
    "igst_rate" DECIMAL(5,2) NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gst_tax_configurations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "gst_tax_configurations_uuid_key" ON "gst_tax_configurations"("uuid");
CREATE INDEX "idx_gst_tax_config_org_dates" ON "gst_tax_configurations"("organization_id", "start_date", "end_date");

ALTER TABLE "gst_tax_configurations" ADD CONSTRAINT "gst_tax_configurations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
