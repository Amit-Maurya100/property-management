-- CreateEnum
CREATE TYPE "building_utility_type" AS ENUM ('ELECTRICITY', 'GAS', 'CLEANING');

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

-- CreateIndex
CREATE UNIQUE INDEX "building_utility_rates_uuid_key" ON "building_utility_rates"("uuid");

-- CreateIndex
CREATE INDEX "idx_building_utility_rates_lookup" ON "building_utility_rates"("building_id", "utility_type", "start_date", "end_date");

-- AddForeignKey
ALTER TABLE "building_utility_rates" ADD CONSTRAINT "building_utility_rates_building_id_fkey" FOREIGN KEY ("building_id") REFERENCES "buildings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "rents" ADD COLUMN "utility_rate_snapshot" JSONB;
