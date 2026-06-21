-- CreateTable
CREATE TABLE "gst_masters" (
    "id" BIGSERIAL NOT NULL,
    "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" BIGINT NOT NULL,
    "gst_number" VARCHAR(15) NOT NULL,
    "legal_name" VARCHAR(255) NOT NULL,
    "trade_name" VARCHAR(255) NOT NULL,
    "effective_registration_date" DATE NOT NULL,
    "constitution_of_business" VARCHAR(100) NOT NULL,
    "gstin_status" VARCHAR(50) NOT NULL,
    "taxpayer_type" VARCHAR(50) NOT NULL,
    "principal_place_of_business" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gst_masters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "gst_masters_uuid_key" ON "gst_masters"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "unique_org_gst_master_number" ON "gst_masters"("organization_id", "gst_number");

-- CreateIndex
CREATE INDEX "idx_gst_masters_org" ON "gst_masters"("organization_id");

-- CreateIndex
CREATE INDEX "idx_gst_masters_gst_number" ON "gst_masters"("gst_number");

-- AddForeignKey
ALTER TABLE "gst_masters" ADD CONSTRAINT "gst_masters_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Normalize existing GST numbers to uppercase
UPDATE "organizations" SET "gst_number" = UPPER(TRIM("gst_number")) WHERE "gst_number" IS NOT NULL;
UPDATE "gst_invoices" SET "gst_number" = UPPER(TRIM("gst_number")) WHERE "gst_number" IS NOT NULL;

-- Permissions for gst_master
INSERT INTO "resources" ("name", "description") VALUES
    ('gst_master', 'GST master records for parties and businesses')
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "permissions" ("resource_id", "action_id", "resource", "action", "description")
SELECT r.id, a.id, r.name, a.name,
    CASE a.name
        WHEN 'read' THEN 'View ' || r.name || ' records'
        WHEN 'create' THEN 'Create ' || r.name || ' records'
        WHEN 'update' THEN 'Update ' || r.name || ' records'
        WHEN 'delete' THEN 'Delete ' || r.name || ' records'
    END
FROM "resources" r
CROSS JOIN "actions" a
WHERE r.name = 'gst_master'
  AND a.name IN ('read', 'create', 'update', 'delete')
ON CONFLICT (resource, action) DO NOTHING;

INSERT INTO "role_permissions" (role_id, permission_id)
SELECT ro.id, p.id
FROM "roles" ro
CROSS JOIN "permissions" p
WHERE ro.name IN ('super_admin', 'admin')
  AND p.resource = 'gst_master'
ON CONFLICT DO NOTHING;

INSERT INTO "role_permissions" (role_id, permission_id)
SELECT ro.id, p.id
FROM "roles" ro
CROSS JOIN "permissions" p
WHERE ro.name = 'gst'
  AND p.resource = 'gst_master'
  AND p.action IN ('read', 'create', 'update', 'delete')
ON CONFLICT DO NOTHING;
