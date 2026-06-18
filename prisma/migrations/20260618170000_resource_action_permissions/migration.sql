-- Catalog entries for resource/action admin permissions
INSERT INTO "resources" ("name", "description") VALUES
    ('resource', 'Permission resource catalog'),
    ('action', 'Permission action catalog')
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "permissions" ("resource_id", "action_id", "resource", "action", "description")
SELECT r.id, a.id, r.name, a.name,
    CASE a.name
        WHEN 'read' THEN 'View resource catalog'
        WHEN 'create' THEN 'Create resource catalog entries'
        WHEN 'update' THEN 'Update resource catalog entries'
        WHEN 'delete' THEN 'Delete resource catalog entries'
    END
FROM "resources" r
CROSS JOIN "actions" a
WHERE r.name = 'resource'
  AND a.name IN ('read', 'create', 'update', 'delete')
ON CONFLICT (resource, action) DO NOTHING;

INSERT INTO "permissions" ("resource_id", "action_id", "resource", "action", "description")
SELECT r.id, a.id, r.name, a.name,
    CASE a.name
        WHEN 'read' THEN 'View action catalog'
        WHEN 'create' THEN 'Create action catalog entries'
        WHEN 'update' THEN 'Update action catalog entries'
        WHEN 'delete' THEN 'Delete action catalog entries'
    END
FROM "resources" r
CROSS JOIN "actions" a
WHERE r.name = 'action'
  AND a.name IN ('read', 'create', 'update', 'delete')
ON CONFLICT (resource, action) DO NOTHING;

INSERT INTO "role_permissions" (role_id, permission_id)
SELECT ro.id, p.id
FROM "roles" ro
CROSS JOIN "permissions" p
WHERE ro.name = 'super_admin'
  AND p.resource IN ('resource', 'action')
ON CONFLICT DO NOTHING;
