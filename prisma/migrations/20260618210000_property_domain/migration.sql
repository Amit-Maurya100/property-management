-- Property domain enums
CREATE TYPE "property_type" AS ENUM ('APARTMENT', 'HOTEL', 'HOSTEL', 'OFFICE');
CREATE TYPE "unit_type" AS ENUM ('APARTMENT', 'ROOM', 'OFFICE', 'SHOP', 'HALL');
CREATE TYPE "room_type" AS ENUM ('BEDROOM', 'KITCHEN', 'BATHROOM', 'OFFICE_ROOM');
CREATE TYPE "bed_type" AS ENUM ('SINGLE', 'DOUBLE', 'BUNK');
CREATE TYPE "amenity_category" AS ENUM ('INTERNET', 'PARKING', 'SECURITY');
CREATE TYPE "billing_cycle" AS ENUM ('HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY');
CREATE TYPE "availability_status" AS ENUM ('AVAILABLE', 'RESERVED', 'OCCUPIED');

CREATE TABLE "addresses" (
    "id" BIGINT NOT NULL,
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
CREATE UNIQUE INDEX "addresses_uuid_key" ON "addresses"("uuid");
CREATE SEQUENCE "addresses_id_seq";
ALTER TABLE "addresses" ALTER COLUMN "id" SET DEFAULT nextval('addresses_id_seq');
ALTER SEQUENCE "addresses_id_seq" OWNED BY "addresses"."id";

CREATE TABLE "properties" (
    "id" BIGINT NOT NULL,
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
CREATE UNIQUE INDEX "properties_uuid_key" ON "properties"("uuid");
CREATE UNIQUE INDEX "properties_address_id_key" ON "properties"("address_id");
CREATE INDEX "idx_properties_owner_id" ON "properties"("owner_id");
CREATE INDEX "idx_properties_type" ON "properties"("property_type");
CREATE SEQUENCE "properties_id_seq";
ALTER TABLE "properties" ALTER COLUMN "id" SET DEFAULT nextval('properties_id_seq');
ALTER SEQUENCE "properties_id_seq" OWNED BY "properties"."id";

CREATE TABLE "property_images" (
    "id" BIGINT NOT NULL,
    "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "property_id" BIGINT NOT NULL,
    "url" VARCHAR(500) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "property_images_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "property_images_uuid_key" ON "property_images"("uuid");
CREATE INDEX "idx_property_images_property_id" ON "property_images"("property_id");
CREATE SEQUENCE "property_images_id_seq";
ALTER TABLE "property_images" ALTER COLUMN "id" SET DEFAULT nextval('property_images_id_seq');
ALTER SEQUENCE "property_images_id_seq" OWNED BY "property_images"."id";

CREATE TABLE "amenities" (
    "id" BIGINT NOT NULL,
    "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "category" "amenity_category" NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "amenities_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "amenities_uuid_key" ON "amenities"("uuid");
CREATE UNIQUE INDEX "amenities_name_key" ON "amenities"("name");
CREATE INDEX "idx_amenities_category" ON "amenities"("category");
CREATE SEQUENCE "amenities_id_seq";
ALTER TABLE "amenities" ALTER COLUMN "id" SET DEFAULT nextval('amenities_id_seq');
ALTER SEQUENCE "amenities_id_seq" OWNED BY "amenities"."id";

CREATE TABLE "property_amenities" (
    "property_id" BIGINT NOT NULL,
    "amenity_id" BIGINT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "property_amenities_pkey" PRIMARY KEY ("property_id","amenity_id")
);

CREATE TABLE "buildings" (
    "id" BIGINT NOT NULL,
    "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "property_id" BIGINT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "buildings_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "buildings_uuid_key" ON "buildings"("uuid");
CREATE INDEX "idx_buildings_property_id" ON "buildings"("property_id");
CREATE SEQUENCE "buildings_id_seq";
ALTER TABLE "buildings" ALTER COLUMN "id" SET DEFAULT nextval('buildings_id_seq');
ALTER SEQUENCE "buildings_id_seq" OWNED BY "buildings"."id";

CREATE TABLE "floors" (
    "id" BIGINT NOT NULL,
    "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "building_id" BIGINT NOT NULL,
    "floor_number" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "floors_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "floors_uuid_key" ON "floors"("uuid");
CREATE UNIQUE INDEX "unique_building_floor_number" ON "floors"("building_id", "floor_number");
CREATE INDEX "idx_floors_building_id" ON "floors"("building_id");
CREATE SEQUENCE "floors_id_seq";
ALTER TABLE "floors" ALTER COLUMN "id" SET DEFAULT nextval('floors_id_seq');
ALTER SEQUENCE "floors_id_seq" OWNED BY "floors"."id";

CREATE TABLE "units" (
    "id" BIGINT NOT NULL,
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
CREATE UNIQUE INDEX "units_uuid_key" ON "units"("uuid");
CREATE UNIQUE INDEX "unique_floor_unit_number" ON "units"("floor_id", "unit_number");
CREATE INDEX "idx_units_floor_id" ON "units"("floor_id");
CREATE SEQUENCE "units_id_seq";
ALTER TABLE "units" ALTER COLUMN "id" SET DEFAULT nextval('units_id_seq');
ALTER SEQUENCE "units_id_seq" OWNED BY "units"."id";

CREATE TABLE "rooms" (
    "id" BIGINT NOT NULL,
    "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "unit_id" BIGINT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "room_type" "room_type" NOT NULL,
    "area" DECIMAL(10,2),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "rooms_uuid_key" ON "rooms"("uuid");
CREATE INDEX "idx_rooms_unit_id" ON "rooms"("unit_id");
CREATE SEQUENCE "rooms_id_seq";
ALTER TABLE "rooms" ALTER COLUMN "id" SET DEFAULT nextval('rooms_id_seq');
ALTER SEQUENCE "rooms_id_seq" OWNED BY "rooms"."id";

CREATE TABLE "beds" (
    "id" BIGINT NOT NULL,
    "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "room_id" BIGINT NOT NULL,
    "bed_type" "bed_type" NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "beds_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "beds_uuid_key" ON "beds"("uuid");
CREATE INDEX "idx_beds_room_id" ON "beds"("room_id");
CREATE SEQUENCE "beds_id_seq";
ALTER TABLE "beds" ALTER COLUMN "id" SET DEFAULT nextval('beds_id_seq');
ALTER SEQUENCE "beds_id_seq" OWNED BY "beds"."id";

CREATE TABLE "pricing" (
    "id" BIGINT NOT NULL,
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
CREATE UNIQUE INDEX "pricing_uuid_key" ON "pricing"("uuid");
CREATE INDEX "idx_pricing_unit_id" ON "pricing"("unit_id");
CREATE INDEX "idx_pricing_effective_from" ON "pricing"("effective_from" DESC);
CREATE SEQUENCE "pricing_id_seq";
ALTER TABLE "pricing" ALTER COLUMN "id" SET DEFAULT nextval('pricing_id_seq');
ALTER SEQUENCE "pricing_id_seq" OWNED BY "pricing"."id";

CREATE TABLE "availability" (
    "id" BIGINT NOT NULL,
    "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "unit_id" BIGINT NOT NULL,
    "available_from" TIMESTAMPTZ,
    "available_to" TIMESTAMPTZ,
    "status" "availability_status" NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "availability_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "availability_uuid_key" ON "availability"("uuid");
CREATE INDEX "idx_availability_unit_id" ON "availability"("unit_id");
CREATE INDEX "idx_availability_status" ON "availability"("status");
CREATE SEQUENCE "availability_id_seq";
ALTER TABLE "availability" ALTER COLUMN "id" SET DEFAULT nextval('availability_id_seq');
ALTER SEQUENCE "availability_id_seq" OWNED BY "availability"."id";

ALTER TABLE "properties" ADD CONSTRAINT "properties_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "properties" ADD CONSTRAINT "properties_address_id_fkey" FOREIGN KEY ("address_id") REFERENCES "addresses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "property_images" ADD CONSTRAINT "property_images_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "property_amenities" ADD CONSTRAINT "property_amenities_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "property_amenities" ADD CONSTRAINT "property_amenities_amenity_id_fkey" FOREIGN KEY ("amenity_id") REFERENCES "amenities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "buildings" ADD CONSTRAINT "buildings_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "floors" ADD CONSTRAINT "floors_building_id_fkey" FOREIGN KEY ("building_id") REFERENCES "buildings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "units" ADD CONSTRAINT "units_floor_id_fkey" FOREIGN KEY ("floor_id") REFERENCES "floors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "beds" ADD CONSTRAINT "beds_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pricing" ADD CONSTRAINT "pricing_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "availability" ADD CONSTRAINT "availability_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
