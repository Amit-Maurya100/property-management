/**
 * One-time fix: Sonu Singh — monthly cash payments, no carried prior balance.
 * Run: npx tsx scripts/fix-sonu-singh-payments.ts
 */
import "dotenv/config";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { rentBillAmount } from "@/lib/properties/payment-calculations";

async function main() {
  const tenant = await prisma.tenant.findFirst({
    where: { firstName: "Sonu", lastName: "Singh" },
    select: { id: true, firstName: true, lastName: true },
  });

  if (!tenant) {
    throw new Error("Sonu Singh not found");
  }

  const rents = await prisma.rent.findMany({
    where: { tenantId: tenant.id },
    orderBy: { startDate: "asc" },
    select: {
      id: true,
      startDate: true,
      dueDate: true,
      rent: true,
      totalRent: true,
      priorBalance: true,
    },
  });

  if (rents.length === 0) {
    console.log("No rent bills found.");
    return;
  }

  await prisma.$transaction(async (tx) => {
    const deleted = await tx.payment.deleteMany({ where: { tenantId: tenant.id } });
    console.log(`Deleted ${deleted.count} existing payment(s).`);

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
          tenantId: tenant.id,
          amount: new Prisma.Decimal(billAmount),
          mode: "CASH",
          accountName: "NONE",
          appliedToRent: new Prisma.Decimal(billAmount),
          toAdvance: new Prisma.Decimal(0),
          paidAt: rent.dueDate,
          notes: "Backfilled: monthly cash payment",
        },
      });

      console.log(
        `Rent #${rent.id} (${rent.startDate.toISOString().slice(0, 10)}): prior → 0, CASH ₹${billAmount.toFixed(2)}`,
      );
    }

    await tx.tenant.update({
      where: { id: tenant.id },
      data: { advanceBalance: new Prisma.Decimal(0) },
    });
  });

  console.log("\nDone. Sonu Singh now has one CASH payment per rent bill, no prior balance.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
