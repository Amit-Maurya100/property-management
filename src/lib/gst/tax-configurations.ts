import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { parseId, type IdInput } from "@/lib/ids";
import {
  isTaxConfigActive,
  isTaxConfigExpired,
  toMoney,
  calculateInvoiceTax,
} from "@/lib/gst/tax-calculations";
import { requireOrganizationForUser } from "@/lib/gst/organizations";

const taxConfigSelect = {
  id: true,
  cgstRate: true,
  sgstRate: true,
  igstRate: true,
  startDate: true,
  endDate: true,
  createdAt: true,
  updatedAt: true,
} as const;

function enrichTaxConfig(row: {
  id: bigint;
  cgstRate: Prisma.Decimal;
  sgstRate: Prisma.Decimal;
  igstRate: Prisma.Decimal;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...row,
    cgstRate: toMoney(row.cgstRate),
    sgstRate: toMoney(row.sgstRate),
    igstRate: toMoney(row.igstRate),
    isExpired: isTaxConfigExpired(row.endDate),
  };
}

export async function listTaxConfigurations(userId: bigint) {
  const organization = await requireOrganizationForUser(userId);
  const rows = await prisma.gstTaxConfiguration.findMany({
    where: { organizationId: organization.id },
    select: taxConfigSelect,
    orderBy: [{ startDate: "desc" }, { id: "desc" }],
  });
  return rows.map(enrichTaxConfig);
}

export async function getActiveTaxConfiguration(userId: bigint, onDate: Date) {
  const organization = await requireOrganizationForUser(userId);
  const rows = await prisma.gstTaxConfiguration.findMany({
    where: { organizationId: organization.id },
    select: taxConfigSelect,
    orderBy: [{ startDate: "desc" }, { id: "desc" }],
  });

  const active = rows.find((row) => isTaxConfigActive(row.startDate, row.endDate, onDate));
  if (!active) return null;

  return {
    ...enrichTaxConfig(active),
    organizationGstNumber: organization.gstNumber,
  };
}

export async function createTaxConfiguration(
  userId: bigint,
  data: {
    cgstRate: number;
    sgstRate: number;
    igstRate: number;
    startDate: Date;
    endDate: Date;
  },
) {
  if (data.endDate < data.startDate) {
    throw new Error("BAD_REQUEST:End date must be on or after start date");
  }

  const organization = await requireOrganizationForUser(userId);
  const row = await prisma.gstTaxConfiguration.create({
    data: {
      organizationId: organization.id,
      cgstRate: new Prisma.Decimal(data.cgstRate),
      sgstRate: new Prisma.Decimal(data.sgstRate),
      igstRate: new Prisma.Decimal(data.igstRate),
      startDate: data.startDate,
      endDate: data.endDate,
    },
    select: taxConfigSelect,
  });
  return enrichTaxConfig(row);
}

export async function updateTaxConfiguration(
  userId: bigint,
  id: IdInput,
  data: Partial<{
    cgstRate: number;
    sgstRate: number;
    igstRate: number;
    startDate: Date;
    endDate: Date;
  }>,
) {
  const organization = await requireOrganizationForUser(userId);
  const configId = parseId(id);

  const existing = await prisma.gstTaxConfiguration.findFirst({
    where: { id: configId, organizationId: organization.id },
    select: taxConfigSelect,
  });
  if (!existing) throw new Error("NOT_FOUND");

  const startDate = data.startDate ?? existing.startDate;
  const endDate = data.endDate ?? existing.endDate;
  if (endDate < startDate) {
    throw new Error("BAD_REQUEST:End date must be on or after start date");
  }

  const row = await prisma.gstTaxConfiguration.update({
    where: { id: configId },
    data: {
      ...(data.cgstRate != null ? { cgstRate: new Prisma.Decimal(data.cgstRate) } : {}),
      ...(data.sgstRate != null ? { sgstRate: new Prisma.Decimal(data.sgstRate) } : {}),
      ...(data.igstRate != null ? { igstRate: new Prisma.Decimal(data.igstRate) } : {}),
      ...(data.startDate != null ? { startDate: data.startDate } : {}),
      ...(data.endDate != null ? { endDate: data.endDate } : {}),
    },
    select: taxConfigSelect,
  });
  return enrichTaxConfig(row);
}

export async function deleteTaxConfiguration(userId: bigint, id: IdInput) {
  const organization = await requireOrganizationForUser(userId);
  const configId = parseId(id);

  const existing = await prisma.gstTaxConfiguration.findFirst({
    where: { id: configId, organizationId: organization.id },
    select: { id: true },
  });
  if (!existing) throw new Error("NOT_FOUND");

  await prisma.gstTaxConfiguration.delete({ where: { id: configId } });
}

export async function resolveInvoiceTax(
  userId: bigint,
  input: {
    invoiceDate: Date;
    taxableValue: number;
    cess?: number;
    partyGstNumber?: string | null;
  },
) {
  const organization = await requireOrganizationForUser(userId);
  const active = await getActiveTaxConfiguration(userId, input.invoiceDate);
  if (!active) {
    throw new Error("BAD_REQUEST:No active tax configuration for this invoice date");
  }

  return calculateInvoiceTax({
    taxableValue: input.taxableValue,
    cess: input.cess,
    organizationGstNumber: organization.gstNumber,
    partyGstNumber: input.partyGstNumber,
    rates: {
      cgstRate: active.cgstRate,
      sgstRate: active.sgstRate,
      igstRate: active.igstRate,
    },
  });
}
