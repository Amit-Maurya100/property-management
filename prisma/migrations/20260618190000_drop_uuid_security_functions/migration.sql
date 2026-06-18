-- Remove UUID overloads left after BIGINT migration (CREATE OR REPLACE cannot change arg types).
DROP FUNCTION IF EXISTS get_user_permissions(UUID);
DROP FUNCTION IF EXISTS user_has_permission(UUID, VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS admin_unlock_user(UUID, VARCHAR, TEXT);
