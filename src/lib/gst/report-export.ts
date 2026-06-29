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

function paymentBreakupRows(
  title: string,
  summary: GstReportExportData["salesPayments"],
  sections: Array<{
    heading: string;
    rows: GstReportExportData["salesPayments"]["byAccountName"];
  }>,
) {
  const output: (string | number)[][] = [[title], ["Total paid", summary.totalPaid], ["Payment count", summary.paymentCount], []];

  for (const section of sections) {
    output.push([section.heading], ["Name", "Amount"]);
    for (const row of section.rows) {
      output.push([row.label, row.amount]);
    }
    output.push(["Total", summary.totalPaid], []);
  }

  return output;
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
    ...paymentBreakupRows("SALES PAYMENTS", data.salesPayments, [
      { heading: "By invoice type", rows: data.salesPayments.byInvoiceType },
      { heading: "By account", rows: data.salesPayments.byAccountName },
      { heading: "By payment mode", rows: data.salesPayments.byMode },
    ]),
    ...paymentBreakupRows("PURCHASE PAYMENTS", data.purchasePayments, [
      { heading: "By account", rows: data.purchasePayments.byAccountName },
      { heading: "By payment mode", rows: data.purchasePayments.byMode },
    ]),
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
