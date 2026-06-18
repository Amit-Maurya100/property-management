-- Backfill utility_baseline for monthly bills missing a saved snapshot.
-- First bill per tenant uses tenant initial units; later bills use prior bill readings.
UPDATE "rents" AS current_rent
SET "utility_baseline" = backfill.baseline
FROM (
  SELECT
    r.id,
    CASE
      WHEN prior.id IS NOT NULL THEN jsonb_build_object(
        'electricityUnits', COALESCE(prior.electricity_units, 0),
        'gasUnits', COALESCE(prior.gas_units, 0)
      )
      ELSE jsonb_build_object(
        'electricityUnits', COALESCE(t.initial_electricity_units, 0),
        'gasUnits', COALESCE(t.initial_gas_units, 0)
      )
    END AS baseline
  FROM "rents" r
  INNER JOIN "tenants" t ON t.id = r.tenant_id
  LEFT JOIN LATERAL (
    SELECT prev.id, prev.electricity_units, prev.gas_units
    FROM "rents" prev
    WHERE prev.tenant_id = r.tenant_id
      AND prev.is_active = false
      AND prev.start_date < r.start_date
    ORDER BY prev.start_date DESC
    LIMIT 1
  ) prior ON true
  WHERE r.is_active = false
    AND r.utility_baseline IS NULL
) AS backfill
WHERE current_rent.id = backfill.id;
