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
    Prisma.RentScalarFieldEnum,
  ] as const;

  return models
    .map((model) => Object.values(model).sort().join("|"))
    .join("::");
}

const PRISMA_SCHEMA_FINGERPRINT = getPrismaSchemaFingerprint();

type TaggedPrismaClient = PrismaClient & { __schemaFingerprint?: string };

function createPrismaClient() {
  const pool =
    globalForPrisma.pool ??
    new Pool({
      connectionString: process.env.DATABASE_URL,
    });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.pool = pool;
  }

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
    !("rent" in client)
  );
}

function getPrismaClient() {
  const existing = globalForPrisma.prisma;
  if (existing && !isPrismaClientStale(existing)) {
    return existing;
  }

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = undefined;
  }

  const client = createPrismaClient();
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
  }
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
