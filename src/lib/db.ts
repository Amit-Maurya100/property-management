import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { Prisma, PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

function getPrismaSchemaFingerprint() {
  const models = [
    Prisma.TenantScalarFieldEnum,
    Prisma.TenantAssignmentScalarFieldEnum,
    Prisma.RentScalarFieldEnum,
    Prisma.PaymentScalarFieldEnum,
    Prisma.OrganizationScalarFieldEnum,
    Prisma.GstInvoiceScalarFieldEnum,
    Prisma.GstPaymentScalarFieldEnum,
    Prisma.GstTaxConfigurationScalarFieldEnum,
    Prisma.GstMasterScalarFieldEnum,
    Prisma.GstMasterBankAccountScalarFieldEnum,
    Prisma.RentPaymentAccountScalarFieldEnum,
    Prisma.TenantRentPaymentAccountScalarFieldEnum,
    Prisma.NotificationSettingsScalarFieldEnum,
    Prisma.BuildingUtilityRateScalarFieldEnum,
  ] as const;

  return models
    .map((model) => Object.values(model).sort().join("|"))
    .join("::");
}

const PRISMA_SCHEMA_FINGERPRINT = getPrismaSchemaFingerprint();

type TaggedPrismaClient = PrismaClient & { __schemaFingerprint?: string };

function createPool() {
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
  });
}

function createPrismaClient(pool: Pool) {
  const adapter = new PrismaPg(pool);
  const client = new PrismaClient({ adapter }) as TaggedPrismaClient;
  client.__schemaFingerprint = PRISMA_SCHEMA_FINGERPRINT;
  return client;
}

function isPrismaClientStale(client: PrismaClient) {
  const tagged = client as TaggedPrismaClient;
  return (
    tagged.__schemaFingerprint !== PRISMA_SCHEMA_FINGERPRINT ||
    !("resource" in client) ||
    !("action" in client) ||
    !("loginAudit" in client) ||
    !("property" in client) ||
    !("amenity" in client) ||
    !("tenant" in client) ||
    !("tenantAssignment" in client) ||
    !("rent" in client) ||
    !("payment" in client) ||
    !("organization" in client) ||
    !("gstInvoice" in client) ||
    !("gstPayment" in client) ||
    !("gstTaxConfiguration" in client) ||
    !("gstMaster" in client) ||
    !("gstMasterBankAccount" in client) ||
    !("buildingUtilityRate" in client) ||
    !("notificationSettings" in client)
  );
}

function getPrismaClient() {
  if (!globalForPrisma.pool) {
    globalForPrisma.pool = createPool();
  }

  const existing = globalForPrisma.prisma;
  if (existing && !isPrismaClientStale(existing)) {
    return existing;
  }

  const client = createPrismaClient(globalForPrisma.pool);
  globalForPrisma.prisma = client;
  return client;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrismaClient();
    const value = client[prop as keyof PrismaClient];
    if (typeof value === "function") {
      return (value as (...args: unknown[]) => unknown).bind(client);
    }
    return value;
  },
});
