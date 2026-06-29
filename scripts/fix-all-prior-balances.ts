/**
 * Reset carry-forward prior balances and backfill monthly CASH payments
 * for every tenant that had prior_balance > 0 or balance_carried_forward.
 *
 * Run: npx tsx scripts/fix-all-prior-balances.ts
 */
import "dotenv/config";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { rentBillAmount, toMoney } from "@/lib/properties/payment-calculations";

async function fixTenant(tenantId: bigint, tenantName: string) {
  const rents = await prisma.rent.findMany({
    where: { tenantId },
    orderBy: { startDate: "asc" },
    select: {
      id: true,
      startDate: true,
      dueDate: true,
      rent: true,
      totalRent: true,
      priorBalance: true,
      balanceCarriedForward: true,
    },
  });

  if (rents.length === 0) return { tenantName, rentsFixed: 0, paymentsCreated: 0 };

  let paymentsCreated = 0;

  await prisma.$transaction(async (tx) => {
    const deleted = await tx.payment.deleteMany({ where: { tenantId } });

    for (const rent of rents) {
      const billAmount = rentBillAmount(rent);

      await tx.rent.update({
        where: { id: rent.id },
        data: {
          priorBalance: new Prisma.Decimal(0),
          balanceCarriedForward: false,
          paymentStatus: "PAID",
        },
      });

      await tx.payment.create({
        data: {
          rentId: rent.id,
          tenantId,
          amount: new Prisma.Decimal(billAmount),
          mode: "CASH",
          accountName: "NONE",
          appliedToRent: new Prisma.Decimal(billAmount),
          toAdvance: new Prisma.Decimal(0),
          paidAt: rent.dueDate,
          notes: "Backfilled: monthly cash payment (prior balance reset)",
        },
      });
      paymentsCreated += 1;
    }

    await tx.tenant.update({
      where: { id: tenantId },
      data: { advanceBalance: new Prisma.Decimal(0) },
    });

    console.log(
      `  ${tenantName}: deleted ${deleted.count} payment(s), fixed ${rents.length} rent(s)`,
    );
  });

  return { tenantName, rentsFixed: rents.length, paymentsCreated };
}

async function main() {
  const affectedTenants = await prisma.tenant.findMany({
    where: {
      rents: {
        some: {
          OR: [{ priorBalance: { gt: 0 } }, { balanceCarriedForward: true }],
        },
      },
    },
    select: { id: true, firstName: true, lastName: true },
    orderBy: { id: "asc" },
  });

  if (affectedTenants.length === 0) {
    console.log("No tenants with prior balance or carry-forward flags found.");
    return;
  }

  console.log(`Fixing ${affectedTenants.length} tenant(s)...\n`);

  let totalRents = 0;
  let totalPayments = 0;

  for (const tenant of affectedTenants) {
    const name = `${tenant.firstName} ${tenant.lastName}`;
    const result = await fixTenant(tenant.id, name);
    totalRents += result.rentsFixed;
    totalPayments += result.paymentsCreated;
  }

  // Safety pass: zero any stray prior balances system-wide
  const stray = await prisma.rent.updateMany({
    where: {
      OR: [{ priorBalance: { gt: 0 } }, { balanceCarriedForward: true }],
    },
    data: {
      priorBalance: new Prisma.Decimal(0),
      balanceCarriedForward: false,
    },
  });

  const priorSum = await prisma.rent.aggregate({
    _sum: { priorBalance: true },
  });

  console.log(`\nDone.`);
  console.log(`  Tenants fixed: ${affectedTenants.length}`);
  console.log(`  Rents updated: ${totalRents}`);
  console.log(`  CASH payments created: ${totalPayments}`);
  console.log(`  Stray rows cleared: ${stray.count}`);
  console.log(`  Total prior balance remaining: ₹${toMoney(priorSum._sum.priorBalance).toFixed(2)}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
