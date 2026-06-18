ALTER TABLE "tenants"
  ADD COLUMN "unit_id" BIGINT;

ALTER TABLE "tenants"
  ADD CONSTRAINT "tenants_unit_id_fkey"
  FOREIGN KEY ("unit_id") REFERENCES "units"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "idx_tenants_unit_id" ON "tenants"("unit_id");
