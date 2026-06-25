import { Resend } from "resend";
import { prisma } from "@/lib/db";
import {
  buildRentGeneratedEmail,
  rentBreakdownToLineItems,
} from "@/lib/email/rent-generated-template";
import {
  getResendApiKey,
  getResendFromAddress,
  isResendConfigured,
} from "@/lib/email/resend-config";
import { rentAmountDue, toMoney } from "@/lib/properties/payment-calculations";
import { breakdownFromRentRow, formatIsoDate } from "@/lib/properties/rent-calculations";

const rentEmailSelect = {
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

export type SendRentGeneratedEmailResult =
  | { sent: false; reason: "not_configured" | "no_email" | "no_breakdown" }
  | { sent: true; email: string; id?: string };

export async function sendRentGeneratedEmail(
  rentId: bigint,
): Promise<SendRentGeneratedEmailResult> {
  if (!isResendConfigured()) {
    console.warn("Resend is not configured; skipping rent notification email");
    return { sent: false, reason: "not_configured" };
  }

  const rent = await prisma.rent.findUnique({
    where: { id: rentId },
    select: rentEmailSelect,
  });
  if (!rent) {
    throw new Error("NOT_FOUND");
  }

  const tenantEmail = rent.tenant.email?.trim();
  if (!tenantEmail) {
    console.warn(
      `Tenant ${rent.tenant.firstName} ${rent.tenant.lastName} has no email; skipping rent notification`,
    );
    return { sent: false, reason: "no_email" };
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
    console.warn(`Could not build rent breakdown for rent ${rentId}; skipping email`);
    return { sent: false, reason: "no_breakdown" };
  }

  const periodTotal = toMoney(rent.totalRent);
  const priorBalance = toMoney(rent.priorBalance);
  const amountDue = rentAmountDue({
    rent: toMoney(rent.rent),
    totalRent: periodTotal,
    priorBalance,
    balanceCarriedForward: rent.balanceCarriedForward,
  });

  const tenantName = `${rent.tenant.firstName} ${rent.tenant.lastName}`.trim();
  const { subject, html, text } = buildRentGeneratedEmail({
    tenantName,
    propertyName: rent.unit.floor.building.property.name,
    buildingName: rent.unit.floor.building.name,
    unitNumber: rent.unit.unitNumber,
    periodStart: formatIsoDate(rent.startDate),
    periodEnd: rent.endDate ? formatIsoDate(rent.endDate) : null,
    dueDate: formatIsoDate(rent.dueDate),
    lineItems: rentBreakdownToLineItems(breakdown),
    periodTotal,
    priorBalance,
    amountDue,
    isExitRent: rent.isExitRent,
  });

  const resend = new Resend(getResendApiKey());
  const { data, error } = await resend.emails.send({
    from: getResendFromAddress(),
    to: tenantEmail,
    subject,
    html,
    text,
  });

  if (error) {
    throw new Error(error.message);
  }

  return { sent: true, email: tenantEmail, id: data?.id };
}
