CREATE TABLE "tenants" (
    "id" BIGINT NOT NULL,
    "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "owner_id" BIGINT NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255),
    "phone" VARCHAR(30),
    "id_document" VARCHAR(100),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "tenants_uuid_key" ON "tenants"("uuid");
CREATE INDEX "idx_tenants_owner_id" ON "tenants"("owner_id");
CREATE INDEX "idx_tenants_email" ON "tenants"("email");
CREATE SEQUENCE "tenants_id_seq";
ALTER TABLE "tenants" ALTER COLUMN "id" SET DEFAULT nextval('tenants_id_seq');
ALTER SEQUENCE "tenants_id_seq" OWNED BY "tenants"."id";

CREATE TABLE "rents" (
    "id" BIGINT NOT NULL,
    "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" BIGINT NOT NULL,
    "unit_id" BIGINT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "rent" DECIMAL(12,2) NOT NULL,
    "electricity_units" DECIMAL(10,2),
    "gas_units" DECIMAL(10,2),
    "maintenance" DECIMAL(12,2),
    "misc" DECIMAL(12,2),
    "due_date" DATE NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "rents_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "rents_uuid_key" ON "rents"("uuid");
CREATE INDEX "idx_rents_tenant_id" ON "rents"("tenant_id");
CREATE INDEX "idx_rents_unit_id" ON "rents"("unit_id");
CREATE INDEX "idx_rents_due_date" ON "rents"("due_date");
CREATE SEQUENCE "rents_id_seq";
ALTER TABLE "rents" ALTER COLUMN "id" SET DEFAULT nextval('rents_id_seq');
ALTER SEQUENCE "rents_id_seq" OWNED BY "rents"."id";

ALTER TABLE "tenants" ADD CONSTRAINT "tenants_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rents" ADD CONSTRAINT "rents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rents" ADD CONSTRAINT "rents_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
