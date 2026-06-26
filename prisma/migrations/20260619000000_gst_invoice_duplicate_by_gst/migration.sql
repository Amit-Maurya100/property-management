-- Allow the same invoice number for different parties (GST numbers).
-- Uniqueness is enforced in application code when invoice number and GST number both match.

DROP INDEX IF EXISTS "unique_org_type_invoice_number";

CREATE INDEX IF NOT EXISTS "idx_gst_invoices_org_type_number_gst"
  ON "gst_invoices"("organization_id", "invoice_type", "invoice_number", "gst_number");
