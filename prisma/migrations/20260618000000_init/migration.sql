-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "account_status" AS ENUM ('ACTIVE', 'LOCKED', 'DISABLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "attempt_type" AS ENUM ('SUCCESS', 'FAILURE', 'LOCKED');

-- CreateEnum
CREATE TYPE "property_type" AS ENUM ('APARTMENT', 'HOTEL', 'HOSTEL', 'OFFICE');

-- CreateEnum
CREATE TYPE "unit_type" AS ENUM ('APARTMENT', 'ROOM', 'OFFICE', 'SHOP', 'HALL');

-- CreateEnum
CREATE TYPE "room_type" AS ENUM ('BEDROOM', 'KITCHEN', 'BATHROOM', 'OFFICE_ROOM');

-- CreateEnum
CREATE TYPE "bed_type" AS ENUM ('SINGLE', 'DOUBLE', 'BUNK');

-- CreateEnum
CREATE TYPE "amenity_category" AS ENUM ('INTERNET', 'PARKING', 'SECURITY');

-- CreateEnum
CREATE TYPE "billing_cycle" AS ENUM ('HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "availability_status" AS ENUM ('AVAILABLE', 'RESERVED', 'OCCUPIED');

-- CreateEnum
CREATE TYPE "payment_mode" AS ENUM ('CASH', 'CHEQUE', 'NEFT', 'UPI', 'OTHER');

-- CreateEnum
CREATE TYPE "payment_status" AS ENUM ('PENDING', 'PARTIAL', 'PAID');

-- CreateEnum
CREATE TYPE "building_utility_type" AS ENUM ('ELECTRICITY', 'GAS', 'CLEANING');

-- CreateEnum
CREATE TYPE "organization_status" AS ENUM ('ACTIVE', 'INACTIVE', 'PENDING', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "gst_invoice_type" AS ENUM ('B2B_SALE', 'B2C_SALE', 'PURCHASE');

-- CreateTable
CREATE TABLE "users" (
    "id" BIGSERIAL NOT NULL,
    "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
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
    "id" BIGSERIAL NOT NULL,
    "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resources" (
    "id" BIGSERIAL NOT NULL,
    "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "actions" (
    "id" BIGSERIAL NOT NULL,
    "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" BIGSERIAL NOT NULL,
    "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "resource_id" BIGINT NOT NULL,
    "action_id" BIGINT NOT NULL,
    "resource" VARCHAR(100) NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "role_id" BIGINT NOT NULL,
    "permission_id" BIGINT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" BIGSERIAL NOT NULL,
    "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" BIGINT NOT NULL,
    "role_id" BIGINT NOT NULL,
    "granted_by" BIGINT,
    "granted_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_role_scopes" (
    "id" BIGSERIAL NOT NULL,
    "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_role_id" BIGINT NOT NULL,
    "scope_type" VARCHAR(50) NOT NULL,
    "scope_value" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_role_scopes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policies" (
    "id" BIGSERIAL NOT NULL,
    "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "permission_id" BIGINT NOT NULL,
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
    "id" BIGSERIAL NOT NULL,
    "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" BIGINT,
    "email" VARCHAR(255),
    "ip_address" TEXT,
    "user_agent" TEXT,
    "attempt_type" "attempt_type" NOT NULL,
    "attempt_time" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "failure_reason" TEXT,

    CONSTRAINT "login_audit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "addresses" (
    "id" BIGSERIAL NOT NULL,
    "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "line1" VARCHAR(255) NOT NULL,
    "line2" VARCHAR(255),
    "city" VARCHAR(100) NOT NULL,
    "state" VARCHAR(100),
    "country" VARCHAR(100) NOT NULL,
    "zipcode" VARCHAR(20),
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "properties" (
    "id" BIGSERIAL NOT NULL,
    "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "property_type" "property_type" NOT NULL,
    "owner_id" BIGINT NOT NULL,
    "address_id" BIGINT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_images" (
    "id" BIGSERIAL NOT NULL,
    "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "property_id" BIGINT NOT NULL,
    "url" VARCHAR(500) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "property_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "amenities" (
    "id" BIGSERIAL NOT NULL,
    "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "category" "amenity_category" NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "amenities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_amenities" (
    "property_id" BIGINT NOT NULL,
    "amenity_id" BIGINT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "property_amenities_pkey" PRIMARY KEY ("property_id","amenity_id")
);

-- CreateTable
CREATE TABLE "buildings" (
    "id" BIGSERIAL NOT NULL,
    "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "property_id" BIGINT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "buildings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "building_utility_rates" (
    "id" BIGSERIAL NOT NULL,
    "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "building_id" BIGINT NOT NULL,
    "utility_type" "building_utility_type" NOT NULL,
    "unit_rate" DECIMAL(12,2) NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "building_utility_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "floors" (
    "id" BIGSERIAL NOT NULL,
    "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "building_id" BIGINT NOT NULL,
    "floor_number" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "floors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "units" (
    "id" BIGSERIAL NOT NULL,
    "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "floor_id" BIGINT NOT NULL,
    "unit_number" VARCHAR(50) NOT NULL,
    "unit_type" "unit_type" NOT NULL,
    "capacity" INTEGER,
    "area" DECIMAL(10,2),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rooms" (
    "id" BIGSERIAL NOT NULL,
    "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "unit_id" BIGINT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "room_type" "room_type" NOT NULL,
    "area" DECIMAL(10,2),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "beds" (
    "id" BIGSERIAL NOT NULL,
    "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "room_id" BIGINT NOT NULL,
    "bed_type" "bed_type" NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "beds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pricing" (
    "id" BIGSERIAL NOT NULL,
    "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "unit_id" BIGINT NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "base_price" DECIMAL(12,2) NOT NULL,
    "billing_cycle" "billing_cycle" NOT NULL,
    "security_deposit" DECIMAL(12,2),
    "effective_from" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "availability" (
    "id" BIGSERIAL NOT NULL,
    "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "unit_id" BIGINT NOT NULL,
    "available_from" TIMESTAMPTZ,
    "available_to" TIMESTAMPTZ,
    "status" "availability_status" NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenants" (
    "id" BIGSERIAL NOT NULL,
    "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "owner_id" BIGINT NOT NULL,
    "unit_id" BIGINT,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255),
    "phone" VARCHAR(30),
    "id_document" VARCHAR(100),
    "picture_url" VARCHAR(2048),
    "advance_balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_assignments" (
    "id" BIGSERIAL NOT NULL,
    "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" BIGINT NOT NULL,
    "unit_id" BIGINT NOT NULL,
    "monthly_rent" DECIMAL(12,2),
    "lease_from" DATE,
    "lease_to" DATE,
    "monthly_due_day" INTEGER,
    "initial_gas_units" DECIMAL(10,2),
    "initial_electricity_units" DECIMAL(10,2),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rents" (
    "id" BIGSERIAL NOT NULL,
    "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" BIGINT NOT NULL,
    "tenant_assignment_id" BIGINT NOT NULL,
    "unit_id" BIGINT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "rent" DECIMAL(12,2) NOT NULL,
    "total_rent" DECIMAL(12,2),
    "electricity_units" DECIMAL(10,2),
    "gas_units" DECIMAL(10,2),
    "maintenance" DECIMAL(12,2),
    "misc" DECIMAL(12,2),
    "due_date" DATE NOT NULL,
    "utility_baseline" JSONB,
    "utility_rate_snapshot" JSONB,
    "prior_balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "balance_carried_forward" BOOLEAN NOT NULL DEFAULT false,
    "payment_status" "payment_status" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" BIGSERIAL NOT NULL,
    "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "rent_id" BIGINT NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "mode" "payment_mode" NOT NULL,
    "applied_to_rent" DECIMAL(12,2) NOT NULL,
    "to_advance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "paid_at" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" BIGSERIAL NOT NULL,
    "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "owner_id" BIGINT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "address_id" BIGINT NOT NULL,
    "gst_number" VARCHAR(15) NOT NULL,
    "owner_name" VARCHAR(255) NOT NULL,
    "registration_date" DATE NOT NULL,
    "current_status" "organization_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gst_tax_configurations" (
    "id" BIGSERIAL NOT NULL,
    "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" BIGINT NOT NULL,
    "cgst_rate" DECIMAL(5,2) NOT NULL,
    "sgst_rate" DECIMAL(5,2) NOT NULL,
    "igst_rate" DECIMAL(5,2) NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gst_tax_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gst_invoices" (
    "id" BIGSERIAL NOT NULL,
    "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" BIGINT NOT NULL,
    "invoice_type" "gst_invoice_type" NOT NULL,
    "invoice_number" VARCHAR(100) NOT NULL,
    "invoice_date" DATE NOT NULL,
    "gst_number" VARCHAR(15),
    "trade_name" VARCHAR(255),
    "customer_name" VARCHAR(255),
    "customer_address" TEXT,
    "taxable_value" DECIMAL(12,2) NOT NULL,
    "cgst" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "sgst" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "igst" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "cess" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_tax_amount" DECIMAL(12,2) NOT NULL,
    "invoice_value" DECIMAL(12,2) NOT NULL,
    "description" TEXT,
    "payment_status" "payment_status" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gst_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gst_masters" (
    "id" BIGSERIAL NOT NULL,
    "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" BIGINT NOT NULL,
    "gst_number" VARCHAR(15) NOT NULL,
    "legal_name" VARCHAR(255) NOT NULL,
    "trade_name" VARCHAR(255) NOT NULL,
    "effective_registration_date" DATE NOT NULL,
    "constitution_of_business" VARCHAR(100) NOT NULL,
    "gstin_status" VARCHAR(50) NOT NULL,
    "taxpayer_type" VARCHAR(50) NOT NULL,
    "principal_place_of_business" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gst_masters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_uuid_key" ON "users"("uuid");

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
CREATE UNIQUE INDEX "roles_uuid_key" ON "roles"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "resources_uuid_key" ON "resources"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "resources_name_key" ON "resources"("name");

-- CreateIndex
CREATE INDEX "idx_resources_name" ON "resources"("name");

-- CreateIndex
CREATE INDEX "idx_resources_active" ON "resources"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "actions_uuid_key" ON "actions"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "actions_name_key" ON "actions"("name");

-- CreateIndex
CREATE INDEX "idx_actions_name" ON "actions"("name");

-- CreateIndex
CREATE INDEX "idx_actions_active" ON "actions"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_uuid_key" ON "permissions"("uuid");

-- CreateIndex
CREATE INDEX "idx_permissions_resource_id" ON "permissions"("resource_id");

-- CreateIndex
CREATE INDEX "idx_permissions_action_id" ON "permissions"("action_id");

-- CreateIndex
CREATE INDEX "idx_permissions_resource" ON "permissions"("resource");

-- CreateIndex
CREATE INDEX "idx_permissions_action" ON "permissions"("action");

-- CreateIndex
CREATE INDEX "idx_permissions_name" ON "permissions"("name");

-- CreateIndex
CREATE UNIQUE INDEX "unique_permission_resource_action" ON "permissions"("resource_id", "action_id");

-- CreateIndex
CREATE UNIQUE INDEX "unique_resource_action" ON "permissions"("resource", "action");

-- CreateIndex
CREATE INDEX "idx_role_permissions_role_id" ON "role_permissions"("role_id");

-- CreateIndex
CREATE INDEX "idx_role_permissions_permission_id" ON "role_permissions"("permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_uuid_key" ON "user_roles"("uuid");

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
CREATE UNIQUE INDEX "user_role_scopes_uuid_key" ON "user_role_scopes"("uuid");

-- CreateIndex
CREATE INDEX "idx_user_role_scopes_user_role_id" ON "user_role_scopes"("user_role_id");

-- CreateIndex
CREATE INDEX "idx_user_role_scopes_lookup" ON "user_role_scopes"("scope_type", "scope_value");

-- CreateIndex
CREATE UNIQUE INDEX "unique_user_role_scope" ON "user_role_scopes"("user_role_id", "scope_type", "scope_value");

-- CreateIndex
CREATE UNIQUE INDEX "policies_uuid_key" ON "policies"("uuid");

-- CreateIndex
CREATE INDEX "idx_policies_permission_id" ON "policies"("permission_id");

-- CreateIndex
CREATE INDEX "idx_policies_priority" ON "policies"("priority" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "login_audit_uuid_key" ON "login_audit"("uuid");

-- CreateIndex
CREATE INDEX "idx_login_audit_user_id" ON "login_audit"("user_id");

-- CreateIndex
CREATE INDEX "idx_login_audit_attempt_time" ON "login_audit"("attempt_time" DESC);

-- CreateIndex
CREATE INDEX "idx_login_audit_ip" ON "login_audit"("ip_address");

-- CreateIndex
CREATE UNIQUE INDEX "addresses_uuid_key" ON "addresses"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "properties_uuid_key" ON "properties"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "properties_address_id_key" ON "properties"("address_id");

-- CreateIndex
CREATE INDEX "idx_properties_owner_id" ON "properties"("owner_id");

-- CreateIndex
CREATE INDEX "idx_properties_type" ON "properties"("property_type");

-- CreateIndex
CREATE UNIQUE INDEX "property_images_uuid_key" ON "property_images"("uuid");

-- CreateIndex
CREATE INDEX "idx_property_images_property_id" ON "property_images"("property_id");

-- CreateIndex
CREATE UNIQUE INDEX "amenities_uuid_key" ON "amenities"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "amenities_name_key" ON "amenities"("name");

-- CreateIndex
CREATE INDEX "idx_amenities_category" ON "amenities"("category");

-- CreateIndex
CREATE UNIQUE INDEX "buildings_uuid_key" ON "buildings"("uuid");

-- CreateIndex
CREATE INDEX "idx_buildings_property_id" ON "buildings"("property_id");

-- CreateIndex
CREATE UNIQUE INDEX "building_utility_rates_uuid_key" ON "building_utility_rates"("uuid");

-- CreateIndex
CREATE INDEX "idx_building_utility_rates_lookup" ON "building_utility_rates"("building_id", "utility_type", "start_date", "end_date");

-- CreateIndex
CREATE UNIQUE INDEX "floors_uuid_key" ON "floors"("uuid");

-- CreateIndex
CREATE INDEX "idx_floors_building_id" ON "floors"("building_id");

-- CreateIndex
CREATE UNIQUE INDEX "unique_building_floor_number" ON "floors"("building_id", "floor_number");

-- CreateIndex
CREATE UNIQUE INDEX "units_uuid_key" ON "units"("uuid");

-- CreateIndex
CREATE INDEX "idx_units_floor_id" ON "units"("floor_id");

-- CreateIndex
CREATE UNIQUE INDEX "unique_floor_unit_number" ON "units"("floor_id", "unit_number");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_uuid_key" ON "rooms"("uuid");

-- CreateIndex
CREATE INDEX "idx_rooms_unit_id" ON "rooms"("unit_id");

-- CreateIndex
CREATE UNIQUE INDEX "beds_uuid_key" ON "beds"("uuid");

-- CreateIndex
CREATE INDEX "idx_beds_room_id" ON "beds"("room_id");

-- CreateIndex
CREATE UNIQUE INDEX "pricing_uuid_key" ON "pricing"("uuid");

-- CreateIndex
CREATE INDEX "idx_pricing_unit_id" ON "pricing"("unit_id");

-- CreateIndex
CREATE INDEX "idx_pricing_effective_from" ON "pricing"("effective_from" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "availability_uuid_key" ON "availability"("uuid");

-- CreateIndex
CREATE INDEX "idx_availability_unit_id" ON "availability"("unit_id");

-- CreateIndex
CREATE INDEX "idx_availability_status" ON "availability"("status");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_uuid_key" ON "tenants"("uuid");

-- CreateIndex
CREATE INDEX "idx_tenants_owner_id" ON "tenants"("owner_id");

-- CreateIndex
CREATE INDEX "idx_tenants_unit_id" ON "tenants"("unit_id");

-- CreateIndex
CREATE INDEX "idx_tenants_email" ON "tenants"("email");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_assignments_uuid_key" ON "tenant_assignments"("uuid");

-- CreateIndex
CREATE INDEX "idx_tenant_assignments_tenant_id" ON "tenant_assignments"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_tenant_assignments_unit_id" ON "tenant_assignments"("unit_id");

-- CreateIndex
CREATE INDEX "idx_tenant_assignments_is_active" ON "tenant_assignments"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "rents_uuid_key" ON "rents"("uuid");

-- CreateIndex
CREATE INDEX "idx_rents_tenant_id" ON "rents"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_rents_tenant_assignment_id" ON "rents"("tenant_assignment_id");

-- CreateIndex
CREATE INDEX "idx_rents_unit_id" ON "rents"("unit_id");

-- CreateIndex
CREATE INDEX "idx_rents_due_date" ON "rents"("due_date");

-- CreateIndex
CREATE INDEX "idx_rents_payment_status" ON "rents"("payment_status");

-- CreateIndex
CREATE UNIQUE INDEX "payments_uuid_key" ON "payments"("uuid");

-- CreateIndex
CREATE INDEX "idx_payments_rent_id" ON "payments"("rent_id");

-- CreateIndex
CREATE INDEX "idx_payments_tenant_id" ON "payments"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_payments_paid_at" ON "payments"("paid_at");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_uuid_key" ON "organizations"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_owner_id_key" ON "organizations"("owner_id");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_address_id_key" ON "organizations"("address_id");

-- CreateIndex
CREATE INDEX "idx_organizations_gst_number" ON "organizations"("gst_number");

-- CreateIndex
CREATE UNIQUE INDEX "gst_tax_configurations_uuid_key" ON "gst_tax_configurations"("uuid");

-- CreateIndex
CREATE INDEX "idx_gst_tax_config_org_dates" ON "gst_tax_configurations"("organization_id", "start_date", "end_date");

-- CreateIndex
CREATE UNIQUE INDEX "gst_invoices_uuid_key" ON "gst_invoices"("uuid");

-- CreateIndex
CREATE INDEX "idx_gst_invoices_org_type" ON "gst_invoices"("organization_id", "invoice_type");

-- CreateIndex
CREATE INDEX "idx_gst_invoices_date" ON "gst_invoices"("invoice_date");

-- CreateIndex
CREATE UNIQUE INDEX "unique_org_type_invoice_number" ON "gst_invoices"("organization_id", "invoice_type", "invoice_number");

-- CreateIndex
CREATE UNIQUE INDEX "gst_masters_uuid_key" ON "gst_masters"("uuid");

-- CreateIndex
CREATE INDEX "idx_gst_masters_org" ON "gst_masters"("organization_id");

-- CreateIndex
CREATE INDEX "idx_gst_masters_gst_number" ON "gst_masters"("gst_number");

-- CreateIndex
CREATE UNIQUE INDEX "unique_org_gst_master_number" ON "gst_masters"("organization_id", "gst_number");

-- AddForeignKey
ALTER TABLE "permissions" ADD CONSTRAINT "permissions_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permissions" ADD CONSTRAINT "permissions_action_id_fkey" FOREIGN KEY ("action_id") REFERENCES "actions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_address_id_fkey" FOREIGN KEY ("address_id") REFERENCES "addresses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_images" ADD CONSTRAINT "property_images_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_amenities" ADD CONSTRAINT "property_amenities_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_amenities" ADD CONSTRAINT "property_amenities_amenity_id_fkey" FOREIGN KEY ("amenity_id") REFERENCES "amenities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buildings" ADD CONSTRAINT "buildings_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "building_utility_rates" ADD CONSTRAINT "building_utility_rates_building_id_fkey" FOREIGN KEY ("building_id") REFERENCES "buildings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "floors" ADD CONSTRAINT "floors_building_id_fkey" FOREIGN KEY ("building_id") REFERENCES "buildings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "units" ADD CONSTRAINT "units_floor_id_fkey" FOREIGN KEY ("floor_id") REFERENCES "floors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beds" ADD CONSTRAINT "beds_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pricing" ADD CONSTRAINT "pricing_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availability" ADD CONSTRAINT "availability_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_assignments" ADD CONSTRAINT "tenant_assignments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_assignments" ADD CONSTRAINT "tenant_assignments_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rents" ADD CONSTRAINT "rents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rents" ADD CONSTRAINT "rents_tenant_assignment_id_fkey" FOREIGN KEY ("tenant_assignment_id") REFERENCES "tenant_assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rents" ADD CONSTRAINT "rents_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_rent_id_fkey" FOREIGN KEY ("rent_id") REFERENCES "rents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_address_id_fkey" FOREIGN KEY ("address_id") REFERENCES "addresses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gst_tax_configurations" ADD CONSTRAINT "gst_tax_configurations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gst_invoices" ADD CONSTRAINT "gst_invoices_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gst_masters" ADD CONSTRAINT "gst_masters_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- Database functions and triggers
CREATE OR REPLACE FUNCTION sync_permission_catalog_fields()
RETURNS TRIGGER AS $$
BEGIN
    SELECT name INTO NEW.resource FROM resources WHERE id = NEW.resource_id;
    SELECT name INTO NEW.action FROM actions WHERE id = NEW.action_id;
    NEW.name := NEW.resource || ':' || NEW.action;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER permissions_sync_catalog_fields
    BEFORE INSERT OR UPDATE OF resource_id, action_id ON "permissions"
    FOR EACH ROW EXECUTE FUNCTION sync_permission_catalog_fields();

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

-- Seed: actions
INSERT INTO "actions" ("name", "description") VALUES
    ('read', 'View records'),
    ('create', 'Create records'),
    ('update', 'Update records'),
    ('delete', 'Delete records'),
    ('approve', 'Approve records'),
    ('export', 'Export data'),
    ('generate', 'Generate reports')
ON CONFLICT ("name") DO NOTHING;

-- Seed: roles
INSERT INTO "roles" ("name", "description") VALUES
    ('super_admin', 'Full system access'),
    ('admin', 'Administrative access without system config'),
    ('manager', 'Manage department resources'),
    ('editor', 'Edit content but no user management'),
    ('viewer', 'Read-only access'),
    ('customer', 'Registered property customer'),
    ('gst', 'GST organization and invoice management')
ON CONFLICT ("name") DO NOTHING;

-- Seed: resources
INSERT INTO "resources" ("name", "description") VALUES
    ('user', 'User accounts'),
    ('invoice', 'Invoices'),
    ('report', 'Reports'),
    ('role', 'Roles'),
    ('permission', 'Permissions'),
    ('resource', 'Permission resource catalog'),
    ('action', 'Permission action catalog'),
    ('login_audit', 'Login audit trail'),
    ('property', 'Property listings'),
    ('building', 'Buildings within properties'),
    ('floor', 'Floors within buildings'),
    ('unit', 'Units within floors'),
    ('room', 'Rooms within units'),
    ('bed', 'Beds within rooms'),
    ('amenity', 'Amenity catalog'),
    ('tenant', 'Tenant records'),
    ('rent', 'Tenant unit rent assignments'),
    ('payment', 'Rent payment records'),
    ('gst_organization', 'GST registered organization'),
    ('gst_b2b_sale', 'GST B2B sales invoices'),
    ('gst_b2c_sale', 'GST B2C sales invoices'),
    ('gst_purchase', 'GST purchase invoices'),
    ('gst_tax_configuration', 'GST tax rate configuration'),
    ('gst_report', 'GST sales and purchase reports'),
    ('gst_master', 'GST master records for parties and businesses')
ON CONFLICT ("name") DO NOTHING;

-- Seed: permissions (CRUD for most resources)
INSERT INTO "permissions" ("resource_id", "action_id", "resource", "action", "name", "description")
SELECT r.id, a.id, r.name, a.name, r.name || ':' || a.name,
    CASE a.name
        WHEN 'read' THEN 'View ' || r.name || ' records'
        WHEN 'create' THEN 'Create ' || r.name || ' records'
        WHEN 'update' THEN 'Update ' || r.name || ' records'
        WHEN 'delete' THEN 'Delete ' || r.name || ' records'
        WHEN 'approve' THEN 'Approve ' || r.name || ' records'
        WHEN 'export' THEN 'Export ' || r.name || ' data'
        WHEN 'generate' THEN 'Generate ' || r.name || ' reports'
    END
FROM "resources" r
CROSS JOIN "actions" a
WHERE (
    (r.name IN ('user', 'invoice', 'report', 'role', 'permission', 'resource', 'action',
                'property', 'building', 'floor', 'unit', 'room', 'bed', 'amenity',
                'tenant', 'rent', 'payment',
                'gst_organization', 'gst_b2b_sale', 'gst_b2c_sale', 'gst_purchase',
                'gst_tax_configuration', 'gst_report', 'gst_master')
     AND a.name IN ('read', 'create', 'update', 'delete'))
    OR (r.name = 'invoice' AND a.name = 'approve')
    OR (r.name = 'report' AND a.name IN ('generate', 'export'))
    OR (r.name = 'login_audit' AND a.name = 'read')
)
ON CONFLICT (resource, action) DO NOTHING;

-- super_admin: all permissions
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT ro.id, p.id
FROM "roles" ro
CROSS JOIN "permissions" p
WHERE ro.name = 'super_admin'
ON CONFLICT DO NOTHING;

-- admin: user, invoice, report + property domain + tenant/rent + payment + gst
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT ro.id, p.id
FROM "roles" ro
CROSS JOIN "permissions" p
WHERE ro.name = 'admin'
  AND p.resource IN (
    'user', 'invoice', 'report',
    'property', 'building', 'floor', 'unit', 'room', 'bed', 'amenity',
    'tenant', 'rent', 'payment',
    'gst_organization', 'gst_b2b_sale', 'gst_b2c_sale', 'gst_purchase',
    'gst_tax_configuration', 'gst_report', 'gst_master'
  )
ON CONFLICT DO NOTHING;

-- manager: invoice, report
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT ro.id, p.id
FROM "roles" ro
CROSS JOIN "permissions" p
WHERE ro.name = 'manager'
  AND p.resource IN ('invoice', 'report')
ON CONFLICT DO NOTHING;

-- editor: invoice create/read/update
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT ro.id, p.id
FROM "roles" ro
CROSS JOIN "permissions" p
WHERE ro.name = 'editor'
  AND p.resource = 'invoice'
  AND p.action IN ('create', 'read', 'update')
ON CONFLICT DO NOTHING;

-- viewer: read-only
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT ro.id, p.id
FROM "roles" ro
CROSS JOIN "permissions" p
WHERE ro.name = 'viewer'
  AND p.action = 'read'
ON CONFLICT DO NOTHING;

-- customer: property hierarchy + tenant/rent + payment
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT ro.id, p.id
FROM "roles" ro
CROSS JOIN "permissions" p
WHERE ro.name = 'customer'
  AND (
    (p.resource IN ('property', 'building', 'floor', 'unit', 'room', 'bed')
     AND p.action IN ('read', 'create', 'update', 'delete'))
    OR (p.resource = 'amenity' AND p.action = 'read')
    OR (p.resource IN ('tenant', 'rent', 'payment')
        AND p.action IN ('read', 'create', 'update', 'delete'))
  )
ON CONFLICT DO NOTHING;

-- gst role: GST resources
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT ro.id, p.id
FROM "roles" ro
CROSS JOIN "permissions" p
WHERE ro.name = 'gst'
  AND (
    (p.resource IN ('gst_organization', 'gst_b2b_sale', 'gst_b2c_sale', 'gst_purchase', 'gst_tax_configuration', 'gst_master')
     AND p.action IN ('read', 'create', 'update', 'delete'))
    OR (p.resource = 'gst_report' AND p.action = 'read')
  )
ON CONFLICT DO NOTHING;

-- Sample amenities
INSERT INTO "amenities" ("name", "category") VALUES
    ('WiFi', 'INTERNET'),
    ('Parking', 'PARKING'),
    ('24/7 Security', 'SECURITY')
ON CONFLICT ("name") DO NOTHING;

-- Default utility rates for buildings (no-op when no buildings exist yet)
INSERT INTO "building_utility_rates" ("building_id", "utility_type", "unit_rate", "start_date", "end_date")
SELECT b."id", 'ELECTRICITY', 10, '2020-01-01', '2099-12-31'
FROM "buildings" b
WHERE NOT EXISTS (
  SELECT 1 FROM "building_utility_rates" bur
  WHERE bur."building_id" = b."id" AND bur."utility_type" = 'ELECTRICITY'
);

INSERT INTO "building_utility_rates" ("building_id", "utility_type", "unit_rate", "start_date", "end_date")
SELECT b."id", 'GAS', 50, '2020-01-01', '2099-12-31'
FROM "buildings" b
WHERE NOT EXISTS (
  SELECT 1 FROM "building_utility_rates" bur
  WHERE bur."building_id" = b."id" AND bur."utility_type" = 'GAS'
);

INSERT INTO "building_utility_rates" ("building_id", "utility_type", "unit_rate", "start_date", "end_date")
SELECT b."id", 'CLEANING', 0, '2020-01-01', '2099-12-31'
FROM "buildings" b
WHERE NOT EXISTS (
  SELECT 1 FROM "building_utility_rates" bur
  WHERE bur."building_id" = b."id" AND bur."utility_type" = 'CLEANING'
);
