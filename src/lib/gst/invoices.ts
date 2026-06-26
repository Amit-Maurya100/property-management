import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { parseId, type IdInput } from "@/lib/ids";
import { normalizeGstNumber } from "@/lib/gst/gst-number";
import { ensureGstMasterForParty } from "@/lib/gst/gst-masters";
import { requireOrganizationForUser } from "@/lib/gst/organizations";
import { resolveInvoiceTax } from "@/lib/gst/tax-configurations";
import { resolveReportDateRange } from "@/lib/gst/report-periods";

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
  filingStatus: true,
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
  gstNumber?: string | null;
  tradeName?: string | null;
  customerName?: string | null;
  customerAddress?: string | null;
};

type InvoiceUpdateInput = Partial<InvoiceCreateInput> & {
  customerGstNumber?: string | null;
  filingStatus?: "PENDING" | "FILED";
};

function toDecimal(value: number) {
  return new Prisma.Decimal(value);
}

function resolvePartyGstNumber(gstNumber?: string | null) {
  if (gstNumber == null || gstNumber.trim() === "") {
    return null;
  }
  return normalizeGstNumber(gstNumber);
}

async function assertInvoiceNotDuplicate(
  organizationId: bigint,
  invoiceType: GstInvoiceType,
  invoiceNumber: string,
  gstNumber: string | null,
  excludeId?: bigint,
) {
  const existing = await prisma.gstInvoice.findFirst({
    where: {
      organizationId,
      invoiceType,
      invoiceNumber: invoiceNumber.trim(),
      gstNumber,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  });

  if (existing) {
    throw new Error("BAD_REQUEST:Invoice number already exists for this type");
  }
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
    paymentStatus: "PENDING" as const,
    gstNumber: data.gstNumber != null ? normalizeGstNumber(data.gstNumber) : null,
    tradeName: data.tradeName?.trim() || null,
    customerName: data.customerName ?? null,
    customerAddress: data.customerAddress ?? null,
  };
}

function isFilingStatusOnlyUpdate(data: InvoiceUpdateInput) {
  const keys = Object.keys(data);
  return keys.length === 1 && keys[0] === "filingStatus";
}

function mergeInvoiceForUpdate(
  existing: {
    invoiceNumber: string;
    invoiceDate: Date;
    taxableValue: Prisma.Decimal;
    cess: Prisma.Decimal;
    description: string | null;
    gstNumber: string | null;
    tradeName: string | null;
    customerName: string | null;
    customerAddress: string | null;
  },
  data: InvoiceUpdateInput,
  invoiceType: GstInvoiceType,
): InvoiceCreateInput {
  const partyGst =
    data.customerGstNumber !== undefined
      ? resolvePartyGstNumber(data.customerGstNumber)
      : data.gstNumber !== undefined
        ? resolvePartyGstNumber(data.gstNumber)
        : existing.gstNumber;

  return {
    invoiceNumber: data.invoiceNumber ?? existing.invoiceNumber,
    invoiceDate: data.invoiceDate ?? existing.invoiceDate,
    taxableValue:
      data.taxableValue ?? Number(existing.taxableValue),
    cess: data.cess ?? Number(existing.cess),
    description:
      data.description !== undefined ? data.description : existing.description,
    gstNumber:
      invoiceType === "B2C_SALE"
        ? partyGst
        : data.gstNumber !== undefined
          ? resolvePartyGstNumber(data.gstNumber)
          : existing.gstNumber,
    tradeName:
      data.tradeName !== undefined ? data.tradeName : existing.tradeName,
    customerName:
      data.customerName !== undefined ? data.customerName : existing.customerName,
    customerAddress:
      data.customerAddress !== undefined
        ? data.customerAddress
        : existing.customerAddress,
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
  const partyGstNumber = resolvePartyGstNumber(data.gstNumber);

  await assertInvoiceNotDuplicate(
    organization.id,
    invoiceType,
    data.invoiceNumber,
    partyGstNumber,
  );

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

  return prisma.gstInvoice.create({
    data: {
      organizationId: organization.id,
      invoiceType,
      ...invoiceCreateData(
        {
          ...data,
          gstNumber: partyGstNumber,
        },
        tax,
      ),
    },
    select: invoiceSelect,
  });
}

export async function updateGstInvoice(
  userId: bigint,
  id: IdInput,
  data: InvoiceUpdateInput,
) {
  const organization = await requireOrganizationForUser(userId);
  const invoiceId = parseId(id);

  const existing = await prisma.gstInvoice.findFirst({
    where: { id: invoiceId, organizationId: organization.id },
    select: {
      ...invoiceSelect,
      _count: { select: { payments: true } },
    },
  });
  if (!existing) throw new Error("NOT_FOUND");

  if (isFilingStatusOnlyUpdate(data)) {
    return prisma.gstInvoice.update({
      where: { id: invoiceId },
      data: { filingStatus: data.filingStatus },
      select: invoiceSelect,
    });
  }

  if (existing.paymentStatus === "PAID") {
    throw new Error("BAD_REQUEST:Paid invoices cannot be edited");
  }
  if (existing._count.payments > 0) {
    throw new Error("BAD_REQUEST:Invoices with payments cannot be edited");
  }

  const merged = mergeInvoiceForUpdate(existing, data, existing.invoiceType);
  const partyGstNumber = merged.gstNumber ?? null;

  await assertInvoiceNotDuplicate(
    organization.id,
    existing.invoiceType,
    merged.invoiceNumber,
    partyGstNumber,
    invoiceId,
  );

  const tax = await resolveInvoiceTax(userId, {
    invoiceDate: merged.invoiceDate,
    taxableValue: merged.taxableValue,
    cess: merged.cess ?? 0,
    partyGstNumber: merged.gstNumber,
  });

  if (merged.gstNumber && merged.tradeName) {
    await ensureGstMasterForParty(userId, {
      gstNumber: merged.gstNumber,
      tradeName: merged.tradeName,
      effectiveRegistrationDate: merged.invoiceDate,
    });
  }

  return prisma.gstInvoice.update({
    where: { id: invoiceId },
    data: {
      ...invoiceCreateData(merged, tax),
      ...(data.filingStatus ? { filingStatus: data.filingStatus } : {}),
    },
    select: invoiceSelect,
  });
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

export async function fileGstInvoicesForMonth(
  userId: bigint,
  invoiceType: GstInvoiceType,
  month: string,
) {
  const organization = await requireOrganizationForUser(userId);
  const range = resolveReportDateRange({ mode: "monthly", month });

  const result = await prisma.gstInvoice.updateMany({
    where: {
      organizationId: organization.id,
      invoiceType,
      invoiceDate: {
        gte: range.startDate,
        lte: range.endDate,
      },
    },
    data: { filingStatus: "FILED" },
  });

  return {
    updatedCount: result.count,
    month,
    periodLabel: range.label,
    invoiceType,
  };
}

export type { GstInvoiceType, InvoiceCreateInput, InvoiceUpdateInput };
