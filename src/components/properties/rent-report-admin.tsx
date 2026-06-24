"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { buttonPrimaryClass, inputClass } from "@/components/admin/ui";
import { useCachedFetch } from "@/hooks/use-cached-fetch";
import { getFinancialQuarter, getFinancialYearStart } from "@/lib/gst/report-periods";
import { formatMoney } from "@/lib/properties/payment-calculations";
import type {
  RentReportCollectionRow,
  RentReportComponents,
  RentReportResult,
} from "@/lib/properties/rent-reports";

type PeriodMode = "monthly" | "quarterly" | "yearly" | "custom";

type TenantOption = {
  id: string;
  firstName: string;
  lastName: string;
};

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

function tenantName(row: { firstName: string; lastName: string }) {
  return `${row.firstName} ${row.lastName}`;
}

function componentRows(components: RentReportComponents) {
  return [
    { label: "Base rent", value: components.baseRent },
    { label: "Electricity", value: components.electricity },
    { label: "Gas", value: components.gas },
    { label: "Cleaning", value: components.cleaning },
    { label: "Maintenance", value: components.maintenance },
    { label: "Misc", value: components.misc },
    { label: "Prior balance", value: components.priorBalance },
    { label: "Total", value: components.total, emphasis: true },
  ];
}

function ComponentBreakdownTable({
  title,
  subtitle,
  components,
}: {
  title: string;
  subtitle?: string;
  components: RentReportComponents;
}) {
  const rows = componentRows(components);

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-slate-400">{subtitle}</p> : null}
        <p className="mt-1 text-xs text-slate-500">{components.billCount} bill(s)</p>
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

function CollectionTable({
  title,
  rows,
  total,
}: {
  title: string;
  rows: RentReportCollectionRow[];
  total: number;
}) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <p className="mt-1 text-xs text-slate-500">Payments received in the selected period</p>
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
                  No payments in this period.
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

export function RentReportAdmin() {
  const now = new Date();
  const initialMonth = parseMonthValue(currentMonthValue());
  const [mode, setMode] = useState<PeriodMode>("monthly");
  const [monthYear, setMonthYear] = useState(initialMonth.year);
  const [monthNumber, setMonthNumber] = useState(initialMonth.month);
  const [year, setYear] = useState(String(getFinancialYearStart(now)));
  const [quarter, setQuarter] = useState(String(getFinancialQuarter(now)));
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [tenantId, setTenantId] = useState("");

  const { data: tenants = [] } = useCachedFetch<TenantOption[]>("/api/tenants");

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
    if (tenantId) params.set("tenantId", tenantId);
    return params.toString();
  }, [mode, month, year, quarter, dateFrom, dateTo, tenantId]);

  const reportEnabled = mode !== "custom" || Boolean(dateFrom && dateTo);
  const reportUrl = `/api/rent/reports?${queryString}`;

  const {
    data: report,
    loading,
    error: fetchError,
    reload,
  } = useCachedFetch<RentReportResult>(reportUrl, { enabled: reportEnabled });

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Rent Report</h1>
          <p className="mt-2 text-slate-400">
            Rent billed by period, collections by account and payment mode, leases expiring soon,
            and pending payment status.
          </p>
        </div>
        {report?.hasPendingRent ? (
          <Link
            href="/payments"
            className={`${buttonPrimaryClass} inline-flex items-center`}
          >
            {report.pendingRentCount} pending rent bill
            {report.pendingRentCount === 1 ? "" : "s"} — go to Payments
          </Link>
        ) : null}
      </div>

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
                  ? "bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-500/40"
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
          <div>
            <label className="mb-1 block text-sm text-slate-300">Tenant (optional)</label>
            <select
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              className={inputClass}
            >
              <option value="">All tenants</option>
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenantName(tenant)}
                </option>
              ))}
            </select>
          </div>
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
      </div>

      {fetchError ? (
        <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {fetchError}
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

          {report.tenant && report.tenantRent ? (
            <ComponentBreakdownTable
              title={`Tenant rent — ${report.tenant.name}`}
              subtitle="Bills with period start in the selected range"
              components={report.tenantRent}
            />
          ) : null}

          <ComponentBreakdownTable
            title={report.tenant ? "Overall rent (all tenants)" : "Overall rent"}
            subtitle="All bills with period start in the selected range"
            components={report.overallRent}
          />

          <div className="grid gap-6 lg:grid-cols-2">
            <CollectionTable
              title="Received by account name"
              rows={report.collections.byAccountName}
              total={report.collections.totalReceived}
            />
            <CollectionTable
              title="Received by payment mode"
              rows={report.collections.byMode}
              total={report.collections.totalReceived}
            />
          </div>

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-lg font-semibold text-white">Leases expiring within 2 months</h2>
            <p className="mt-1 text-sm text-slate-400">
              Active assignments with a lease end date in the next two months.
            </p>
            <div className="mt-4 overflow-x-auto rounded-xl border border-slate-800">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-950 text-left text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Tenant</th>
                    <th className="px-4 py-3">Unit</th>
                    <th className="px-4 py-3">Lease to</th>
                    <th className="px-4 py-3">Monthly rent</th>
                  </tr>
                </thead>
                <tbody>
                  {report.expiringLeases.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                        No leases expiring in the next two months.
                      </td>
                    </tr>
                  ) : (
                    report.expiringLeases.map((row) => (
                      <tr key={`${row.tenantId}-${row.unitNumber}-${row.leaseTo}`} className="border-t border-slate-800">
                        <td className="px-4 py-3 text-slate-200">{row.tenantName}</td>
                        <td className="px-4 py-3">{row.unitNumber}</td>
                        <td className="px-4 py-3">{row.leaseTo}</td>
                        <td className="px-4 py-3">
                          {row.monthlyRent != null ? formatMoney(row.monthlyRent) : "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
