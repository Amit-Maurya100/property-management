-- Seed default utility rates for buildings that have none yet.
-- Uses the legacy hardcoded values: electricity ₹10/unit, gas ₹50/unit, cleaning ₹0.
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
