import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { formatIsoDate, resolveReportDateRange } from "@/lib/gst/report-periods";
import type { PropertyAccessContext } from "@/lib/properties/ownership";
import { ownerTenantFilter } from "@/lib/properties/ownership";
import {
  balanceDue,
  paymentAccountNameLabel,
  paymentModeLabel,
  rentBillAmount,
  toMoney,
  type PaymentAccountNameValue,
  type PaymentModeValue,
} from "@/lib/properties/payment-calculations";
import {
  breakdownFromRentRow,
  formatIsoDate as formatRentDate,
} from "@/lib/properties/rent-calculations";

export type RentReportPeriodMode = "monthly" | "quarterly" | "yearly" | "custom";

export type RentReportQuery = {
  mode: RentReportPeriodMode;
  month?: string;
  year?: number;
  quarter?: number;
  dateFrom?: string;
  dateTo?: string;
  tenantId?: bigint;
};

export type RentReportComponents = {
  billCount: number;
  baseRent: number;
  electricity: number;
  gas: number;
  cleaning: number;
  maintenance: number;
  misc: number;
  priorBalance: number;
  total: number;
};

export type RentReportCollectionRow = {
  key: string;
  label: string;
  amount: number;
};

export type RentReportExpiringLease = {
  tenantId: string;
  tenantName: string;
  unitNumber: string;
  leaseTo: string;
  monthlyRent: number | null;
};

export type RentReportResult = {
  period: {
    mode: RentReportPeriodMode;
    startDate: string;
    endDate: string;
    label: string;
  };
  tenant: {
    id: string;
    name: string;
  } | null;
  tenantRent: RentReportComponents | null;
  overallRent: RentReportComponents;
  collections: {
    byAccountName: RentReportCollectionRow[];
    byMode: RentReportCollectionRow[];
    totalReceived: number;
  };
  expiringLeases: RentReportExpiringLease[];
  hasPendingRent: boolean;
  pendingRentCount: number;
};

const rentReportSelect = {
  id: true,
  tenantId: true,
  startDate: true,
  endDate: true,
  isExitRent: true,
  rent: true,
  totalRent: true,
  electricityUnits: true,
  gasUnits: true,
  maintenance: true,
  misc: true,
  priorBalance: true,
  utilityBaseline: true,
  utilityRateSnapshot: true,
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
    },
  },
} satisfies Prisma.RentSelect;

type RentReportRow = Prisma.RentGetPayload<{ select: typeof rentReportSelect }>;

type TenantBillForBreakdown = {
  id: bigint;
  tenantId: bigint;
  startDate: Date;
  electricityUnits: Prisma.Decimal | null;
  gasUnits: Prisma.Decimal | null;
  utilityBaseline: Prisma.JsonValue;
};

function propertyOwnerFilter(ctx: PropertyAccessContext) {
  return ctx.isStaff
    ? {}
    : {
        tenant: ownerTenantFilter(ctx),
        unit: { floor: { building: { property: { ownerId: ctx.userId } } } },
      };
}

function paymentOwnerFilter(ctx: PropertyAccessContext) {
  return ctx.isStaff
    ? {}
    : {
        tenant: ownerTenantFilter(ctx),
        rent: {
          unit: { floor: { building: { property: { ownerId: ctx.userId } } } },
        },
      };
}

function emptyComponents(): RentReportComponents {
  return {
    billCount: 0,
    baseRent: 0,
    electricity: 0,
    gas: 0,
    cleaning: 0,
    maintenance: 0,
    misc: 0,
    priorBalance: 0,
    total: 0,
  };
}

function tenantName(row: { firstName: string; lastName: string }) {
  return `${row.firstName} ${row.lastName}`;
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

function computeBreakdown(
  row: RentReportRow,
  tenantBills: TenantBillForBreakdown[],
) {
  return breakdownFromRentRow(
    {
      id: String(row.id),
      startDate: formatRentDate(row.startDate),
      endDate: row.endDate ? formatRentDate(row.endDate) : null,
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
      monthlyBills: tenantBills.map((bill) => ({
        id: String(bill.id),
        startDate: formatRentDate(bill.startDate),
        electricityUnits: toMoney(bill.electricityUnits),
        gasUnits: toMoney(bill.gasUnits),
        utilityBaseline: bill.utilityBaseline,
      })),
    },
  );
}

function aggregateComponents(
  rows: RentReportRow[],
  billsByTenant: Map<bigint, TenantBillForBreakdown[]>,
): RentReportComponents {
  const totals = emptyComponents();
  totals.billCount = rows.length;

  for (const row of rows) {
    const prior = toMoney(row.priorBalance);
    totals.priorBalance += prior;
    const breakdown = computeBreakdown(row, billsByTenant.get(row.tenantId) ?? []);

    if (breakdown) {
      totals.baseRent += breakdown.monthlyRent;
      totals.electricity += breakdown.electricityCharge;
      totals.gas += breakdown.gasCharge;
      totals.cleaning += breakdown.cleaningCharge;
      totals.maintenance += breakdown.maintenance;
      totals.misc += breakdown.misc;
      totals.total += breakdown.total + prior;
      continue;
    }

    totals.baseRent += toMoney(row.rent);
    totals.maintenance += toMoney(row.maintenance);
    totals.misc += toMoney(row.misc);
    totals.total += rentBillAmount(row) + prior;
  }

  return totals;
}

function utcToday() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function addUtcMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
}

export async function getRentReport(
  ctx: PropertyAccessContext,
  query: RentReportQuery,
): Promise<RentReportResult> {
  const period = resolveReportDateRange(query);
  const tenantId = query.tenantId;

  const allRents = await prisma.rent.findMany({
    where: {
      startDate: {
        gte: period.startDate,
        lte: period.endDate,
      },
      ...propertyOwnerFilter(ctx),
    },
    select: rentReportSelect,
    orderBy: [{ startDate: "asc" }, { id: "asc" }],
  });

  const tenantIds = [...new Set(allRents.map((row) => row.tenantId))];
  const billsByTenant = await loadTenantBillsForBreakdown(tenantIds);

  const overallRent = aggregateComponents(allRents, billsByTenant);

  let tenantRent: RentReportComponents | null = null;
  let tenantMeta: RentReportResult["tenant"] = null;

  if (tenantId) {
    const tenantRows = allRents.filter((row) => row.tenantId === tenantId);
    tenantRent = aggregateComponents(tenantRows, billsByTenant);
    const tenantRow = tenantRows[0]?.tenant;
    if (tenantRow) {
      tenantMeta = {
        id: String(tenantRow.id),
        name: tenantName(tenantRow),
      };
    } else {
      const tenant = await prisma.tenant.findFirst({
        where: {
          id: tenantId,
          ...ownerTenantFilter(ctx),
        },
        select: { id: true, firstName: true, lastName: true },
      });
      if (tenant) {
        tenantMeta = {
          id: String(tenant.id),
          name: tenantName(tenant),
        };
      }
    }
  }

  const payments = await prisma.payment.findMany({
    where: {
      paidAt: {
        gte: period.startDate,
        lte: period.endDate,
      },
      ...(tenantId ? { tenantId } : {}),
      ...paymentOwnerFilter(ctx),
    },
    select: {
      amount: true,
      mode: true,
      accountName: true,
    },
  });

  const accountTotals = new Map<PaymentAccountNameValue, number>();
  const modeTotals = new Map<PaymentModeValue, number>();
  let totalReceived = 0;

  for (const payment of payments) {
    const amount = toMoney(payment.amount);
    totalReceived += amount;
    accountTotals.set(
      payment.accountName,
      (accountTotals.get(payment.accountName) ?? 0) + amount,
    );
    modeTotals.set(payment.mode, (modeTotals.get(payment.mode) ?? 0) + amount);
  }

  const today = utcToday();
  const leaseCutoff = addUtcMonths(today, 2);

  const expiringAssignments = await prisma.tenantAssignment.findMany({
    where: {
      isActive: true,
      leaseTo: {
        not: null,
        gte: today,
        lte: leaseCutoff,
      },
      tenant: ownerTenantFilter(ctx),
    },
    select: {
      leaseTo: true,
      monthlyRent: true,
      tenant: {
        select: { id: true, firstName: true, lastName: true },
      },
      unit: {
        select: { unitNumber: true },
      },
    },
    orderBy: [{ leaseTo: "asc" }, { id: "asc" }],
  });

  const openRents = await prisma.rent.findMany({
    where: {
      balanceCarriedForward: false,
      paymentStatus: { in: ["PENDING", "PARTIAL"] },
      ...propertyOwnerFilter(ctx),
    },
    select: {
      rent: true,
      totalRent: true,
      priorBalance: true,
      balanceCarriedForward: true,
      payments: { select: { appliedToRent: true } },
    },
  });

  let pendingRentCount = 0;
  for (const rent of openRents) {
    if (balanceDue(rent, rent.payments) > 0) pendingRentCount += 1;
  }

  return {
    period: {
      mode: query.mode,
      startDate: formatIsoDate(period.startDate),
      endDate: formatIsoDate(period.endDate),
      label: period.label,
    },
    tenant: tenantMeta,
    tenantRent: tenantId ? tenantRent : null,
    overallRent,
    collections: {
      byAccountName: [...accountTotals.entries()]
        .map(([key, amount]) => ({
          key,
          label: paymentAccountNameLabel(key),
          amount,
        }))
        .sort((a, b) => b.amount - a.amount),
      byMode: [...modeTotals.entries()]
        .map(([key, amount]) => ({
          key,
          label: paymentModeLabel(key),
          amount,
        }))
        .sort((a, b) => b.amount - a.amount),
      totalReceived,
    },
    expiringLeases: expiringAssignments.map((row) => ({
      tenantId: String(row.tenant.id),
      tenantName: tenantName(row.tenant),
      unitNumber: row.unit.unitNumber,
      leaseTo: formatIsoDate(row.leaseTo!),
      monthlyRent: row.monthlyRent != null ? toMoney(row.monthlyRent) : null,
    })),
    hasPendingRent: pendingRentCount > 0,
    pendingRentCount,
  };
}
