import { prisma } from "@/lib/db";
import {
  balanceDue,
  paidTowardRent,
  rentAmountDue,
  rentBillAmount,
  toMoney,
} from "@/lib/properties/payment-calculations";
import {
  breakdownFromRentRow,
  formatIsoDate,
} from "@/lib/properties/rent-calculations";

const rentPortalSelect = {
  id: true,
  startDate: true,
  endDate: true,
  isExitRent: true,
  rent: true,
  totalRent: true,
  electricityUnits: true,
  gasUnits: true,
  maintenance: true,
  misc: true,
  dueDate: true,
  priorBalance: true,
  balanceCarriedForward: true,
  paymentStatus: true,
  utilityBaseline: true,
  utilityRateSnapshot: true,
  unit: {
    select: {
      unitNumber: true,
      floor: {
        select: {
          building: {
            select: {
              name: true,
              property: { select: { name: true } },
            },
          },
        },
      },
    },
  },
  tenantAssignment: {
    select: {
      initialElectricityUnits: true,
      initialGasUnits: true,
    },
  },
  payments: {
    select: { appliedToRent: true },
    orderBy: { paidAt: "desc" as const },
  },
} as const;

export async function listTenantPortalRents(tenantId: bigint) {
  const rents = await prisma.rent.findMany({
    where: { tenantId },
    select: rentPortalSelect,
    orderBy: [{ startDate: "desc" }, { id: "desc" }],
  });

  const tenantBills = await prisma.rent.findMany({
    where: { tenantId },
    select: {
      id: true,
      startDate: true,
      electricityUnits: true,
      gasUnits: true,
      utilityBaseline: true,
    },
    orderBy: [{ startDate: "desc" }, { id: "desc" }],
  });

  const monthlyBills = tenantBills.map((bill) => ({
    id: String(bill.id),
    startDate: formatIsoDate(bill.startDate),
    electricityUnits: toMoney(bill.electricityUnits),
    gasUnits: toMoney(bill.gasUnits),
    utilityBaseline: bill.utilityBaseline,
  }));

  return rents.map((row) => {
    const rentBreakdown = breakdownFromRentRow(
      {
        id: String(row.id),
        startDate: formatIsoDate(row.startDate),
        endDate: row.endDate ? formatIsoDate(row.endDate) : null,
        isExitRent: row.isExitRent,
        rent: toMoney(row.rent),
        electricityUnits: toMoney(row.electricityUnits),
        gasUnits: toMoney(row.gasUnits),
        maintenance: toMoney(row.maintenance),
        misc: toMoney(row.misc),
        utilityBaseline: row.utilityBaseline,
        utilityRateSnapshot: row.utilityRateSnapshot,
      },
      {
        assignment: {
          initialElectricityUnits: toMoney(row.tenantAssignment.initialElectricityUnits),
          initialGasUnits: toMoney(row.tenantAssignment.initialGasUnits),
        },
        monthlyBills,
      },
    );

    return {
      ...row,
      billAmount: rentBillAmount(row),
      amountDue: rentAmountDue(row),
      paidTotal: paidTowardRent(row.payments),
      balanceDue: balanceDue(row, row.payments),
      rentBreakdown,
    };
  });
}

export async function listTenantPortalPayments(tenantId: bigint) {
  return prisma.payment.findMany({
    where: { tenantId },
    select: {
      id: true,
      rentId: true,
      amount: true,
      mode: true,
      accountName: true,
      appliedToRent: true,
      toAdvance: true,
      paidAt: true,
      notes: true,
      rent: {
        select: {
          startDate: true,
          endDate: true,
          unit: { select: { unitNumber: true } },
        },
      },
    },
    orderBy: [{ paidAt: "desc" }, { id: "desc" }],
  });
}
