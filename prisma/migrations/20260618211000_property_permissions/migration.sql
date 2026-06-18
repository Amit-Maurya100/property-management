-- Property domain resources
INSERT INTO "resources" ("name", "description") VALUES
    ('property', 'Property listings'),
    ('building', 'Buildings within properties'),
    ('floor', 'Floors within buildings'),
    ('unit', 'Units within floors'),
    ('room', 'Rooms within units'),
    ('bed', 'Beds within rooms'),
    ('amenity', 'Amenity catalog')
ON CONFLICT ("name") DO NOTHING;

-- Permissions for property domain resources
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
WHERE r.name IN ('property', 'building', 'floor', 'unit', 'room', 'bed', 'amenity')
  AND a.name IN ('read', 'create', 'update', 'delete')
ON CONFLICT (resource, action) DO NOTHING;

-- super_admin gets all property permissions
INSERT INTO "role_permissions" (role_id, permission_id)
SELECT ro.id, p.id
FROM "roles" ro
CROSS JOIN "permissions" p
WHERE ro.name = 'super_admin'
  AND p.resource IN ('property', 'building', 'floor', 'unit', 'room', 'bed', 'amenity')
ON CONFLICT DO NOTHING;

-- admin gets all property permissions
INSERT INTO "role_permissions" (role_id, permission_id)
SELECT ro.id, p.id
FROM "roles" ro
CROSS JOIN "permissions" p
WHERE ro.name = 'admin'
  AND p.resource IN ('property', 'building', 'floor', 'unit', 'room', 'bed', 'amenity')
ON CONFLICT DO NOTHING;

-- customer: full CRUD on property hierarchy, amenity read only
INSERT INTO "role_permissions" (role_id, permission_id)
SELECT ro.id, p.id
FROM "roles" ro
CROSS JOIN "permissions" p
WHERE ro.name = 'customer'
  AND (
    (p.resource IN ('property', 'building', 'floor', 'unit', 'room', 'bed')
     AND p.action IN ('read', 'create', 'update', 'delete'))
    OR (p.resource = 'amenity' AND p.action = 'read')
  )
ON CONFLICT DO NOTHING;

-- Seed sample amenities
INSERT INTO "amenities" ("name", "category") VALUES
    ('WiFi', 'INTERNET'),
    ('Parking', 'PARKING'),
    ('24/7 Security', 'SECURITY')
ON CONFLICT ("name") DO NOTHING;
