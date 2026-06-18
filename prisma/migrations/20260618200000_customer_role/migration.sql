INSERT INTO "roles" (name, description)
VALUES ('customer', 'Registered property customer')
ON CONFLICT (name) DO NOTHING;
