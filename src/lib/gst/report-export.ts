import ExcelJS from "exceljs";
import type { GstReportExportData } from "@/lib/gst/reports";

const INVOICE_HEADERS = [
  "Type",
  "Invoice #",
  "Date",
  "GST #",
  "Trade Name",
  "Party / Customer",
  "Taxable Value",
  "CGST",
  "SGST",
  "IGST",
  "Cess",
  "Total Tax",
  "Grand Total",
  "Payment Status",
] as const;

const COLUMN_WIDTHS = [12, 16, 12, 18, 20, 24, 14, 10, 10, 10, 10, 12, 14, 14];

function invoiceTypeLabel(type: string) {
  if (type === "B2B_SALE") return "B2B Sale";
  if (type === "B2C_SALE") return "B2C Sale";
  if (type === "PURCHASE") return "Purchase";
  return type;
}

function invoiceToRow(row: GstReportExportData["salesInvoices"][number]) {
  return [
    invoiceTypeLabel(row.invoiceType),
    row.invoiceNumber,
    row.invoiceDate,
    row.gstNumber ?? "",
    row.tradeName ?? row.customerName ?? "",
    row.customerName ?? "",
    row.taxableValue,
    row.cgst,
    row.sgst,
    row.igst,
    row.cess,
    row.totalTax,
    row.grandTotal,
    row.paymentStatus,
  ];
}

function totalsRow(label: string, data: GstReportExportData["sales"]) {
  return [
    label,
    "",
    "",
    "",
    "",
    "",
    data.taxableValue,
    data.cgst,
    data.sgst,
    data.igst,
    data.cess,
    data.totalTax,
    data.grandTotal,
    "",
  ];
}

export async function buildGstReportWorkbook(data: GstReportExportData) {
  const rows: (string | number)[][] = [
    ["GST Report"],
    ["Organization", data.organizationName],
    ["Period", data.period.label],
    ["From", data.period.startDate],
    ["To", data.period.endDate],
    [],
    ["SALES (B2B + B2C)"],
    [...INVOICE_HEADERS],
    ...data.salesInvoices.map(invoiceToRow),
    totalsRow("Sales Total", data.sales),
    [],
    ["PURCHASE"],
    [...INVOICE_HEADERS],
    ...data.purchaseInvoices.map(invoiceToRow),
    totalsRow("Purchase Total", data.purchase),
    [],
    ["SUMMARY"],
    ["Total Sales", data.sales.grandTotal],
    ["Total Purchase", data.purchase.grandTotal],
    ["Difference (Sales − Purchase)", data.insight.difference],
    ["Sales below purchase", data.insight.salesBelowPurchase ? "Yes" : "No"],
  ];

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("GST Report");

  for (const row of rows) {
    worksheet.addRow(row);
  }

  worksheet.columns = COLUMN_WIDTHS.map((width) => ({ width }));

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export function gstReportExportFilename(data: GstReportExportData) {
  return `gst-report-${data.period.startDate}-to-${data.period.endDate}.xlsx`;
}
