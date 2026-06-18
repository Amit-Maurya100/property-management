-- Role and permission management permissions
INSERT INTO "permissions" (resource, action, description) VALUES
    ('role', 'create', 'Create roles'),
    ('role', 'read', 'View roles'),
    ('role', 'update', 'Update roles'),
    ('role', 'delete', 'Delete roles'),
    ('permission', 'create', 'Create permissions'),
    ('permission', 'read', 'View permissions'),
    ('permission', 'update', 'Update permissions'),
    ('permission', 'delete', 'Delete permissions')
ON CONFLICT (resource, action) DO NOTHING;

-- Grant new permissions to super_admin
INSERT INTO "role_permissions" (role_id, permission_id)
SELECT r.id, p.id
FROM "roles" r
CROSS JOIN "permissions" p
WHERE r.name = 'super_admin'
  AND p.resource IN ('role', 'permission')
ON CONFLICT DO NOTHING;
