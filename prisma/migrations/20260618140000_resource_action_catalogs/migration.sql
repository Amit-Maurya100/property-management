-- Resource catalog
CREATE TABLE "resources" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "resources_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "resources_name_key" ON "resources"("name");
CREATE INDEX "idx_resources_name" ON "resources"("name");
CREATE INDEX "idx_resources_active" ON "resources"("is_active") WHERE "is_active" = true;

-- Action catalog
CREATE TABLE "actions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "actions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "actions_name_key" ON "actions"("name");
CREATE INDEX "idx_actions_name" ON "actions"("name");
CREATE INDEX "idx_actions_active" ON "actions"("is_active") WHERE "is_active" = true;

-- Seed catalogs from existing permissions
INSERT INTO "resources" ("name")
SELECT DISTINCT "resource" FROM "permissions"
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "actions" ("name")
SELECT DISTINCT "action" FROM "permissions"
ON CONFLICT ("name") DO NOTHING;

-- Link permissions to catalogs
ALTER TABLE "permissions" ADD COLUMN "resource_id" UUID;
ALTER TABLE "permissions" ADD COLUMN "action_id" UUID;

UPDATE "permissions" p
SET "resource_id" = r."id"
FROM "resources" r
WHERE r."name" = p."resource";

UPDATE "permissions" p
SET "action_id" = a."id"
FROM "actions" a
WHERE a."name" = p."action";

ALTER TABLE "permissions" ALTER COLUMN "resource_id" SET NOT NULL;
ALTER TABLE "permissions" ALTER COLUMN "action_id" SET NOT NULL;

ALTER TABLE "permissions"
    ADD CONSTRAINT "permissions_resource_id_fkey"
    FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "permissions"
    ADD CONSTRAINT "permissions_action_id_fkey"
    FOREIGN KEY ("action_id") REFERENCES "actions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "unique_permission_resource_action" ON "permissions"("resource_id", "action_id");
CREATE INDEX "idx_permissions_resource_id" ON "permissions"("resource_id");
CREATE INDEX "idx_permissions_action_id" ON "permissions"("action_id");

-- Keep denormalized resource/action/name in sync when FKs change
CREATE OR REPLACE FUNCTION sync_permission_catalog_fields()
RETURNS TRIGGER AS $$
BEGIN
    SELECT name INTO NEW.resource FROM resources WHERE id = NEW.resource_id;
    SELECT name INTO NEW.action FROM actions WHERE id = NEW.action_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER permissions_sync_catalog_fields
    BEFORE INSERT OR UPDATE OF resource_id, action_id ON "permissions"
    FOR EACH ROW EXECUTE FUNCTION sync_permission_catalog_fields();

CREATE TRIGGER update_resources_updated_at BEFORE UPDATE ON "resources"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_actions_updated_at BEFORE UPDATE ON "actions"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed common catalog entries for future permissions
INSERT INTO "resources" ("name", "description") VALUES
    ('property', 'Property records'),
    ('tenant', 'Tenant management')
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "actions" ("name", "description") VALUES
    ('approve', 'Approve records'),
    ('export', 'Export data'),
    ('generate', 'Generate reports')
ON CONFLICT ("name") DO NOTHING;
