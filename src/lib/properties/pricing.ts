import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { parseId, type IdInput } from "@/lib/ids";
import type { PropertyAccessContext } from "@/lib/properties/ownership";
import { assertUserOwnsUnit } from "@/lib/properties/ownership";

const pricingSelect = {
  id: true,
  unitId: true,
  currency: true,
  basePrice: true,
  billingCycle: true,
  securityDeposit: true,
  effectiveFrom: true,
  createdAt: true,
} as const;

export async function listPricing(ctx: PropertyAccessContext, unitId: IdInput) {
  await assertUserOwnsUnit(ctx, unitId);
  return prisma.pricing.findMany({
    where: { unitId: parseId(unitId) },
    select: pricingSelect,
    orderBy: { effectiveFrom: "desc" },
  });
}

export async function createPricing(
  ctx: PropertyAccessContext,
  unitId: IdInput,
  data: {
    currency: string;
    basePrice: number;
    billingCycle: "HOURLY" | "DAILY" | "WEEKLY" | "MONTHLY";
    securityDeposit?: number;
    effectiveFrom?: Date;
  },
) {
  const id = parseId(unitId);
  await assertUserOwnsUnit(ctx, id);
  return prisma.pricing.create({
    data: {
      unitId: id,
      currency: data.currency,
      basePrice: new Prisma.Decimal(data.basePrice),
      billingCycle: data.billingCycle,
      securityDeposit:
        data.securityDeposit != null ? new Prisma.Decimal(data.securityDeposit) : null,
      effectiveFrom: data.effectiveFrom,
    },
    select: pricingSelect,
  });
}

export async function deletePricing(ctx: PropertyAccessContext, pricingId: IdInput) {
  const id = parseId(pricingId);
  const pricing = await prisma.pricing.findUnique({
    where: { id },
    select: { unitId: true },
  });
  if (!pricing) throw new Error("NOT_FOUND");
  await assertUserOwnsUnit(ctx, pricing.unitId);
  await prisma.pricing.delete({ where: { id } });
}
