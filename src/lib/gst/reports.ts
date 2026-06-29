import type { GstInvoiceType, PaymentAccountName, PaymentMode } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { toMoney } from "@/lib/gst/tax-calculations";
import { requireOrganizationForUser } from "@/lib/gst/organizations";
import { resolveReportDateRange, type ReportPeriodMode } from "@/lib/gst/report-periods";
import {
  paymentAccountNameLabel,
  paymentModeLabel,
  type PaymentAccountNameValue,
  type PaymentModeValue,
} from "@/lib/properties/payment-calculations";

export type GstReportBreakdown = {
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  totalTax: number;
  grandTotal: number;
  invoiceCount: number;
};

export type GstReportPaymentRow = {
  key: string;
  label: string;
  amount: number;
};

export type GstReportPaymentSummary = {
  totalPaid: number;
  paymentCount: number;
  byAccountName: GstReportPaymentRow[];
  byMode: GstReportPaymentRow[];
  byInvoiceType: GstReportPaymentRow[];
};

export type GstReportResult = {
  period: {
    mode: ReportPeriodMode;
    startDate: string;
    endDate: string;
    label: string;
  };
  sales: GstReportBreakdown;
  salesB2b: GstReportBreakdown;
  salesB2c: GstReportBreakdown;
  purchase: GstReportBreakdown;
  salesPayments: GstReportPaymentSummary;
  purchasePayments: GstReportPaymentSummary;
  insight: {
    salesGrandTotal: number;
    purchaseGrandTotal: number;
    difference: number;
    salesBelowPurchase: boolean;
  };
};

const emptyBreakdown = (): GstReportBreakdown => ({
  taxableValue: 0,
  cgst: 0,
  sgst: 0,
  igst: 0,
  cess: 0,
  totalTax: 0,
  grandTotal: 0,
  invoiceCount: 0,
});

type MoneyField = string | number | { toString(): string } | null | undefined;

function sumBreakdown(
  invoices: Array<{
    taxableValue: MoneyField;
    cgst: MoneyField;
    sgst: MoneyField;
    igst: MoneyField;
    cess: MoneyField;
    totalTaxAmount: MoneyField;
    invoiceValue: MoneyField;
  }>,
): GstReportBreakdown {
  return invoices.reduce((acc, row) => {
    acc.taxableValue += toMoney(row.taxableValue);
    acc.cgst += toMoney(row.cgst);
    acc.sgst += toMoney(row.sgst);
    acc.igst += toMoney(row.igst);
    acc.cess += toMoney(row.cess);
    acc.totalTax += toMoney(row.totalTaxAmount);
    acc.grandTotal += toMoney(row.invoiceValue);
    acc.invoiceCount += 1;
    return acc;
  }, emptyBreakdown());
}

function combineBreakdowns(...parts: GstReportBreakdown[]): GstReportBreakdown {
  return parts.reduce((acc, part) => {
    acc.taxableValue += part.taxableValue;
    acc.cgst += part.cgst;
    acc.sgst += part.sgst;
    acc.igst += part.igst;
    acc.cess += part.cess;
    acc.totalTax += part.totalTax;
    acc.grandTotal += part.grandTotal;
    acc.invoiceCount += part.invoiceCount;
    return acc;
  }, emptyBreakdown());
}

function gstInvoiceTypeLabel(type: GstInvoiceType) {
  if (type === "B2B_SALE") return "B2B Sale";
  if (type === "B2C_SALE") return "B2C Sale";
  return "Purchase";
}

function mapTotalsToRows<T extends string>(
  totals: Map<T, number>,
  labelFor: (key: T) => string,
): GstReportPaymentRow[] {
  return [...totals.entries()]
    .map(([key, amount]) => ({
      key,
      label: labelFor(key),
      amount,
    }))
    .sort((a, b) => b.amount - a.amount);
}

function aggregateGstPayments(
  payments: Array<{
    amount: MoneyField;
    mode: PaymentMode;
    accountName: PaymentAccountName;
    invoice: { invoiceType: GstInvoiceType };
  }>,
): GstReportPaymentSummary {
  const accountTotals = new Map<PaymentAccountNameValue, number>();
  const modeTotals = new Map<PaymentModeValue, number>();
  const invoiceTypeTotals = new Map<GstInvoiceType, number>();
  let totalPaid = 0;

  for (const payment of payments) {
    const amount = toMoney(payment.amount);
    totalPaid += amount;
    accountTotals.set(
      payment.accountName,
      (accountTotals.get(payment.accountName) ?? 0) + amount,
    );
    modeTotals.set(payment.mode, (modeTotals.get(payment.mode) ?? 0) + amount);
    invoiceTypeTotals.set(
      payment.invoice.invoiceType,
      (invoiceTypeTotals.get(payment.invoice.invoiceType) ?? 0) + amount,
    );
  }

  return {
    totalPaid,
    paymentCount: payments.length,
    byAccountName: mapTotalsToRows(accountTotals, paymentAccountNameLabel),
    byMode: mapTotalsToRows(modeTotals, paymentModeLabel),
    byInvoiceType: mapTotalsToRows(invoiceTypeTotals, gstInvoiceTypeLabel),
  };
}

const emptyPaymentSummary = (): GstReportPaymentSummary => ({
  totalPaid: 0,
  paymentCount: 0,
  byAccountName: [],
  byMode: [],
  byInvoiceType: [],
});

async function paymentSummariesForPeriod(
  organizationId: bigint,
  startDate: Date,
  endDate: Date,
) {
  const payments = await prisma.gstPayment.findMany({
    where: {
      organizationId,
      paidAt: { gte: startDate, lte: endDate },
    },
    select: {
      amount: true,
      mode: true,
      accountName: true,
      invoice: { select: { invoiceType: true } },
    },
  });

  const salesPayments = payments.filter((payment) =>
    payment.invoice.invoiceType === "B2B_SALE" || payment.invoice.invoiceType === "B2C_SALE",
  );
  const purchasePayments = payments.filter(
    (payment) => payment.invoice.invoiceType === "PURCHASE",
  );

  return {
    salesPayments: salesPayments.length
      ? aggregateGstPayments(salesPayments)
      : emptyPaymentSummary(),
    purchasePayments: purchasePayments.length
      ? aggregateGstPayments(purchasePayments)
      : emptyPaymentSummary(),
  };
}

async function listInvoicesForReport(
  organizationId: bigint,
  invoiceTypes: GstInvoiceType[],
  startDate: Date,
  endDate: Date,
) {
  const invoices = await prisma.gstInvoice.findMany({
    where: {
      organizationId,
      invoiceType: { in: invoiceTypes },
      invoiceDate: { gte: startDate, lte: endDate },
    },
    select: {
      invoiceType: true,
      invoiceNumber: true,
      invoiceDate: true,
      gstNumber: true,
      tradeName: true,
      customerName: true,
      taxableValue: true,
      cgst: true,
      sgst: true,
      igst: true,
      cess: true,
      totalTaxAmount: true,
      invoiceValue: true,
      paymentStatus: true,
    },
    orderBy: [{ invoiceDate: "asc" }, { invoiceNumber: "asc" }],
  });

  return invoices.map((row) => ({
    invoiceType: row.invoiceType,
    invoiceNumber: row.invoiceNumber,
    invoiceDate: row.invoiceDate.toISOString().slice(0, 10),
    gstNumber: row.gstNumber,
    tradeName: row.tradeName,
    customerName: row.customerName,
    taxableValue: toMoney(row.taxableValue),
    cgst: toMoney(row.cgst),
    sgst: toMoney(row.sgst),
    igst: toMoney(row.igst),
    cess: toMoney(row.cess),
    totalTax: toMoney(row.totalTaxAmount),
    grandTotal: toMoney(row.invoiceValue),
    paymentStatus: row.paymentStatus,
  }));
}

export type GstReportInvoiceRow = Awaited<
  ReturnType<typeof listInvoicesForReport>
>[number];

export type GstReportExportData = GstReportResult & {
  organizationName: string;
  salesInvoices: GstReportInvoiceRow[];
  purchaseInvoices: GstReportInvoiceRow[];
};

async function breakdownForTypes(
  organizationId: bigint,
  invoiceTypes: GstInvoiceType[],
  startDate: Date,
  endDate: Date,
) {
  const invoices = await prisma.gstInvoice.findMany({
    where: {
      organizationId,
      invoiceType: { in: invoiceTypes },
      invoiceDate: { gte: startDate, lte: endDate },
    },
    select: {
      taxableValue: true,
      cgst: true,
      sgst: true,
      igst: true,
      cess: true,
      totalTaxAmount: true,
      invoiceValue: true,
    },
  });
  return sumBreakdown(invoices);
}

export async function getGstReport(
  userId: bigint,
  input: {
    mode: ReportPeriodMode;
    month?: string;
    year?: number;
    quarter?: number;
    dateFrom?: string;
    dateTo?: string;
  },
): Promise<GstReportResult> {
  const organization = await requireOrganizationForUser(userId);
  const range = resolveReportDateRange(input);

  const [salesB2b, salesB2c, purchase, paymentSummaries] = await Promise.all([
    breakdownForTypes(organization.id, ["B2B_SALE"], range.startDate, range.endDate),
    breakdownForTypes(organization.id, ["B2C_SALE"], range.startDate, range.endDate),
    breakdownForTypes(organization.id, ["PURCHASE"], range.startDate, range.endDate),
    paymentSummariesForPeriod(organization.id, range.startDate, range.endDate),
  ]);

  const sales = combineBreakdowns(salesB2b, salesB2c);
  const salesGrandTotal = sales.grandTotal;
  const purchaseGrandTotal = purchase.grandTotal;
  const difference = salesGrandTotal - purchaseGrandTotal;

  return {
    period: {
      mode: input.mode,
      startDate: range.startDate.toISOString().slice(0, 10),
      endDate: range.endDate.toISOString().slice(0, 10),
      label: range.label,
    },
    sales,
    salesB2b,
    salesB2c,
    purchase,
    salesPayments: paymentSummaries.salesPayments,
    purchasePayments: paymentSummaries.purchasePayments,
    insight: {
      salesGrandTotal,
      purchaseGrandTotal,
      difference,
      salesBelowPurchase: salesGrandTotal < purchaseGrandTotal,
    },
  };
}

export async function getGstReportExportData(
  userId: bigint,
  input: {
    mode: ReportPeriodMode;
    month?: string;
    year?: number;
    quarter?: number;
    dateFrom?: string;
    dateTo?: string;
  },
): Promise<GstReportExportData> {
  const organization = await requireOrganizationForUser(userId);
  const range = resolveReportDateRange(input);
  const report = await getGstReport(userId, input);

  const [salesInvoices, purchaseInvoices] = await Promise.all([
    listInvoicesForReport(
      organization.id,
      ["B2B_SALE", "B2C_SALE"],
      range.startDate,
      range.endDate,
    ),
    listInvoicesForReport(organization.id, ["PURCHASE"], range.startDate, range.endDate),
  ]);

  return {
    ...report,
    organizationName: organization.name,
    salesInvoices,
    purchaseInvoices,
  };
}
