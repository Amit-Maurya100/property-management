import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { parseId, resolveUserId, type IdInput } from "@/lib/ids";
import {
  deriveGstInvoicePaymentStatus,
  gstInvoiceBalanceDue,
  invoiceAmountDue,
  paidTowardInvoice,
  splitGstPaymentAmount,
} from "@/lib/gst/payment-calculations";
import { requireOrganizationForUser } from "@/lib/gst/organizations";

type GstInvoiceType = "B2B_SALE" | "B2C_SALE" | "PURCHASE";

const gstPaymentSelect = {
  id: true,
  gstInvoiceId: true,
  organizationId: true,
  amount: true,
  mode: true,
  accountName: true,
  appliedToInvoice: true,
  paidAt: true,
  notes: true,
  createdAt: true,
} as const;

const gstInvoicePaymentSelect = {
  id: true,
  invoiceType: true,
  invoiceNumber: true,
  invoiceDate: true,
  gstNumber: true,
  tradeName: true,
  customerName: true,
  taxableValue: true,
  totalTaxAmount: true,
  invoiceValue: true,
  paymentStatus: true,
  payments: {
    select: gstPaymentSelect,
    orderBy: [{ paidAt: "desc" as const }, { id: "desc" as const }],
  },
} satisfies Prisma.GstInvoiceSelect;

type GstInvoiceWithPayments = Prisma.GstInvoiceGetPayload<{
  select: typeof gstInvoicePaymentSelect;
}>;

function enrichGstInvoicePayment(row: GstInvoiceWithPayments) {
  const invoiceAmount = invoiceAmountDue(row);
  const paidTotal = paidTowardInvoice(row.payments);
  const balanceDue = gstInvoiceBalanceDue(row, row.payments);

  return {
    ...row,
    invoiceAmount,
    paidTotal,
    balanceDue,
  };
}

async function assertInvoiceOwnedByUser(userId: bigint, invoiceId: bigint) {
  const organization = await requireOrganizationForUser(userId);
  const invoice = await prisma.gstInvoice.findFirst({
    where: { id: invoiceId, organizationId: organization.id },
    select: { id: true, organizationId: true },
  });
  if (!invoice) throw new Error("NOT_FOUND");
  return { organization, invoice };
}

export async function listGstInvoicePayments(
  userId: IdInput,
  filters: { invoiceType?: GstInvoiceType; status?: "open" | "all" } = {},
) {
  const resolvedUserId = await resolveUserId(userId);
  const organization = await requireOrganizationForUser(resolvedUserId);

  const rows = await prisma.gstInvoice.findMany({
    where: {
      organizationId: organization.id,
      ...(filters.invoiceType ? { invoiceType: filters.invoiceType } : {}),
      ...(filters.status === "open"
        ? { paymentStatus: { in: ["PENDING", "PARTIAL"] } }
        : {}),
    },
    select: gstInvoicePaymentSelect,
    orderBy: [{ invoiceDate: "desc" }, { id: "desc" }],
  });

  return rows.map(enrichGstInvoicePayment);
}

export async function createGstPayment(
  userId: bigint,
  data: {
    gstInvoiceId: bigint;
    amount: number;
    mode: "CASH" | "CHEQUE" | "NEFT" | "UPI" | "OTHER";
    accountName?: "AMIT" | "SARITA" | "PYARI" | "DN" | "NONE";
    paidAt?: Date;
    notes?: string;
  },
) {
  const { organization, invoice: owned } = await assertInvoiceOwnedByUser(
    userId,
    data.gstInvoiceId,
  );

  const invoice = await prisma.gstInvoice.findUnique({
    where: { id: owned.id },
    select: {
      id: true,
      invoiceValue: true,
      payments: { select: { appliedToInvoice: true } },
    },
  });
  if (!invoice) throw new Error("NOT_FOUND");

  const outstanding = gstInvoiceBalanceDue(invoice, invoice.payments);
  if (outstanding <= 0) {
    throw new Error("BAD_REQUEST:This invoice is already fully paid");
  }

  const { appliedToInvoice } = splitGstPaymentAmount(data.amount, outstanding);
  const paidAt = data.paidAt ?? new Date();
  const newPaidTotal = paidTowardInvoice(invoice.payments) + appliedToInvoice;
  const amountDue = invoiceAmountDue(invoice);
  const newBalance = Math.max(0, amountDue - newPaidTotal);
  const paymentStatus = deriveGstInvoicePaymentStatus(
    amountDue,
    newPaidTotal,
    newBalance,
  );

  return prisma.$transaction(async (tx) => {
    const payment = await tx.gstPayment.create({
      data: {
        gstInvoiceId: invoice.id,
        organizationId: organization.id,
        amount: new Prisma.Decimal(data.amount),
        mode: data.mode,
        accountName: data.accountName ?? "NONE",
        appliedToInvoice: new Prisma.Decimal(appliedToInvoice),
        paidAt,
        notes: data.notes || null,
      },
      select: gstPaymentSelect,
    });

    await tx.gstInvoice.update({
      where: { id: invoice.id },
      data: { paymentStatus },
    });

    const updated = await tx.gstInvoice.findUnique({
      where: { id: invoice.id },
      select: gstInvoicePaymentSelect,
    });
    if (!updated) throw new Error("NOT_FOUND");

    return {
      payment,
      invoice: enrichGstInvoicePayment(updated),
    };
  });
}

export async function deleteGstPayment(userId: bigint, id: IdInput) {
  const paymentId = parseId(id);
  const organization = await requireOrganizationForUser(userId);

  const payment = await prisma.gstPayment.findFirst({
    where: { id: paymentId, organizationId: organization.id },
    select: {
      id: true,
      gstInvoiceId: true,
    },
  });
  if (!payment) throw new Error("NOT_FOUND");

  return prisma.$transaction(async (tx) => {
    await tx.gstPayment.delete({ where: { id: paymentId } });

    const invoice = await tx.gstInvoice.findUnique({
      where: { id: payment.gstInvoiceId },
      select: {
        id: true,
        invoiceValue: true,
        payments: { select: { appliedToInvoice: true } },
      },
    });
    if (!invoice) throw new Error("NOT_FOUND");

    const paidTotal = paidTowardInvoice(invoice.payments);
    const amountDue = invoiceAmountDue(invoice);
    const balanceDue = Math.max(0, amountDue - paidTotal);
    const paymentStatus = deriveGstInvoicePaymentStatus(
      amountDue,
      paidTotal,
      balanceDue,
    );

    await tx.gstInvoice.update({
      where: { id: invoice.id },
      data: { paymentStatus },
    });

    const updated = await tx.gstInvoice.findUnique({
      where: { id: invoice.id },
      select: gstInvoicePaymentSelect,
    });
    if (!updated) throw new Error("NOT_FOUND");

    return enrichGstInvoicePayment(updated);
  });
}
