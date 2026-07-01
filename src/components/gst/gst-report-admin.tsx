"use client";

import { useMemo, useState } from "react";
import { buttonPrimaryClass, buttonSecondaryClass, inputClass } from "@/components/admin/ui";
import { useCachedFetch } from "@/hooks/use-cached-fetch";
import { readApiError } from "@/lib/api/parse-response";
import { getFinancialQuarter, getFinancialYearStart } from "@/lib/gst/report-periods";
import { formatMoney } from "@/lib/properties/payment-calculations";
import type { GstReportBreakdown, GstReportPaymentRow, GstReportPaymentSummary, GstReportResult } from "@/lib/gst/reports";

type PeriodMode = "monthly" | "quarterly" | "yearly" | "custom";

function SalesPurchaseInsight({ report }: { report: GstReportResult }) {
  const { insight } = report;
  const isRedFlag = insight.salesBelowPurchase;

  return (
    <section
      className={`rounded-2xl border p-6 ${
        isRedFlag
          ? "border-red-500/40 bg-red-500/10"
          : "border-emerald-500/30 bg-emerald-500/5"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Sales vs Purchase insight</h2>
          <p className="mt-1 text-sm text-slate-400">
            Difference = Total Sales (B2B + B2C) − Total Purchase
          </p>
        </div>
        {isRedFlag ? (
          <span className="inline-flex items-center gap-2 rounded-full border border-red-500/50 bg-red-500/20 px-3 py-1 text-sm font-medium text-red-200">
            <span aria-hidden="true">🚩</span>
            Red flag: Sales below purchase
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-200">
            Sales meet or exceed purchase
          </span>
        )}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
          <p className="text-sm text-slate-400">Total sales</p>
          <p className="mt-1 text-2xl font-semibold text-white">
            {formatMoney(insight.salesGrandTotal)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
          <p className="text-sm text-slate-400">Total purchase</p>
          <p className="mt-1 text-2xl font-semibold text-white">
            {formatMoney(insight.purchaseGrandTotal)}
          </p>
        </div>
        <div
          className={`rounded-xl border p-4 ${
            isRedFlag
              ? "border-red-500/40 bg-red-500/10"
              : "border-emerald-500/30 bg-emerald-500/10"
          }`}
        >
          <p className="text-sm text-slate-400">Difference</p>
          <p
            className={`mt-1 text-2xl font-semibold ${
              isRedFlag ? "text-red-200" : "text-emerald-200"
            }`}
          >
            {insight.difference >= 0 ? "+" : ""}
            {formatMoney(insight.difference)}
          </p>
        </div>
      </div>

      {isRedFlag ? (
        <p className="mt-4 text-sm text-red-200">
          Purchase exceeds sales for this period. Review purchases, verify input credits, and check
          whether sales invoices are fully recorded.
        </p>
      ) : (
        <p className="mt-4 text-sm text-emerald-200/90">
          Sales are at or above purchase for this period.
        </p>
      )}
    </section>
  );
}

const PERIOD_MODES: { value: PeriodMode; label: string }[] = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
  { value: "custom", label: "Custom dates" },
];

const CALENDAR_MONTHS = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
] as const;

function currentMonthValue() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${now.getFullYear()}-${month}`;
}

function parseMonthValue(value: string) {
  const [year, month] = value.split("-");
  return {
    year: year ?? String(new Date().getFullYear()),
    month: month ?? "01",
  };
}

function calendarYearOptions() {
  const currentYear = new Date().getFullYear();
  const years: string[] = [];
  for (let year = currentYear + 1; year >= 2000; year -= 1) {
    years.push(String(year));
  }
  return years;
}

function BreakdownTable({
  title,
  breakdown,
  subtitle,
}: {
  title: string;
  breakdown: GstReportBreakdown;
  subtitle?: string;
}) {
  const rows = [
    { label: "Taxable value", value: breakdown.taxableValue },
    { label: "CGST", value: breakdown.cgst },
    { label: "SGST", value: breakdown.sgst },
    { label: "IGST", value: breakdown.igst },
    { label: "Cess", value: breakdown.cess },
    { label: "Total tax", value: breakdown.totalTax },
    { label: "Grand total", value: breakdown.grandTotal, emphasis: true },
  ];

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-slate-400">{subtitle}</p> : null}
        <p className="mt-1 text-xs text-slate-500">{breakdown.invoiceCount} invoice(s)</p>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="min-w-full text-sm">
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-t border-slate-800 first:border-t-0">
                <td
                  className={`px-4 py-3 ${row.emphasis ? "font-semibold text-emerald-200" : "text-slate-300"}`}
                >
                  {row.label}
                </td>
                <td
                  className={`px-4 py-3 text-right ${row.emphasis ? "text-lg font-semibold text-emerald-100" : "text-slate-100"}`}
                >
                  {formatMoney(row.value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function PaymentBreakupTable({
  title,
  rows,
  total,
  emptyMessage = "No payments in this period.",
}: {
  title: string;
  rows: GstReportPaymentRow[];
  total: number;
  emptyMessage?: string;
}) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <h3 className="text-base font-semibold text-white">{title}</h3>
      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-800">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-950 text-left text-slate-400">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-4 py-6 text-center text-slate-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.key} className="border-t border-slate-800">
                  <td className="px-4 py-3 text-slate-200">{row.label}</td>
                  <td className="px-4 py-3 text-right text-slate-100">{formatMoney(row.amount)}</td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot className="border-t border-slate-700 bg-slate-950/60">
            <tr>
              <td className="px-4 py-3 font-semibold text-emerald-200">Total</td>
              <td className="px-4 py-3 text-right text-lg font-semibold text-emerald-100">
                {formatMoney(total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}

function PaymentSummarySection({
  title,
  subtitle,
  summary,
  showInvoiceTypeBreakup,
}: {
  title: string;
  subtitle: string;
  summary: GstReportPaymentSummary;
  showInvoiceTypeBreakup?: boolean;
}) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
        <p className="mt-1 text-xs text-slate-500">
          {summary.paymentCount} payment(s) · Total {formatMoney(summary.totalPaid)}
        </p>
      </div>
      <div className={`grid gap-6 ${showInvoiceTypeBreakup ? "lg:grid-cols-3" : "lg:grid-cols-2"}`}>
        {showInvoiceTypeBreakup ? (
          <PaymentBreakupTable
            title="By invoice type"
            rows={summary.byInvoiceType}
            total={summary.totalPaid}
          />
        ) : null}
        <PaymentBreakupTable
          title="By account"
          rows={summary.byAccountName}
          total={summary.totalPaid}
        />
        <PaymentBreakupTable
          title="By payment mode"
          rows={summary.byMode}
          total={summary.totalPaid}
        />
      </div>
    </section>
  );
}

export function GstReportAdmin() {
  const now = new Date();
  const initialMonth = parseMonthValue(currentMonthValue());
  const [mode, setMode] = useState<PeriodMode>("monthly");
  const [monthYear, setMonthYear] = useState(initialMonth.year);
  const [monthNumber, setMonthNumber] = useState(initialMonth.month);
  const [year, setYear] = useState(String(getFinancialYearStart(now)));
  const [quarter, setQuarter] = useState(String(getFinancialQuarter(now)));
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const month = useMemo(() => `${monthYear}-${monthNumber}`, [monthYear, monthNumber]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams({ mode });
    if (mode === "monthly") params.set("month", month);
    if (mode === "quarterly") {
      params.set("year", year);
      params.set("quarter", quarter);
    }
    if (mode === "yearly") params.set("year", year);
    if (mode === "custom") {
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
    }
    return params.toString();
  }, [mode, month, year, quarter, dateFrom, dateTo]);

  const reportEnabled = mode !== "custom" || Boolean(dateFrom && dateTo);
  const reportUrl = `/api/gst/reports?${queryString}`;

  const {
    data: report,
    loading,
    error: fetchError,
    reload,
  } = useCachedFetch<GstReportResult>(reportUrl, { enabled: reportEnabled });

  async function downloadExcel() {
    if (mode === "custom" && (!dateFrom || !dateTo)) {
      setError("Select both from and to dates before downloading.");
      return;
    }

    setDownloading(true);
    setError(null);
    try {
      const res = await fetch(`/api/gst/reports/export?${queryString}`);
      if (!res.ok) throw new Error(await readApiError(res));

      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match?.[1] ?? "gst-report.xlsx";
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to download report");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-semibold">GST Report</h1>
      <p className="mt-2 text-slate-400">
        Total sales combine B2B and B2C invoices. Quarters and yearly periods follow the Indian
        financial year (Apr – Mar).
      </p>

      <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-lg font-medium">Report period</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {PERIOD_MODES.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setMode(option.value)}
              className={`rounded-lg px-4 py-2 text-sm transition ${
                mode === option.value
                  ? "bg-violet-500/20 text-violet-200 ring-1 ring-violet-500/40"
                  : "bg-slate-950 text-slate-300 hover:bg-slate-800"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {mode === "monthly" ? (
            <>
              <div>
                <label className="mb-1 block text-sm text-slate-300">Month</label>
                <select
                  value={monthNumber}
                  onChange={(e) => setMonthNumber(e.target.value)}
                  className={inputClass}
                >
                  {CALENDAR_MONTHS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-300">Year</label>
                <select
                  value={monthYear}
                  onChange={(e) => setMonthYear(e.target.value)}
                  className={inputClass}
                >
                  {calendarYearOptions().map((optionYear) => (
                    <option key={optionYear} value={optionYear}>
                      {optionYear}
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : null}
          {mode === "quarterly" ? (
            <>
              <div>
                <label className="mb-1 block text-sm text-slate-300">
                  Financial year (Apr start)
                </label>
                <input
                  type="number"
                  min="2000"
                  max="2100"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className={inputClass}
                />
                <p className="mt-1 text-xs text-slate-500">
                  e.g. 2025 for FY 2025-26 (Apr 2025 – Mar 2026)
                </p>
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-300">Quarter</label>
                <select
                  value={quarter}
                  onChange={(e) => setQuarter(e.target.value)}
                  className={inputClass}
                >
                  <option value="1">Q1 (Apr – Jun)</option>
                  <option value="2">Q2 (Jul – Sep)</option>
                  <option value="3">Q3 (Oct – Dec)</option>
                  <option value="4">Q4 (Jan – Mar)</option>
                </select>
              </div>
            </>
          ) : null}
          {mode === "yearly" ? (
            <div>
              <label className="mb-1 block text-sm text-slate-300">
                Financial year (Apr start)
              </label>
              <input
                type="number"
                min="2000"
                max="2100"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className={inputClass}
              />
              <p className="mt-1 text-xs text-slate-500">
                Full year Apr 1 – Mar 31 (e.g. 2025 = FY 2025-26)
              </p>
            </div>
          ) : null}
          {mode === "custom" ? (
            <>
              <div>
                <label className="mb-1 block text-sm text-slate-300">From date</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-300">To date</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className={inputClass}
                />
              </div>
            </>
          ) : null}
        </div>

        {mode === "custom" ? (
          <button
            type="button"
            className={`${buttonPrimaryClass} mt-4`}
            disabled={loading || !dateFrom || !dateTo}
            onClick={() => void reload(true)}
          >
            {loading ? "Loading..." : "Apply dates"}
          </button>
        ) : null}

        <button
          type="button"
          className={`${buttonSecondaryClass} mt-4 ml-0 md:ml-3`}
          disabled={downloading || loading || (mode === "custom" && (!dateFrom || !dateTo))}
          onClick={() => void downloadExcel()}
        >
          {downloading ? "Preparing Excel..." : "Download Excel"}
        </button>
      </div>

      {(error || fetchError) ? (
        <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error ?? fetchError}
        </p>
      ) : null}

      {loading ? (
        <p className="mt-8 text-slate-400">Loading report...</p>
      ) : report ? (
        <div className="mt-8 space-y-6">
          <p className="text-sm text-slate-400">
            Period: <span className="text-slate-200">{report.period.label}</span> (
            {report.period.startDate} to {report.period.endDate})
          </p>

          <SalesPurchaseInsight report={report} />

          <BreakdownTable
            title="Total Sales"
            subtitle="B2B Sales + B2C Sales"
            breakdown={report.sales}
          />

          <div className="grid gap-6 lg:grid-cols-2">
            <BreakdownTable title="B2B Sales" breakdown={report.salesB2b} />
            <BreakdownTable title="B2C Sales" breakdown={report.salesB2c} />
          </div>

          <BreakdownTable title="Total Purchase" breakdown={report.purchase} />

          <PaymentSummarySection
            title="Sales payments"
            subtitle="Amount received against B2B and B2C invoices (by payment date in this period)"
            summary={report.salesPayments}
            showInvoiceTypeBreakup
          />

          <PaymentSummarySection
            title="Purchase payments"
            subtitle="Amount paid against purchase invoices (by payment date in this period)"
            summary={report.purchasePayments}
          />
        </div>
      ) : null}
    </div>
  );
}
