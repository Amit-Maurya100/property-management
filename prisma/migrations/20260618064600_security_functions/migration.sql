-- Convert permissions.name to generated column
ALTER TABLE "permissions" DROP COLUMN "name";
ALTER TABLE "permissions" ADD COLUMN "name" VARCHAR(150) GENERATED ALWAYS AS (resource || ':' || action) STORED;
CREATE INDEX IF NOT EXISTS "idx_permissions_name" ON "permissions"("name");

-- Convert login_audit.ip_address to INET
ALTER TABLE "login_audit"
  ALTER COLUMN "ip_address" TYPE INET
  USING CASE
    WHEN "ip_address" IS NULL OR "ip_address" = '' THEN NULL
    ELSE "ip_address"::inet
  END;

-- Partial indexes for performance
DROP INDEX IF EXISTS "idx_user_roles_expires_at";
CREATE INDEX "idx_user_roles_expires_at" ON "user_roles"("expires_at") WHERE "expires_at" IS NOT NULL;

DROP INDEX IF EXISTS "idx_user_roles_active";
CREATE INDEX "idx_user_roles_active" ON "user_roles"("is_active") WHERE "is_active" = true;

DROP INDEX IF EXISTS "idx_users_locked_until";
CREATE INDEX "idx_users_locked_until" ON "users"("locked_until") WHERE "locked_until" IS NOT NULL;

-- Helper: updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON "users"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON "roles"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_policies_updated_at BEFORE UPDATE ON "policies"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Permission check functions
CREATE OR REPLACE FUNCTION user_has_permission(
    p_user_id UUID,
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

CREATE OR REPLACE FUNCTION get_user_permissions(p_user_id UUID)
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

-- Login security functions
CREATE OR REPLACE FUNCTION record_failed_login(
    p_email VARCHAR,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
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
    v_user_id UUID;
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
    p_admin_id UUID,
    p_user_email VARCHAR,
    p_reason TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
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

CREATE OR REPLACE FUNCTION auto_unlock_expired_accounts()
RETURNS VOID AS $$
BEGIN
    UPDATE "users"
    SET
        locked_until = NULL,
        is_locked = FALSE,
        account_status = 'ACTIVE'
    WHERE locked_until IS NOT NULL
        AND locked_until <= NOW()
        AND account_status = 'LOCKED';
END;
$$ LANGUAGE plpgsql;

-- Sample permissions
INSERT INTO "permissions" (resource, action, description) VALUES
    ('user', 'create', 'Create new users'),
    ('user', 'read', 'View user information'),
    ('user', 'update', 'Update user information'),
    ('user', 'delete', 'Delete users'),
    ('invoice', 'create', 'Create invoices'),
    ('invoice', 'read', 'View invoices'),
    ('invoice', 'update', 'Update invoices'),
    ('invoice', 'delete', 'Delete invoices'),
    ('invoice', 'approve', 'Approve invoices'),
    ('report', 'generate', 'Generate reports'),
    ('report', 'export', 'Export reports')
ON CONFLICT (resource, action) DO NOTHING;

-- Sample roles
INSERT INTO "roles" (name, description) VALUES
    ('super_admin', 'Full system access'),
    ('admin', 'Administrative access without system config'),
    ('manager', 'Manage department resources'),
    ('editor', 'Edit content but no user management'),
    ('viewer', 'Read-only access')
ON CONFLICT (name) DO NOTHING;

-- Role-permission assignments
INSERT INTO "role_permissions" (role_id, permission_id)
SELECT r.id, p.id
FROM "roles" r, "permissions" p
WHERE r.name = 'super_admin'
ON CONFLICT DO NOTHING;

INSERT INTO "role_permissions" (role_id, permission_id)
SELECT r.id, p.id
FROM "roles" r, "permissions" p
WHERE r.name = 'admin'
    AND p.resource IN ('user', 'invoice', 'report')
ON CONFLICT DO NOTHING;

INSERT INTO "role_permissions" (role_id, permission_id)
SELECT r.id, p.id
FROM "roles" r, "permissions" p
WHERE r.name = 'manager'
    AND p.resource IN ('invoice', 'report')
ON CONFLICT DO NOTHING;

INSERT INTO "role_permissions" (role_id, permission_id)
SELECT r.id, p.id
FROM "roles" r, "permissions" p
WHERE r.name = 'editor'
    AND p.resource = 'invoice'
    AND p.action IN ('create', 'read', 'update')
ON CONFLICT DO NOTHING;

INSERT INTO "role_permissions" (role_id, permission_id)
SELECT r.id, p.id
FROM "roles" r, "permissions" p
WHERE r.name = 'viewer'
    AND p.action = 'read'
ON CONFLICT DO NOTHING;
