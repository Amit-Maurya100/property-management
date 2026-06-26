ALTER TABLE "users"
ADD COLUMN "must_change_password" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "tenants"
ADD COLUMN "user_id" BIGINT;

CREATE UNIQUE INDEX "tenants_user_id_key" ON "tenants"("user_id");
CREATE INDEX "idx_tenants_user_id" ON "tenants"("user_id");

ALTER TABLE "tenants"
ADD CONSTRAINT "tenants_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "roles" ("name", "description")
VALUES ('tenant', 'Property renter portal access')
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT ro.id, p.id
FROM "roles" ro
JOIN "permissions" p ON p.name IN ('tenant:read', 'rent:read', 'payment:read')
WHERE ro.name = 'tenant'
ON CONFLICT DO NOTHING;
