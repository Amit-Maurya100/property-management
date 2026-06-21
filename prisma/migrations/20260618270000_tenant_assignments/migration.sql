-- Create tenant_assignments and move lease/rent terms off tenants.

CREATE TABLE "tenant_assignments" (
    "id" BIGSERIAL NOT NULL,
    "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" BIGINT NOT NULL,
    "unit_id" BIGINT NOT NULL,
    "monthly_rent" DECIMAL(12,2),
    "lease_from" DATE,
    "lease_to" DATE,
    "monthly_due_day" INTEGER,
    "initial_gas_units" DECIMAL(10,2),
    "initial_electricity_units" DECIMAL(10,2),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_assignments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tenant_assignments_uuid_key" ON "tenant_assignments"("uuid");
CREATE INDEX "idx_tenant_assignments_tenant_id" ON "tenant_assignments"("tenant_id");
CREATE INDEX "idx_tenant_assignments_unit_id" ON "tenant_assignments"("unit_id");
CREATE INDEX "idx_tenant_assignments_is_active" ON "tenant_assignments"("is_active");

ALTER TABLE "tenant_assignments"
    ADD CONSTRAINT "tenant_assignments_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tenant_assignments"
    ADD CONSTRAINT "tenant_assignments_unit_id_fkey"
    FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Migrate lease fields from tenants into assignments.
INSERT INTO "tenant_assignments" (
    "tenant_id",
    "unit_id",
    "monthly_rent",
    "lease_from",
    "lease_to",
    "monthly_due_day",
    "initial_gas_units",
    "initial_electricity_units",
    "is_active",
    "notes",
    "created_at",
    "updated_at"
)
SELECT
    t."id",
    COALESCE(t."unit_id", r."unit_id"),
    COALESCE(t."initial_rent", r."rent"),
    COALESCE(t."lease_from", r."start_date"),
    COALESCE(t."lease_to", r."end_date"),
    t."monthly_due_day",
    t."initial_gas_units",
    t."initial_electricity_units",
    COALESCE(t."is_active", true),
    t."notes",
    t."created_at",
    t."updated_at"
FROM "tenants" t
LEFT JOIN LATERAL (
    SELECT "unit_id", "rent", "start_date", "end_date"
    FROM "rents"
    WHERE "tenant_id" = t."id" AND "is_active" = true
    ORDER BY "start_date" DESC, "id" DESC
    LIMIT 1
) r ON true
WHERE COALESCE(t."unit_id", r."unit_id") IS NOT NULL
  AND (
    t."initial_rent" IS NOT NULL
    OR t."lease_from" IS NOT NULL
    OR t."lease_to" IS NOT NULL
    OR t."monthly_due_day" IS NOT NULL
    OR t."initial_gas_units" IS NOT NULL
    OR t."initial_electricity_units" IS NOT NULL
    OR r."unit_id" IS NOT NULL
  );

-- Migrate active lease rows that did not produce a tenant assignment yet.
INSERT INTO "tenant_assignments" (
    "tenant_id",
    "unit_id",
    "monthly_rent",
    "lease_from",
    "lease_to",
    "monthly_due_day",
    "is_active",
    "created_at",
    "updated_at"
)
SELECT
    r."tenant_id",
    r."unit_id",
    r."rent",
    r."start_date",
    r."end_date",
    t."monthly_due_day",
    true,
    r."created_at",
    r."updated_at"
FROM "rents" r
JOIN "tenants" t ON t."id" = r."tenant_id"
WHERE r."is_active" = true
  AND NOT EXISTS (
    SELECT 1
    FROM "tenant_assignments" ta
    WHERE ta."tenant_id" = r."tenant_id"
      AND ta."unit_id" = r."unit_id"
      AND ta."is_active" = true
  );

-- Remove duplicate active assignments per tenant+unit (keep newest).
UPDATE "tenant_assignments" ta
SET "is_active" = false
WHERE ta."is_active" = true
  AND ta."id" NOT IN (
    SELECT DISTINCT ON ("tenant_id", "unit_id") "id"
    FROM "tenant_assignments"
    WHERE "is_active" = true
    ORDER BY "tenant_id", "unit_id", "created_at" DESC, "id" DESC
  );

-- Link monthly rent bills to assignments.
ALTER TABLE "rents" ADD COLUMN "tenant_assignment_id" BIGINT;

UPDATE "rents" r
SET "tenant_assignment_id" = (
    SELECT ta."id"
    FROM "tenant_assignments" ta
    WHERE ta."tenant_id" = r."tenant_id"
      AND ta."unit_id" = r."unit_id"
    ORDER BY ta."is_active" DESC, ta."created_at" DESC, ta."id" DESC
    LIMIT 1
)
WHERE r."is_active" = false;

-- Drop active lease rows now represented as assignments.
DELETE FROM "rents" WHERE "is_active" = true;

-- Ensure every remaining rent row has an assignment link.
UPDATE "rents" r
SET "tenant_assignment_id" = (
    SELECT ta."id"
    FROM "tenant_assignments" ta
    WHERE ta."tenant_id" = r."tenant_id"
      AND ta."unit_id" = r."unit_id"
    ORDER BY ta."created_at" DESC, ta."id" DESC
    LIMIT 1
)
WHERE r."tenant_assignment_id" IS NULL;

DELETE FROM "rents" WHERE "tenant_assignment_id" IS NULL;

ALTER TABLE "rents" ALTER COLUMN "tenant_assignment_id" SET NOT NULL;

ALTER TABLE "rents"
    ADD CONSTRAINT "rents_tenant_assignment_id_fkey"
    FOREIGN KEY ("tenant_assignment_id") REFERENCES "tenant_assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "idx_rents_tenant_assignment_id" ON "rents"("tenant_assignment_id");

DROP INDEX IF EXISTS "idx_rents_is_active";
ALTER TABLE "rents" DROP COLUMN "is_active";

ALTER TABLE "tenants" DROP COLUMN "initial_rent";
ALTER TABLE "tenants" DROP COLUMN "lease_from";
ALTER TABLE "tenants" DROP COLUMN "lease_to";
ALTER TABLE "tenants" DROP COLUMN "monthly_due_day";
ALTER TABLE "tenants" DROP COLUMN "initial_gas_units";
ALTER TABLE "tenants" DROP COLUMN "initial_electricity_units";
ALTER TABLE "tenants" DROP COLUMN "is_active";
ALTER TABLE "tenants" DROP COLUMN "notes";
