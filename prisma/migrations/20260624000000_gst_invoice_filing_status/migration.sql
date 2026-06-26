CREATE TYPE "gst_filing_status" AS ENUM ('PENDING', 'FILED');

ALTER TABLE "gst_invoices"
  ADD COLUMN "filing_status" "gst_filing_status" NOT NULL DEFAULT 'PENDING';
