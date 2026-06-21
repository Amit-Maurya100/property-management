import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { parseId, type IdInput } from "@/lib/ids";
import {
  balanceDue,
  derivePaymentStatus,
  paidTowardRent,
  rentAmountDue,
  rentBillAmount,
  splitPaymentAmount,
  toMoney,
} from "@/lib/properties/payment-calculations";
import {
  breakdownFromRentRow,
  formatIsoDate,
} from "@/lib/properties/rent-calculations";
import type { PropertyAccessContext } from "@/lib/properties/ownership";
import {
  assertUserOwnsRent,
  assertUserOwnsTenant,
  ownerTenantFilter,
} from "@/lib/properties/ownership";

const paymentSelect = {
  id: true,
  rentId: true,
  tenantId: true,
  amount: true,
  mode: true,
  appliedToRent: true,
  toAdvance: true,
  paidAt: true,
  notes: true,
  createdAt: true,
} as const;

const rentPaymentSelect = {
  id: true,
  tenantId: true,
  unitId: true,
  startDate: true,
  endDate: true,
  rent: true,
  totalRent: true,
  electricityUnits: true,
  gasUnits: true,
  maintenance: true,
  misc: true,
  utilityBaseline: true,
  utilityRateSnapshot: true,
  dueDate: true,
  priorBalance: true,
  balanceCarriedForward: true,
  paymentStatus: true,
  tenantAssignment: {
    select: {
      initialElectricityUnits: true,
      initialGasUnits: true,
    },
  },
  tenant: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      advanceBalance: true,
    },
  },
  unit: {
    select: {
      id: true,
      unitNumber: true,
    },
  },
  payments: {
    select: paymentSelect,
    orderBy: [{ paidAt: "desc" }, { id: "desc" }],
  },
} satisfies Prisma.RentSelect;

type RentWithPayments = Prisma.RentGetPayload<{ select: typeof rentPaymentSelect }>;

type TenantBillForBreakdown = {
  id: bigint;
  startDate: Date;
  electricityUnits: Prisma.Decimal | null;
  gasUnits: Prisma.Decimal | null;
  utilityBaseline: Prisma.JsonValue;
};

function toMonthlyBillsForBreakdown(bills: TenantBillForBreakdown[]) {
  return bills.map((bill) => ({
    id: String(bill.id),
    startDate: formatIsoDate(bill.startDate),
    electricityUnits: toMoney(bill.electricityUnits),
    gasUnits: toMoney(bill.gasUnits),
    utilityBaseline: bill.utilityBaseline,
  }));
}

function computeRentBreakdown(
  row: RentWithPayments,
  tenantBills: TenantBillForBreakdown[],
) {
  return breakdownFromRentRow(
    {
      id: String(row.id),
      startDate: formatIsoDate(row.startDate),
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
      monthlyBills: toMonthlyBillsForBreakdown(tenantBills),
    },
  );
}

function enrichRentPayment(
  row: RentWithPayments,
  tenantBills: TenantBillForBreakdown[] = [],
) {
  const billAmount = rentBillAmount(row);
  const amountDue = rentAmountDue(row);
  const paidTotal = paidTowardRent(row.payments);
  const outstanding = balanceDue(row, row.payments);
  const rentBreakdown = computeRentBreakdown(row, tenantBills);

  return {
    ...row,
    billAmount,
    amountDue,
    paidTotal,
    balanceDue: outstanding,
    rentBreakdown,
  };
}

async function loadTenantBillsForBreakdown(tenantIds: bigint[]) {
  if (tenantIds.length === 0) return new Map<bigint, TenantBillForBreakdown[]>();

  const bills = await prisma.rent.findMany({
    where: { tenantId: { in: tenantIds } },
    select: {
      id: true,
      tenantId: true,
      startDate: true,
      electricityUnits: true,
      gasUnits: true,
      utilityBaseline: true,
    },
    orderBy: { startDate: "desc" },
  });

  const byTenant = new Map<bigint, TenantBillForBreakdown[]>();
  for (const bill of bills) {
    const list = byTenant.get(bill.tenantId) ?? [];
    list.push(bill);
    byTenant.set(bill.tenantId, list);
  }
  return byTenant;
}

export async function carryForwardTenantBalance(
  tx: Prisma.TransactionClient,
  tenantId: bigint,
) {
  const rents = await tx.rent.findMany({
    where: { tenantId, balanceCarriedForward: false },
    select: {
      id: true,
      rent: true,
      totalRent: true,
      priorBalance: true,
      balanceCarriedForward: true,
      payments: { select: { appliedToRent: true } },
    },
  });

  let totalOutstanding = 0;
  const rentIdsToCarry: bigint[] = [];

  for (const rent of rents) {
    const outstanding = balanceDue(rent, rent.payments);
    if (outstanding > 0) {
      totalOutstanding += outstanding;
      rentIdsToCarry.push(rent.id);
    }
  }

  if (rentIdsToCarry.length > 0) {
    await tx.rent.updateMany({
      where: { id: { in: rentIdsToCarry } },
      data: { balanceCarriedForward: true, paymentStatus: "PAID" },
    });
  }

  return totalOutstanding;
}

export async function listRentPayments(
  ctx: PropertyAccessContext,
  filters: { tenantId?: bigint; status?: "open" | "all" } = {},
) {
  const ownerFilter = ctx.isStaff
    ? {}
    : {
        tenant: ownerTenantFilter(ctx),
        unit: { floor: { building: { property: { ownerId: ctx.userId } } } },
      };

  const rows = await prisma.rent.findMany({
    where: {
      ...(filters.tenantId ? { tenantId: filters.tenantId } : {}),
      ...(filters.status === "open"
        ? {
            balanceCarriedForward: false,
            paymentStatus: { in: ["PENDING", "PARTIAL"] },
          }
        : {}),
      ...ownerFilter,
    },
    select: rentPaymentSelect,
    orderBy: [{ dueDate: "desc" }, { startDate: "desc" }, { id: "desc" }],
  });

  const tenantIds = [...new Set(rows.map((row) => row.tenantId))];
  const billsByTenant = await loadTenantBillsForBreakdown(tenantIds);

  return rows.map((row) =>
    enrichRentPayment(row, billsByTenant.get(row.tenantId) ?? []),
  );
}

export async function createPayment(
  ctx: PropertyAccessContext,
  data: {
    rentId: bigint;
    amount: number;
    mode: "CASH" | "CHEQUE" | "NEFT" | "UPI" | "OTHER";
    paidAt?: Date;
    notes?: string;
  },
) {
  await assertUserOwnsRent(ctx, data.rentId);

  const rent = await prisma.rent.findUnique({
    where: { id: data.rentId },
    select: {
      id: true,
      tenantId: true,
      balanceCarriedForward: true,
      rent: true,
      totalRent: true,
      priorBalance: true,
      payments: { select: { appliedToRent: true } },
    },
  });

  if (!rent) throw new Error("NOT_FOUND");
  if (rent.balanceCarriedForward) {
    throw new Error("BAD_REQUEST:This rent balance was carried forward to a newer bill");
  }

  const outstanding = balanceDue(rent, rent.payments);
  if (outstanding <= 0) {
    throw new Error("BAD_REQUEST:This rent is already fully paid");
  }

  const { appliedToRent, toAdvance } = splitPaymentAmount(data.amount, outstanding);
  if (appliedToRent <= 0 && toAdvance <= 0) {
    throw new Error("BAD_REQUEST:Payment amount must be greater than zero");
  }

  const paidAt = data.paidAt ?? new Date();
  const newPaidTotal = paidTowardRent(rent.payments) + appliedToRent;
  const amountDue = rentAmountDue(rent);
  const newBalance = Math.max(0, amountDue - newPaidTotal);
  const paymentStatus = derivePaymentStatus(amountDue, newPaidTotal, newBalance);

  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.create({
      data: {
        rentId: rent.id,
        tenantId: rent.tenantId,
        amount: new Prisma.Decimal(data.amount),
        mode: data.mode,
        appliedToRent: new Prisma.Decimal(appliedToRent),
        toAdvance: new Prisma.Decimal(toAdvance),
        paidAt,
        notes: data.notes || null,
      },
      select: paymentSelect,
    });

    if (toAdvance > 0) {
      await tx.tenant.update({
        where: { id: rent.tenantId },
        data: {
          advanceBalance: { increment: new Prisma.Decimal(toAdvance) },
        },
      });
    }

    await tx.rent.update({
      where: { id: rent.id },
      data: { paymentStatus },
    });

    const updated = await tx.rent.findUnique({
      where: { id: rent.id },
      select: rentPaymentSelect,
    });
    if (!updated) throw new Error("NOT_FOUND");

    const tenantBills = await tx.rent.findMany({
      where: { tenantId: updated.tenantId },
      select: {
        id: true,
        tenantId: true,
        startDate: true,
        electricityUnits: true,
        gasUnits: true,
        utilityBaseline: true,
      },
      orderBy: { startDate: "desc" },
    });

    return {
      payment,
      rent: enrichRentPayment(updated, tenantBills),
    };
  });
}

export async function deletePayment(ctx: PropertyAccessContext, id: IdInput) {
  const paymentId = parseId(id);
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: {
      id: true,
      rentId: true,
      tenantId: true,
      appliedToRent: true,
      toAdvance: true,
    },
  });
  if (!payment) throw new Error("NOT_FOUND");

  await assertUserOwnsRent(ctx, payment.rentId);

  return prisma.$transaction(async (tx) => {
    await tx.payment.delete({ where: { id: paymentId } });

    if (toMoney(payment.toAdvance) > 0) {
      await tx.tenant.update({
        where: { id: payment.tenantId },
        data: {
          advanceBalance: { decrement: payment.toAdvance },
        },
      });
    }

    const rent = await tx.rent.findUnique({
      where: { id: payment.rentId },
      select: {
        id: true,
        rent: true,
        totalRent: true,
        priorBalance: true,
        balanceCarriedForward: true,
        payments: { select: { appliedToRent: true } },
      },
    });
    if (!rent) throw new Error("NOT_FOUND");

    const amountDue = rentAmountDue(rent);
    const paidTotal = paidTowardRent(rent.payments);
    const outstanding = balanceDue(rent, rent.payments);
    const paymentStatus = derivePaymentStatus(amountDue, paidTotal, outstanding);

    await tx.rent.update({
      where: { id: rent.id },
      data: { paymentStatus },
    });
  });
}
