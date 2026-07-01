-- quote_requests may already exist from the marketing site; create only if missing
CREATE TABLE IF NOT EXISTS "quote_requests" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255),
    "phone" VARCHAR(50) NOT NULL,
    "company" VARCHAR(255),
    "interest" VARCHAR(100) NOT NULL,
    "message" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'NEW',
    "ip_address" VARCHAR(45),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quote_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_quote_requests_created_at" ON "quote_requests"("created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_quote_requests_status" ON "quote_requests"("status");

INSERT INTO "resources" ("name", "description") VALUES
    ('quote_request', 'Website quote / contact form submissions')
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "permissions" ("resource_id", "action_id", "resource", "action", "name", "description")
SELECT r.id, a.id, r.name, a.name, r.name || ':' || a.name,
    CASE a.name
        WHEN 'read' THEN 'View quote request submissions'
        WHEN 'update' THEN 'Update quote request status'
    END
FROM "resources" r
CROSS JOIN "actions" a
WHERE r.name = 'quote_request'
  AND a.name IN ('read', 'update')
ON CONFLICT (resource, action) DO NOTHING;

INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT ro.id, p.id
FROM "roles" ro
CROSS JOIN "permissions" p
WHERE ro.name IN ('super_admin', 'admin')
  AND p.resource = 'quote_request'
ON CONFLICT DO NOTHING;
