-- Migrate primary keys from UUID to BIGSERIAL while retaining uuid columns.

-- Drop all foreign keys first (they reference UUID primary keys)
ALTER TABLE "permissions" DROP CONSTRAINT IF EXISTS "permissions_resource_id_fkey";
ALTER TABLE "permissions" DROP CONSTRAINT IF EXISTS "permissions_action_id_fkey";
ALTER TABLE "role_permissions" DROP CONSTRAINT IF EXISTS "role_permissions_role_id_fkey";
ALTER TABLE "role_permissions" DROP CONSTRAINT IF EXISTS "role_permissions_permission_id_fkey";
ALTER TABLE "user_role_scopes" DROP CONSTRAINT IF EXISTS "user_role_scopes_user_role_id_fkey";
ALTER TABLE "user_roles" DROP CONSTRAINT IF EXISTS "user_roles_user_id_fkey";
ALTER TABLE "user_roles" DROP CONSTRAINT IF EXISTS "user_roles_role_id_fkey";
ALTER TABLE "user_roles" DROP CONSTRAINT IF EXISTS "user_roles_granted_by_fkey";
ALTER TABLE "policies" DROP CONSTRAINT IF EXISTS "policies_permission_id_fkey";
ALTER TABLE "login_audit" DROP CONSTRAINT IF EXISTS "login_audit_user_id_fkey";

-- USERS
ALTER TABLE "users" DROP CONSTRAINT "users_pkey";
ALTER TABLE "users" RENAME COLUMN "id" TO "uuid";
ALTER TABLE "users" ADD COLUMN "id" BIGINT;
CREATE SEQUENCE "users_id_seq";
UPDATE "users" SET "id" = nextval('users_id_seq');
ALTER TABLE "users" ALTER COLUMN "id" SET NOT NULL;
SELECT setval('users_id_seq', COALESCE((SELECT MAX("id") FROM "users"), 1));
ALTER TABLE "users" ALTER COLUMN "id" SET DEFAULT nextval('users_id_seq');
ALTER SEQUENCE "users_id_seq" OWNED BY "users"."id";
ALTER TABLE "users" ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");
CREATE UNIQUE INDEX "users_uuid_key" ON "users"("uuid");

-- ROLES
ALTER TABLE "roles" DROP CONSTRAINT "roles_pkey";
ALTER TABLE "roles" RENAME COLUMN "id" TO "uuid";
ALTER TABLE "roles" ADD COLUMN "id" BIGINT;
CREATE SEQUENCE "roles_id_seq";
UPDATE "roles" SET "id" = nextval('roles_id_seq');
ALTER TABLE "roles" ALTER COLUMN "id" SET NOT NULL;
SELECT setval('roles_id_seq', COALESCE((SELECT MAX("id") FROM "roles"), 1));
ALTER TABLE "roles" ALTER COLUMN "id" SET DEFAULT nextval('roles_id_seq');
ALTER SEQUENCE "roles_id_seq" OWNED BY "roles"."id";
ALTER TABLE "roles" ADD CONSTRAINT "roles_pkey" PRIMARY KEY ("id");
CREATE UNIQUE INDEX "roles_uuid_key" ON "roles"("uuid");

-- RESOURCES
ALTER TABLE "resources" DROP CONSTRAINT "resources_pkey";
ALTER TABLE "resources" RENAME COLUMN "id" TO "uuid";
ALTER TABLE "resources" ADD COLUMN "id" BIGINT;
CREATE SEQUENCE "resources_id_seq";
UPDATE "resources" SET "id" = nextval('resources_id_seq');
ALTER TABLE "resources" ALTER COLUMN "id" SET NOT NULL;
SELECT setval('resources_id_seq', COALESCE((SELECT MAX("id") FROM "resources"), 1));
ALTER TABLE "resources" ALTER COLUMN "id" SET DEFAULT nextval('resources_id_seq');
ALTER SEQUENCE "resources_id_seq" OWNED BY "resources"."id";
ALTER TABLE "resources" ADD CONSTRAINT "resources_pkey" PRIMARY KEY ("id");
CREATE UNIQUE INDEX "resources_uuid_key" ON "resources"("uuid");

-- ACTIONS
ALTER TABLE "actions" DROP CONSTRAINT "actions_pkey";
ALTER TABLE "actions" RENAME COLUMN "id" TO "uuid";
ALTER TABLE "actions" ADD COLUMN "id" BIGINT;
CREATE SEQUENCE "actions_id_seq";
UPDATE "actions" SET "id" = nextval('actions_id_seq');
ALTER TABLE "actions" ALTER COLUMN "id" SET NOT NULL;
SELECT setval('actions_id_seq', COALESCE((SELECT MAX("id") FROM "actions"), 1));
ALTER TABLE "actions" ALTER COLUMN "id" SET DEFAULT nextval('actions_id_seq');
ALTER SEQUENCE "actions_id_seq" OWNED BY "actions"."id";
ALTER TABLE "actions" ADD CONSTRAINT "actions_pkey" PRIMARY KEY ("id");
CREATE UNIQUE INDEX "actions_uuid_key" ON "actions"("uuid");

-- PERMISSIONS foreign keys to catalogs
ALTER TABLE "permissions" DROP CONSTRAINT IF EXISTS "permissions_resource_id_fkey";
ALTER TABLE "permissions" DROP CONSTRAINT IF EXISTS "permissions_action_id_fkey";
DROP INDEX IF EXISTS "unique_permission_resource_action";
DROP TRIGGER IF EXISTS "permissions_sync_catalog_fields" ON "permissions";

ALTER TABLE "permissions" ADD COLUMN "resource_id_big" BIGINT;
UPDATE "permissions" p
SET "resource_id_big" = r."id"
FROM "resources" r
WHERE r."uuid" = p."resource_id";

ALTER TABLE "permissions" ADD COLUMN "action_id_big" BIGINT;
UPDATE "permissions" p
SET "action_id_big" = a."id"
FROM "actions" a
WHERE a."uuid" = p."action_id";

ALTER TABLE "permissions" DROP COLUMN "resource_id";
ALTER TABLE "permissions" DROP COLUMN "action_id";
ALTER TABLE "permissions" RENAME COLUMN "resource_id_big" TO "resource_id";
ALTER TABLE "permissions" RENAME COLUMN "action_id_big" TO "action_id";
ALTER TABLE "permissions" ALTER COLUMN "resource_id" SET NOT NULL;
ALTER TABLE "permissions" ALTER COLUMN "action_id" SET NOT NULL;

-- PERMISSIONS primary key
ALTER TABLE "permissions" DROP CONSTRAINT "permissions_pkey";
ALTER TABLE "permissions" RENAME COLUMN "id" TO "uuid";
ALTER TABLE "permissions" ADD COLUMN "id" BIGINT;
CREATE SEQUENCE "permissions_id_seq";
UPDATE "permissions" SET "id" = nextval('permissions_id_seq');
ALTER TABLE "permissions" ALTER COLUMN "id" SET NOT NULL;
SELECT setval('permissions_id_seq', COALESCE((SELECT MAX("id") FROM "permissions"), 1));
ALTER TABLE "permissions" ALTER COLUMN "id" SET DEFAULT nextval('permissions_id_seq');
ALTER SEQUENCE "permissions_id_seq" OWNED BY "permissions"."id";
ALTER TABLE "permissions" ADD CONSTRAINT "permissions_pkey" PRIMARY KEY ("id");
CREATE UNIQUE INDEX "permissions_uuid_key" ON "permissions"("uuid");

ALTER TABLE "permissions"
    ADD CONSTRAINT "permissions_resource_id_fkey"
    FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "permissions"
    ADD CONSTRAINT "permissions_action_id_fkey"
    FOREIGN KEY ("action_id") REFERENCES "actions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE UNIQUE INDEX "unique_permission_resource_action" ON "permissions"("resource_id", "action_id");

-- ROLE_PERMISSIONS
ALTER TABLE "role_permissions" DROP CONSTRAINT "role_permissions_pkey";

ALTER TABLE "role_permissions" ADD COLUMN "role_id_big" BIGINT;
UPDATE "role_permissions" rp
SET "role_id_big" = r."id"
FROM "roles" r
WHERE r."uuid" = rp."role_id";

ALTER TABLE "role_permissions" ADD COLUMN "permission_id_big" BIGINT;
UPDATE "role_permissions" rp
SET "permission_id_big" = p."id"
FROM "permissions" p
WHERE p."uuid" = rp."permission_id";

ALTER TABLE "role_permissions" DROP COLUMN "role_id";
ALTER TABLE "role_permissions" DROP COLUMN "permission_id";
ALTER TABLE "role_permissions" RENAME COLUMN "role_id_big" TO "role_id";
ALTER TABLE "role_permissions" RENAME COLUMN "permission_id_big" TO "permission_id";
ALTER TABLE "role_permissions" ALTER COLUMN "role_id" SET NOT NULL;
ALTER TABLE "role_permissions" ALTER COLUMN "permission_id" SET NOT NULL;

ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id", "permission_id");
ALTER TABLE "role_permissions"
    ADD CONSTRAINT "role_permissions_role_id_fkey"
    FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "role_permissions"
    ADD CONSTRAINT "role_permissions_permission_id_fkey"
    FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- USER_ROLES
DROP INDEX IF EXISTS "unique_user_role";

ALTER TABLE "user_roles" ADD COLUMN "user_id_big" BIGINT;
UPDATE "user_roles" ur
SET "user_id_big" = u."id"
FROM "users" u
WHERE u."uuid" = ur."user_id";

ALTER TABLE "user_roles" ADD COLUMN "role_id_big" BIGINT;
UPDATE "user_roles" ur
SET "role_id_big" = r."id"
FROM "roles" r
WHERE r."uuid" = ur."role_id";

ALTER TABLE "user_roles" ADD COLUMN "granted_by_big" BIGINT;
UPDATE "user_roles" ur
SET "granted_by_big" = u."id"
FROM "users" u
WHERE u."uuid" = ur."granted_by";

ALTER TABLE "user_roles" DROP COLUMN "user_id";
ALTER TABLE "user_roles" DROP COLUMN "role_id";
ALTER TABLE "user_roles" DROP COLUMN "granted_by";
ALTER TABLE "user_roles" RENAME COLUMN "user_id_big" TO "user_id";
ALTER TABLE "user_roles" RENAME COLUMN "role_id_big" TO "role_id";
ALTER TABLE "user_roles" RENAME COLUMN "granted_by_big" TO "granted_by";
ALTER TABLE "user_roles" ALTER COLUMN "user_id" SET NOT NULL;
ALTER TABLE "user_roles" ALTER COLUMN "role_id" SET NOT NULL;

ALTER TABLE "user_roles" DROP CONSTRAINT "user_roles_pkey";
ALTER TABLE "user_roles" RENAME COLUMN "id" TO "uuid";
ALTER TABLE "user_roles" ADD COLUMN "id" BIGINT;
CREATE SEQUENCE "user_roles_id_seq";
UPDATE "user_roles" SET "id" = nextval('user_roles_id_seq');
ALTER TABLE "user_roles" ALTER COLUMN "id" SET NOT NULL;
SELECT setval('user_roles_id_seq', COALESCE((SELECT MAX("id") FROM "user_roles"), 1));
ALTER TABLE "user_roles" ALTER COLUMN "id" SET DEFAULT nextval('user_roles_id_seq');
ALTER SEQUENCE "user_roles_id_seq" OWNED BY "user_roles"."id";
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id");
CREATE UNIQUE INDEX "user_roles_uuid_key" ON "user_roles"("uuid");

ALTER TABLE "user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_roles"
    ADD CONSTRAINT "user_roles_role_id_fkey"
    FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_roles"
    ADD CONSTRAINT "user_roles_granted_by_fkey"
    FOREIGN KEY ("granted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "user_roles" ADD CONSTRAINT "unique_user_role" UNIQUE ("user_id", "role_id");

-- USER_ROLE_SCOPES
ALTER TABLE "user_role_scopes" DROP CONSTRAINT "user_role_scopes_pkey";
DROP INDEX IF EXISTS "unique_user_role_scope";

ALTER TABLE "user_role_scopes" ADD COLUMN "user_role_id_big" BIGINT;
UPDATE "user_role_scopes" urs
SET "user_role_id_big" = ur."id"
FROM "user_roles" ur
WHERE ur."uuid" = urs."user_role_id";

ALTER TABLE "user_role_scopes" DROP COLUMN "user_role_id";
ALTER TABLE "user_role_scopes" RENAME COLUMN "user_role_id_big" TO "user_role_id";
ALTER TABLE "user_role_scopes" ALTER COLUMN "user_role_id" SET NOT NULL;

ALTER TABLE "user_role_scopes" RENAME COLUMN "id" TO "uuid";
ALTER TABLE "user_role_scopes" ADD COLUMN "id" BIGINT;
CREATE SEQUENCE "user_role_scopes_id_seq";
UPDATE "user_role_scopes" SET "id" = nextval('user_role_scopes_id_seq');
ALTER TABLE "user_role_scopes" ALTER COLUMN "id" SET NOT NULL;
SELECT setval('user_role_scopes_id_seq', COALESCE((SELECT MAX("id") FROM "user_role_scopes"), 1));
ALTER TABLE "user_role_scopes" ALTER COLUMN "id" SET DEFAULT nextval('user_role_scopes_id_seq');
ALTER SEQUENCE "user_role_scopes_id_seq" OWNED BY "user_role_scopes"."id";
ALTER TABLE "user_role_scopes" ADD CONSTRAINT "user_role_scopes_pkey" PRIMARY KEY ("id");
CREATE UNIQUE INDEX "user_role_scopes_uuid_key" ON "user_role_scopes"("uuid");

ALTER TABLE "user_role_scopes"
    ADD CONSTRAINT "user_role_scopes_user_role_id_fkey"
    FOREIGN KEY ("user_role_id") REFERENCES "user_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_role_scopes"
    ADD CONSTRAINT "unique_user_role_scope" UNIQUE ("user_role_id", "scope_type", "scope_value");

-- POLICIES
ALTER TABLE "policies" DROP CONSTRAINT "policies_pkey";

ALTER TABLE "policies" ADD COLUMN "permission_id_big" BIGINT;
UPDATE "policies" pol
SET "permission_id_big" = p."id"
FROM "permissions" p
WHERE p."uuid" = pol."permission_id";

ALTER TABLE "policies" DROP COLUMN "permission_id";
ALTER TABLE "policies" RENAME COLUMN "permission_id_big" TO "permission_id";
ALTER TABLE "policies" ALTER COLUMN "permission_id" SET NOT NULL;

ALTER TABLE "policies" RENAME COLUMN "id" TO "uuid";
ALTER TABLE "policies" ADD COLUMN "id" BIGINT;
CREATE SEQUENCE "policies_id_seq";
UPDATE "policies" SET "id" = nextval('policies_id_seq');
ALTER TABLE "policies" ALTER COLUMN "id" SET NOT NULL;
SELECT setval('policies_id_seq', COALESCE((SELECT MAX("id") FROM "policies"), 1));
ALTER TABLE "policies" ALTER COLUMN "id" SET DEFAULT nextval('policies_id_seq');
ALTER SEQUENCE "policies_id_seq" OWNED BY "policies"."id";
ALTER TABLE "policies" ADD CONSTRAINT "policies_pkey" PRIMARY KEY ("id");
CREATE UNIQUE INDEX "policies_uuid_key" ON "policies"("uuid");

ALTER TABLE "policies"
    ADD CONSTRAINT "policies_permission_id_fkey"
    FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- LOGIN_AUDIT
ALTER TABLE "login_audit" DROP CONSTRAINT "login_audit_pkey";

ALTER TABLE "login_audit" ADD COLUMN "user_id_big" BIGINT;
UPDATE "login_audit" la
SET "user_id_big" = u."id"
FROM "users" u
WHERE u."uuid" = la."user_id";

ALTER TABLE "login_audit" DROP COLUMN "user_id";
ALTER TABLE "login_audit" RENAME COLUMN "user_id_big" TO "user_id";

ALTER TABLE "login_audit" RENAME COLUMN "id" TO "uuid";
ALTER TABLE "login_audit" ADD COLUMN "id" BIGINT;
CREATE SEQUENCE "login_audit_id_seq";
UPDATE "login_audit" SET "id" = nextval('login_audit_id_seq');
ALTER TABLE "login_audit" ALTER COLUMN "id" SET NOT NULL;
SELECT setval('login_audit_id_seq', COALESCE((SELECT MAX("id") FROM "login_audit"), 1));
ALTER TABLE "login_audit" ALTER COLUMN "id" SET DEFAULT nextval('login_audit_id_seq');
ALTER SEQUENCE "login_audit_id_seq" OWNED BY "login_audit"."id";
ALTER TABLE "login_audit" ADD CONSTRAINT "login_audit_pkey" PRIMARY KEY ("id");
CREATE UNIQUE INDEX "login_audit_uuid_key" ON "login_audit"("uuid");

ALTER TABLE "login_audit"
    ADD CONSTRAINT "login_audit_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Permission catalog sync trigger (bigint FKs)
CREATE OR REPLACE FUNCTION sync_permission_catalog_fields()
RETURNS TRIGGER AS $$
BEGIN
    SELECT name INTO NEW.resource FROM resources WHERE id = NEW.resource_id;
    SELECT name INTO NEW.action FROM actions WHERE id = NEW.action_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER permissions_sync_catalog_fields
    BEFORE INSERT OR UPDATE OF resource_id, action_id ON "permissions"
    FOR EACH ROW EXECUTE FUNCTION sync_permission_catalog_fields();

-- Security functions (BIGINT user ids)
CREATE OR REPLACE FUNCTION user_has_permission(
    p_user_id BIGINT,
    p_resource VARCHAR,
    p_action VARCHAR
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM "user_roles" ur
        JOIN "role_permissions" rp ON ur.role_id = rp.role_id
        JOIN "permissions" p ON rp.permission_id = p.id
        WHERE ur.user_id = p_user_id
            AND ur.is_active = true
            AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
            AND p.resource = p_resource
            AND p.action = p_action
    );
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION get_user_permissions(p_user_id BIGINT)
RETURNS TABLE(
    resource VARCHAR,
    action VARCHAR,
    permission_name VARCHAR,
    scope_type VARCHAR,
    scope_value VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        p.resource::VARCHAR,
        p.action::VARCHAR,
        p.name::VARCHAR,
        urs.scope_type::VARCHAR,
        urs.scope_value::VARCHAR
    FROM "user_roles" ur
    JOIN "role_permissions" rp ON ur.role_id = rp.role_id
    JOIN "permissions" p ON rp.permission_id = p.id
    LEFT JOIN "user_role_scopes" urs ON ur.id = urs.user_role_id
    WHERE ur.user_id = p_user_id
        AND ur.is_active = true
        AND (ur.expires_at IS NULL OR ur.expires_at > NOW());
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION record_failed_login(
    p_email VARCHAR,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_user_id BIGINT;
    v_login_attempts INTEGER;
    v_locked_until TIMESTAMPTZ;
    v_max_attempts CONSTANT INTEGER := 7;
    v_lock_duration CONSTANT INTERVAL := '15 minutes';
BEGIN
    SELECT id, login_attempts, locked_until INTO v_user_id, v_login_attempts, v_locked_until
    FROM "users"
    WHERE email = p_email;

    IF v_user_id IS NULL THEN
        INSERT INTO "login_audit" (email, ip_address, user_agent, attempt_type, failure_reason)
        VALUES (p_email, p_ip_address, p_user_agent, 'FAILURE', 'User not found');

        RETURN jsonb_build_object('success', false, 'message', 'Invalid credentials', 'remaining_attempts', NULL);
    END IF;

    IF EXISTS (SELECT 1 FROM "users" WHERE id = v_user_id AND account_status = 'DISABLED') THEN
        INSERT INTO "login_audit" (user_id, email, ip_address, user_agent, attempt_type, failure_reason)
        VALUES (v_user_id, p_email, p_ip_address, p_user_agent, 'FAILURE', 'Account permanently disabled');

        RETURN jsonb_build_object('success', false, 'message', 'Account disabled. Contact administrator.', 'is_permanent', true);
    END IF;

    IF v_locked_until IS NOT NULL AND v_locked_until > NOW() THEN
        INSERT INTO "login_audit" (user_id, email, ip_address, user_agent, attempt_type, failure_reason)
        VALUES (v_user_id, p_email, p_ip_address, p_user_agent, 'LOCKED', 'Account temporarily locked');

        RETURN jsonb_build_object(
            'success', false,
            'message', format('Account locked. Try again after %s', to_char(v_locked_until, 'HH24:MI:SS')),
            'locked_until', v_locked_until,
            'is_temporary', true
        );
    END IF;

    v_login_attempts := COALESCE(v_login_attempts, 0) + 1;

    IF v_login_attempts >= v_max_attempts THEN
        v_locked_until := NOW() + v_lock_duration;

        UPDATE "users"
        SET
            login_attempts = v_login_attempts,
            last_login_attempt = NOW(),
            locked_until = v_locked_until,
            is_locked = TRUE,
            account_status = 'LOCKED'
        WHERE id = v_user_id;

        INSERT INTO "login_audit" (user_id, email, ip_address, user_agent, attempt_type, failure_reason)
        VALUES (v_user_id, p_email, p_ip_address, p_user_agent, 'LOCKED',
                format('Max attempts (%s) exceeded', v_max_attempts));

        RETURN jsonb_build_object(
            'success', false,
            'message', format('Account locked for %s minutes due to %s failed attempts',
                             EXTRACT(MINUTE FROM v_lock_duration), v_max_attempts),
            'remaining_attempts', 0,
            'locked_until', v_locked_until
        );
    ELSE
        UPDATE "users"
        SET
            login_attempts = v_login_attempts,
            last_login_attempt = NOW(),
            locked_until = NULL,
            is_locked = FALSE,
            account_status = 'ACTIVE'
        WHERE id = v_user_id;

        INSERT INTO "login_audit" (user_id, email, ip_address, user_agent, attempt_type, failure_reason)
        VALUES (v_user_id, p_email, p_ip_address, p_user_agent, 'FAILURE',
                format('Invalid password. Attempt %s of %s', v_login_attempts, v_max_attempts));

        RETURN jsonb_build_object(
            'success', false,
            'message', 'Invalid credentials',
            'remaining_attempts', v_max_attempts - v_login_attempts,
            'attempts_used', v_login_attempts
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION record_successful_login(
    p_email VARCHAR,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_user_id BIGINT;
BEGIN
    SELECT id INTO v_user_id FROM "users" WHERE email = p_email;

    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'User not found');
    END IF;

    UPDATE "users"
    SET
        login_attempts = 0,
        last_login_attempt = NOW(),
        last_successful_login = NOW(),
        locked_until = NULL,
        is_locked = FALSE,
        account_status = 'ACTIVE'
    WHERE id = v_user_id;

    INSERT INTO "login_audit" (user_id, email, ip_address, user_agent, attempt_type)
    VALUES (v_user_id, p_email, p_ip_address, p_user_agent, 'SUCCESS');

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Login successful',
        'user_id', v_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION admin_unlock_user(
    p_admin_id BIGINT,
    p_user_email VARCHAR,
    p_reason TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_user_id BIGINT;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM "user_roles" ur
        JOIN "role_permissions" rp ON ur.role_id = rp.role_id
        JOIN "permissions" p ON rp.permission_id = p.id
        WHERE ur.user_id = p_admin_id
            AND p.resource = 'user'
            AND p.action = 'update'
            AND ur.is_active = true
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient permissions');
    END IF;

    SELECT id INTO v_user_id FROM "users" WHERE email = p_user_email;

    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'User not found');
    END IF;

    UPDATE "users"
    SET
        login_attempts = 0,
        locked_until = NULL,
        is_locked = FALSE,
        account_status = 'ACTIVE'
    WHERE id = v_user_id;

    INSERT INTO "login_audit" (user_id, email, attempt_type, failure_reason)
    VALUES (v_user_id, p_user_email, 'SUCCESS',
            format('Manually unlocked by admin %s. Reason: %s', p_admin_id, COALESCE(p_reason, 'Not provided')));

    RETURN jsonb_build_object(
        'success', true,
        'message', 'User account unlocked successfully'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
