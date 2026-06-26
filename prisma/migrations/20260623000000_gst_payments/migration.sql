-- CreateTable
CREATE TABLE "gst_payments" (
    "id" BIGSERIAL NOT NULL,
    "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "gst_invoice_id" BIGINT NOT NULL,
    "organization_id" BIGINT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "mode" "payment_mode" NOT NULL,
    "account_name" "payment_account_name" NOT NULL DEFAULT 'NONE',
    "applied_to_invoice" DECIMAL(12,2) NOT NULL,
    "paid_at" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gst_payments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "gst_payments_uuid_key" ON "gst_payments"("uuid");
CREATE INDEX "idx_gst_payments_invoice_id" ON "gst_payments"("gst_invoice_id");
CREATE INDEX "idx_gst_payments_org_id" ON "gst_payments"("organization_id");
CREATE INDEX "idx_gst_payments_paid_at" ON "gst_payments"("paid_at");

ALTER TABLE "gst_payments" ADD CONSTRAINT "gst_payments_gst_invoice_id_fkey" FOREIGN KEY ("gst_invoice_id") REFERENCES "gst_invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "gst_payments" ADD CONSTRAINT "gst_payments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed gst_payment resource and permissions
INSERT INTO "resources" ("name", "description") VALUES
    ('gst_payment', 'GST invoice payments for sales and purchase')
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "permissions" ("resource_id", "action_id", "resource", "action", "name", "description")
SELECT r.id, a.id, r.name, a.name, r.name || ':' || a.name,
    CASE a.name
        WHEN 'read' THEN 'View ' || r.name || ' records'
        WHEN 'create' THEN 'Create ' || r.name || ' records'
        WHEN 'update' THEN 'Update ' || r.name || ' records'
        WHEN 'delete' THEN 'Delete ' || r.name || ' records'
    END
FROM "resources" r
CROSS JOIN "actions" a
WHERE r.name = 'gst_payment'
  AND a.name IN ('read', 'create', 'update', 'delete')
ON CONFLICT (resource, action) DO NOTHING;

INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT ro.id, p.id
FROM "roles" ro
CROSS JOIN "permissions" p
WHERE ro.name IN ('super_admin', 'admin', 'gst')
  AND p.resource = 'gst_payment'
ON CONFLICT DO NOTHING;
