INSERT INTO "resources" ("name", "description") VALUES
    ('gst_tax_configuration', 'GST tax rate configuration')
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
WHERE r.name = 'gst_tax_configuration'
  AND a.name IN ('read', 'create', 'update', 'delete')
ON CONFLICT (resource, action) DO NOTHING;

INSERT INTO "role_permissions" (role_id, permission_id)
SELECT ro.id, p.id
FROM "roles" ro
CROSS JOIN "permissions" p
WHERE ro.name IN ('super_admin', 'admin')
  AND p.resource = 'gst_tax_configuration'
ON CONFLICT DO NOTHING;

INSERT INTO "role_permissions" (role_id, permission_id)
SELECT ro.id, p.id
FROM "roles" ro
CROSS JOIN "permissions" p
WHERE ro.name = 'gst'
  AND p.resource = 'gst_tax_configuration'
  AND p.action IN ('read', 'create', 'update', 'delete')
ON CONFLICT DO NOTHING;
