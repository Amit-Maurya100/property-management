import { prisma } from "@/lib/db";
import {
  rentBreakdownToLineItems,
  type RentEmailLineItem,
} from "@/lib/email/rent-generated-template";
import { rentAmountDue, toMoney } from "@/lib/properties/payment-calculations";
import { breakdownFromRentRow, formatIsoDate } from "@/lib/properties/rent-calculations";

const rentNotificationSelect = {
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
  utilityBaseline: true,
  utilityRateSnapshot: true,
  dueDate: true,
  priorBalance: true,
  balanceCarriedForward: true,
  tenant: {
    select: {
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
    },
  },
  tenantAssignment: {
    select: {
      initialElectricityUnits: true,
      initialGasUnits: true,
    },
  },
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
} as const;

export type RentGeneratedNotification = {
  tenantName: string;
  tenantEmail: string | null;
  tenantPhone: string | null;
  propertyName: string;
  buildingName: string;
  unitNumber: string;
  periodStart: string;
  periodEnd: string | null;
  dueDate: string;
  lineItems: RentEmailLineItem[];
  periodTotal: number;
  priorBalance: number;
  amountDue: number;
  isExitRent: boolean;
};

export type LoadRentGeneratedNotificationResult =
  | { ok: false; reason: "not_found" | "no_breakdown" }
  | { ok: true; data: RentGeneratedNotification };

export async function loadRentGeneratedNotification(
  rentId: bigint,
): Promise<LoadRentGeneratedNotificationResult> {
  const rent = await prisma.rent.findUnique({
    where: { id: rentId },
    select: rentNotificationSelect,
  });
  if (!rent) {
    return { ok: false, reason: "not_found" };
  }

  const tenantBills = await prisma.rent.findMany({
    where: { tenantId: rent.tenantId },
    select: {
      id: true,
      startDate: true,
      electricityUnits: true,
      gasUnits: true,
      utilityBaseline: true,
    },
    orderBy: [{ startDate: "desc" }, { id: "desc" }],
  });

  const breakdown = breakdownFromRentRow(
    {
      id: String(rent.id),
      startDate: formatIsoDate(rent.startDate),
      endDate: rent.endDate ? formatIsoDate(rent.endDate) : null,
      isExitRent: rent.isExitRent,
      rent: toMoney(rent.rent),
      electricityUnits: toMoney(rent.electricityUnits),
      gasUnits: toMoney(rent.gasUnits),
      maintenance: toMoney(rent.maintenance),
      misc: toMoney(rent.misc),
      utilityBaseline: rent.utilityBaseline,
      utilityRateSnapshot: rent.utilityRateSnapshot,
    },
    {
      assignment: {
        initialElectricityUnits: toMoney(rent.tenantAssignment.initialElectricityUnits),
        initialGasUnits: toMoney(rent.tenantAssignment.initialGasUnits),
      },
      monthlyBills: tenantBills.map((bill) => ({
        id: String(bill.id),
        startDate: formatIsoDate(bill.startDate),
        electricityUnits: toMoney(bill.electricityUnits),
        gasUnits: toMoney(bill.gasUnits),
        utilityBaseline: bill.utilityBaseline,
      })),
    },
  );

  if (!breakdown) {
    return { ok: false, reason: "no_breakdown" };
  }

  const periodTotal = toMoney(rent.totalRent);
  const priorBalance = toMoney(rent.priorBalance);

  return {
    ok: true,
    data: {
      tenantName: `${rent.tenant.firstName} ${rent.tenant.lastName}`.trim(),
      tenantEmail: rent.tenant.email?.trim() || null,
      tenantPhone: rent.tenant.phone?.trim() || null,
      propertyName: rent.unit.floor.building.property.name,
      buildingName: rent.unit.floor.building.name,
      unitNumber: rent.unit.unitNumber,
      periodStart: formatIsoDate(rent.startDate),
      periodEnd: rent.endDate ? formatIsoDate(rent.endDate) : null,
      dueDate: formatIsoDate(rent.dueDate),
      lineItems: rentBreakdownToLineItems(breakdown),
      periodTotal,
      priorBalance,
      amountDue: rentAmountDue({
        rent: toMoney(rent.rent),
        totalRent: periodTotal,
        priorBalance,
        balanceCarriedForward: rent.balanceCarriedForward,
      }),
      isExitRent: rent.isExitRent,
    },
  };
}
