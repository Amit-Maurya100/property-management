-- CreateEnum
CREATE TYPE "account_status" AS ENUM ('ACTIVE', 'LOCKED', 'DISABLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "attempt_type" AS ENUM ('SUCCESS', 'FAILURE', 'LOCKED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "username" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "login_attempts" INTEGER NOT NULL DEFAULT 0,
    "last_login_attempt" TIMESTAMPTZ,
    "last_successful_login" TIMESTAMPTZ,
    "locked_until" TIMESTAMPTZ,
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "account_status" "account_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "resource" VARCHAR(100) NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "role_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "granted_by" UUID,
    "granted_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_role_scopes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_role_id" UUID NOT NULL,
    "scope_type" VARCHAR(50) NOT NULL,
    "scope_value" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_role_scopes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "permission_id" UUID NOT NULL,
    "condition" JSONB NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_audit" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "email" VARCHAR(255),
    "ip_address" TEXT,
    "user_agent" TEXT,
    "attempt_type" "attempt_type" NOT NULL,
    "attempt_time" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "failure_reason" TEXT,

    CONSTRAINT "login_audit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "idx_users_username" ON "users"("username");

-- CreateIndex
CREATE INDEX "idx_users_email" ON "users"("email");

-- CreateIndex
CREATE INDEX "idx_users_account_status" ON "users"("account_status", "is_locked");

-- CreateIndex
CREATE INDEX "idx_users_locked_until" ON "users"("locked_until");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE INDEX "idx_permissions_resource" ON "permissions"("resource");

-- CreateIndex
CREATE INDEX "idx_permissions_action" ON "permissions"("action");

-- CreateIndex
CREATE INDEX "idx_permissions_name" ON "permissions"("name");

-- CreateIndex
CREATE UNIQUE INDEX "unique_resource_action" ON "permissions"("resource", "action");

-- CreateIndex
CREATE INDEX "idx_role_permissions_role_id" ON "role_permissions"("role_id");

-- CreateIndex
CREATE INDEX "idx_role_permissions_permission_id" ON "role_permissions"("permission_id");

-- CreateIndex
CREATE INDEX "idx_user_roles_user_id" ON "user_roles"("user_id");

-- CreateIndex
CREATE INDEX "idx_user_roles_role_id" ON "user_roles"("role_id");

-- CreateIndex
CREATE INDEX "idx_user_roles_granted_by" ON "user_roles"("granted_by");

-- CreateIndex
CREATE INDEX "idx_user_roles_expires_at" ON "user_roles"("expires_at");

-- CreateIndex
CREATE INDEX "idx_user_roles_active" ON "user_roles"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "unique_user_role" ON "user_roles"("user_id", "role_id");

-- CreateIndex
CREATE INDEX "idx_user_role_scopes_user_role_id" ON "user_role_scopes"("user_role_id");

-- CreateIndex
CREATE INDEX "idx_user_role_scopes_lookup" ON "user_role_scopes"("scope_type", "scope_value");

-- CreateIndex
CREATE UNIQUE INDEX "unique_user_role_scope" ON "user_role_scopes"("user_role_id", "scope_type", "scope_value");

-- CreateIndex
CREATE INDEX "idx_policies_permission_id" ON "policies"("permission_id");

-- CreateIndex
CREATE INDEX "idx_policies_priority" ON "policies"("priority" DESC);

-- CreateIndex
CREATE INDEX "idx_login_audit_user_id" ON "login_audit"("user_id");

-- CreateIndex
CREATE INDEX "idx_login_audit_attempt_time" ON "login_audit"("attempt_time" DESC);

-- CreateIndex
CREATE INDEX "idx_login_audit_ip" ON "login_audit"("ip_address");

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_role_scopes" ADD CONSTRAINT "user_role_scopes_user_role_id_fkey" FOREIGN KEY ("user_role_id") REFERENCES "user_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policies" ADD CONSTRAINT "policies_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "login_audit" ADD CONSTRAINT "login_audit_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
