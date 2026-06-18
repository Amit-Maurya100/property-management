-- Login audit read permission
INSERT INTO "resources" ("name", "description") VALUES
    ('login_audit', 'Login audit trail')
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "permissions" ("resource_id", "action_id", "resource", "action", "description")
SELECT r.id, a.id, r.name, a.name, 'View login audit records'
FROM "resources" r
CROSS JOIN "actions" a
WHERE r.name = 'login_audit'
  AND a.name = 'read'
ON CONFLICT (resource, action) DO NOTHING;

INSERT INTO "role_permissions" (role_id, permission_id)
SELECT ro.id, p.id
FROM "roles" ro
CROSS JOIN "permissions" p
WHERE ro.name = 'super_admin'
  AND p.resource = 'login_audit'
  AND p.action = 'read'
ON CONFLICT DO NOTHING;
