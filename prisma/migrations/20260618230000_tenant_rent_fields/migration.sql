-- Tenant lease defaults and picture
ALTER TABLE "tenants"
  ADD COLUMN "picture_url" VARCHAR(2048),
  ADD COLUMN "initial_rent" DECIMAL(12, 2),
  ADD COLUMN "lease_from" DATE,
  ADD COLUMN "lease_to" DATE,
  ADD COLUMN "monthly_due_day" INTEGER,
  ADD COLUMN "initial_gas_units" DECIMAL(10, 2),
  ADD COLUMN "initial_electricity_units" DECIMAL(10, 2),
  ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "tenants"
  ADD CONSTRAINT "tenants_monthly_due_day_check"
  CHECK ("monthly_due_day" IS NULL OR ("monthly_due_day" >= 1 AND "monthly_due_day" <= 31));

CREATE INDEX "idx_tenants_is_active" ON "tenants"("is_active");

-- Yearly rent revisions with active flag
ALTER TABLE "rents"
  ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX "idx_rents_is_active" ON "rents"("is_active");
