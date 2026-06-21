import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { parseId, type IdInput } from "@/lib/ids";
import { normalizeGstNumber } from "@/lib/gst/gst-number";
import { ensureGstMasterForParty } from "@/lib/gst/gst-masters";
import { requireOrganizationForUser } from "@/lib/gst/organizations";
import { resolveInvoiceTax } from "@/lib/gst/tax-configurations";

const invoiceSelect = {
  id: true,
  invoiceType: true,
  invoiceNumber: true,
  invoiceDate: true,
  gstNumber: true,
  tradeName: true,
  customerName: true,
  customerAddress: true,
  taxableValue: true,
  cgst: true,
  sgst: true,
  igst: true,
  cess: true,
  totalTaxAmount: true,
  invoiceValue: true,
  description: true,
  paymentStatus: true,
  createdAt: true,
  updatedAt: true,
} as const;

type GstInvoiceType = "B2B_SALE" | "B2C_SALE" | "PURCHASE";

type InvoiceCreateInput = {
  invoiceNumber: string;
  invoiceDate: Date;
  taxableValue: number;
  cess?: number;
  description?: string | null;
  paymentStatus: "PENDING" | "PARTIAL" | "PAID";
  gstNumber?: string | null;
  tradeName?: string | null;
  customerName?: string | null;
  customerAddress?: string | null;
};

function toDecimal(value: number) {
  return new Prisma.Decimal(value);
}

function invoiceCreateData(
  data: InvoiceCreateInput,
  tax: Awaited<ReturnType<typeof resolveInvoiceTax>>,
) {
  return {
    invoiceNumber: data.invoiceNumber,
    invoiceDate: data.invoiceDate,
    taxableValue: toDecimal(data.taxableValue),
    cgst: toDecimal(tax.cgst),
    sgst: toDecimal(tax.sgst),
    igst: toDecimal(tax.igst),
    cess: toDecimal(tax.cess),
    totalTaxAmount: toDecimal(tax.totalTaxAmount),
    invoiceValue: toDecimal(tax.invoiceValue),
    description: data.description ?? null,
    paymentStatus: data.paymentStatus,
    gstNumber: data.gstNumber != null ? normalizeGstNumber(data.gstNumber) : null,
    tradeName: data.tradeName?.trim() || null,
    customerName: data.customerName ?? null,
    customerAddress: data.customerAddress ?? null,
  };
}

export async function listGstInvoices(userId: bigint, invoiceType: GstInvoiceType) {
  const organization = await requireOrganizationForUser(userId);
  return prisma.gstInvoice.findMany({
    where: { organizationId: organization.id, invoiceType },
    select: invoiceSelect,
    orderBy: [{ invoiceDate: "desc" }, { id: "desc" }],
  });
}

export async function createGstInvoice(
  userId: bigint,
  invoiceType: GstInvoiceType,
  data: InvoiceCreateInput,
) {
  const organization = await requireOrganizationForUser(userId);
  const tax = await resolveInvoiceTax(userId, {
    invoiceDate: data.invoiceDate,
    taxableValue: data.taxableValue,
    cess: data.cess ?? 0,
    partyGstNumber: data.gstNumber,
  });

  if (data.gstNumber && data.tradeName) {
    await ensureGstMasterForParty(userId, {
      gstNumber: data.gstNumber,
      tradeName: data.tradeName,
      effectiveRegistrationDate: data.invoiceDate,
    });
  }

  try {
    return await prisma.gstInvoice.create({
      data: {
        organizationId: organization.id,
        invoiceType,
        ...invoiceCreateData(data, tax),
      },
      select: invoiceSelect,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new Error("BAD_REQUEST:Invoice number already exists for this type");
    }
    throw error;
  }
}

export async function deleteGstInvoice(userId: bigint, id: IdInput) {
  const organization = await requireOrganizationForUser(userId);
  const invoiceId = parseId(id);

  const existing = await prisma.gstInvoice.findFirst({
    where: { id: invoiceId, organizationId: organization.id },
    select: { id: true },
  });
  if (!existing) throw new Error("NOT_FOUND");

  await prisma.gstInvoice.delete({ where: { id: invoiceId } });
}

export type { GstInvoiceType, InvoiceCreateInput };
