INSERT INTO "roles" ("name", "description") VALUES
    ('gst', 'GST organization and invoice management')
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "resources" ("name", "description") VALUES
    ('gst_organization', 'GST registered organization'),
    ('gst_b2b_sale', 'GST B2B sales invoices'),
    ('gst_b2c_sale', 'GST B2C sales invoices'),
    ('gst_purchase', 'GST purchase invoices')
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
WHERE r.name IN ('gst_organization', 'gst_b2b_sale', 'gst_b2c_sale', 'gst_purchase')
  AND a.name IN ('read', 'create', 'update', 'delete')
ON CONFLICT (resource, action) DO NOTHING;

INSERT INTO "role_permissions" (role_id, permission_id)
SELECT ro.id, p.id
FROM "roles" ro
CROSS JOIN "permissions" p
WHERE ro.name IN ('super_admin', 'admin')
  AND p.resource IN ('gst_organization', 'gst_b2b_sale', 'gst_b2c_sale', 'gst_purchase')
ON CONFLICT DO NOTHING;

INSERT INTO "role_permissions" (role_id, permission_id)
SELECT ro.id, p.id
FROM "roles" ro
CROSS JOIN "permissions" p
WHERE ro.name = 'gst'
  AND p.resource IN ('gst_organization', 'gst_b2b_sale', 'gst_b2c_sale', 'gst_purchase')
  AND p.action IN ('read', 'create', 'update', 'delete')
ON CONFLICT DO NOTHING;
