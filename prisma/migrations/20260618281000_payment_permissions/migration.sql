INSERT INTO "resources" ("name", "description") VALUES
    ('payment', 'Rent payment records')
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
WHERE r.name = 'payment'
  AND a.name IN ('read', 'create', 'update', 'delete')
ON CONFLICT (resource, action) DO NOTHING;

INSERT INTO "role_permissions" (role_id, permission_id)
SELECT ro.id, p.id
FROM "roles" ro
CROSS JOIN "permissions" p
WHERE ro.name IN ('super_admin', 'admin')
  AND p.resource = 'payment'
ON CONFLICT DO NOTHING;

INSERT INTO "role_permissions" (role_id, permission_id)
SELECT ro.id, p.id
FROM "roles" ro
CROSS JOIN "permissions" p
WHERE ro.name = 'customer'
  AND p.resource = 'payment'
  AND p.action IN ('read', 'create', 'update', 'delete')
ON CONFLICT DO NOTHING;
