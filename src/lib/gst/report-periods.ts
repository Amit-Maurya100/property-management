export type ReportPeriodMode = "monthly" | "quarterly" | "yearly" | "custom";

export type ReportDateRange = {
  startDate: Date;
  endDate: Date;
  label: string;
};

function utcDate(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month, day));
}

function formatIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function monthName(monthIndex: number) {
  return new Date(Date.UTC(2000, monthIndex, 1)).toLocaleString("en-IN", {
    month: "long",
    timeZone: "UTC",
  });
}

export function formatFinancialYearLabel(fyStartYear: number) {
  return `FY ${fyStartYear}-${String(fyStartYear + 1).slice(-2)}`;
}

/** April-start financial year containing the given date. */
export function getFinancialYearStart(forDate: Date = new Date()) {
  const month = forDate.getUTCMonth();
  const year = forDate.getUTCFullYear();
  return month < 3 ? year - 1 : year;
}

/** Indian financial quarter: Q1 Apr–Jun, Q2 Jul–Sep, Q3 Oct–Dec, Q4 Jan–Mar. */
export function getFinancialQuarter(forDate: Date = new Date()) {
  const month = forDate.getUTCMonth();
  if (month >= 3 && month <= 5) return 1;
  if (month >= 6 && month <= 8) return 2;
  if (month >= 9 && month <= 11) return 3;
  return 4;
}

const FINANCIAL_QUARTER_LABELS = ["Apr – Jun", "Jul – Sep", "Oct – Dec", "Jan – Mar"] as const;

function resolveFinancialQuarterRange(fyStartYear: number, quarter: number): ReportDateRange {
  const ranges = [
    { start: utcDate(fyStartYear, 3, 1), end: utcDate(fyStartYear, 6, 0) },
    { start: utcDate(fyStartYear, 6, 1), end: utcDate(fyStartYear, 9, 0) },
    { start: utcDate(fyStartYear, 9, 1), end: utcDate(fyStartYear, 12, 0) },
    { start: utcDate(fyStartYear + 1, 0, 1), end: utcDate(fyStartYear + 1, 3, 0) },
  ] as const;

  const range = ranges[quarter - 1];
  const fyLabel = formatFinancialYearLabel(fyStartYear);

  return {
    startDate: range.start,
    endDate: range.end,
    label: `Q${quarter} ${fyLabel} (${FINANCIAL_QUARTER_LABELS[quarter - 1]})`,
  };
}

function resolveFinancialYearRange(fyStartYear: number): ReportDateRange {
  return {
    startDate: utcDate(fyStartYear, 3, 1),
    endDate: utcDate(fyStartYear + 1, 3, 0),
    label: `${formatFinancialYearLabel(fyStartYear)} (Apr – Mar)`,
  };
}

export function resolveReportDateRange(input: {
  mode: ReportPeriodMode;
  month?: string;
  year?: number;
  quarter?: number;
  dateFrom?: string;
  dateTo?: string;
}): ReportDateRange {
  if (input.mode === "custom") {
    if (!input.dateFrom || !input.dateTo) {
      throw new Error("BAD_REQUEST:dateFrom and dateTo are required for custom period");
    }
    if (input.dateFrom > input.dateTo) {
      throw new Error("BAD_REQUEST:dateFrom must be on or before dateTo");
    }
    return {
      startDate: utcDate(
        Number(input.dateFrom.slice(0, 4)),
        Number(input.dateFrom.slice(5, 7)) - 1,
        Number(input.dateFrom.slice(8, 10)),
      ),
      endDate: utcDate(
        Number(input.dateTo.slice(0, 4)),
        Number(input.dateTo.slice(5, 7)) - 1,
        Number(input.dateTo.slice(8, 10)),
      ),
      label: `${input.dateFrom} to ${input.dateTo}`,
    };
  }

  if (input.mode === "monthly") {
    if (!input.month || !/^\d{4}-\d{2}$/.test(input.month)) {
      throw new Error("BAD_REQUEST:month must be YYYY-MM");
    }
    const year = Number(input.month.slice(0, 4));
    const month = Number(input.month.slice(5, 7)) - 1;
    const startDate = utcDate(year, month, 1);
    const endDate = utcDate(year, month + 1, 0);
    return {
      startDate,
      endDate,
      label: `${monthName(month)} ${year}`,
    };
  }

  if (input.mode === "quarterly") {
    if (!input.year || !input.quarter || input.quarter < 1 || input.quarter > 4) {
      throw new Error("BAD_REQUEST:year and quarter (1-4) are required");
    }
    return resolveFinancialQuarterRange(input.year, input.quarter);
  }

  if (!input.year) {
    throw new Error("BAD_REQUEST:year is required");
  }
  return resolveFinancialYearRange(input.year);
}

export { formatIsoDate };
