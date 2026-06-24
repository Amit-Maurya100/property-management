CREATE TYPE "payment_account_name" AS ENUM ('AMIT', 'SARITA', 'PYARI', 'DN', 'NONE');

ALTER TABLE "payments"
  ADD COLUMN "account_name" "payment_account_name" NOT NULL DEFAULT 'NONE';
