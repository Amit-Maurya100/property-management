import type { BuildingUtilityRateSnapshot } from "@/lib/properties/building-utility-types";

export function toNumber(value: string | number | null | undefined) {
  if (value == null || value === "") return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseIsoDateLocal(iso: string) {
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
  return new Date(year, month - 1, day);
}

/** End of a monthly rent period: same day next month minus one day. */
export function calcMonthlyPeriodEnd(fromDateIso: string) {
  const from = parseIsoDateLocal(fromDateIso);
  const end = new Date(from.getFullYear(), from.getMonth() + 1, from.getDate() - 1);
  return formatIsoDate(end);
}

export function addDaysIso(fromDateIso: string, days: number) {
  const date = parseIsoDateLocal(fromDateIso);
  date.setDate(date.getDate() + days);
  return formatIsoDate(date);
}

/**
 * Default "From" when recording monthly rent:
 * - After the latest rent period (day after its end), or
 * - Assignment lease from when no prior rent exists.
 */
export function calcDefaultRentPeriodStart(params: {
  latestRent?: {
    startDate: string;
    endDate?: string | null;
  } | null;
  leaseFrom?: string | null;
}) {
  if (params.latestRent) {
    const start = params.latestRent.startDate.slice(0, 10);
    const periodEnd = params.latestRent.endDate
      ? params.latestRent.endDate.slice(0, 10)
      : calcMonthlyPeriodEnd(start);
    return addDaysIso(periodEnd, 1);
  }

  if (params.leaseFrom) {
    return params.leaseFrom.slice(0, 10);
  }

  return "";
}

/** Due date = period start (From) plus configured days from tenant. */
export function calcDueDateFromPeriodStart(fromDateIso: string, daysAfterStart: number) {
  const from = parseIsoDateLocal(fromDateIso);
  from.setDate(from.getDate() + daysAfterStart);
  return formatIsoDate(from);
}

/** Lease end = 11 months after lease start, minus one day (11-month term). */
export function calcLeaseToFromLeaseFrom(leaseFromIso: string) {
  const from = parseIsoDateLocal(leaseFromIso);
  const leaseTo = new Date(from.getFullYear(), from.getMonth() + 11, from.getDate());
  leaseTo.setDate(leaseTo.getDate() - 1);
  return formatIsoDate(leaseTo);
}

/** Inclusive day count between two ISO dates (both endpoints count). */
export function calcInclusiveDays(startDateIso: string, endDateIso: string) {
  const start = parseIsoDateLocal(startDateIso);
  const end = parseIsoDateLocal(endDateIso);
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((end.getTime() - start.getTime()) / msPerDay) + 1;
}

/** Pro-rata base rent: (monthlyRent / 30) × days in period. */
export function calcProrataMonthlyRent(
  monthlyRent: number,
  startDateIso: string,
  endDateIso: string,
) {
  const days = calcInclusiveDays(startDateIso, endDateIso);
  if (days <= 0) return 0;
  return (monthlyRent / 30) * days;
}

export type ProrataPeriod = {
  startDateIso: string;
  endDateIso: string;
};

export function lastDayOfMonth(reference = new Date()) {
  const year = reference.getFullYear();
  const month = reference.getMonth();
  const day = new Date(year, month + 1, 0).getDate();
  return formatIsoDate(new Date(year, month, day));
}

export type UtilityBaseline = {
  electricityUnits: number;
  gasUnits: number;
};

export function parseUtilityBaseline(value: unknown): UtilityBaseline | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const electricityUnits = toNumber(record.electricityUnits as string | number | null | undefined);
  const gasUnits = toNumber(record.gasUnits as string | number | null | undefined);
  if (record.electricityUnits == null && record.gasUnits == null) return null;
  return { electricityUnits, gasUnits };
}

export function parseUtilityRateSnapshot(value: unknown): BuildingUtilityRateSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  return {
    electricityUnitRate: toNumber(record.electricityUnitRate as string | number | null | undefined),
    gasUnitRate: toNumber(record.gasUnitRate as string | number | null | undefined),
    cleaningCharge: toNumber(record.cleaningCharge as string | number | null | undefined),
  };
}

export function resolveUtilityBaselines(params: {
  assignment: {
    initialElectricityUnits?: string | number | null;
    initialGasUnits?: string | number | null;
  };
  monthlyBills: Array<{
    id?: string;
    startDate: string;
    electricityUnits?: string | number | null;
    gasUnits?: string | number | null;
    utilityBaseline?: unknown;
  }>;
  savedBaseline?: unknown;
  periodStartDate?: string;
  excludeRentId?: string;
}): UtilityBaseline & { source: "stored" | "assignment" | "prior_bill" } {
  const stored = parseUtilityBaseline(params.savedBaseline);
  if (stored) {
    return { ...stored, source: "stored" };
  }

  const bills = params.monthlyBills
    .filter((bill) => !params.excludeRentId || bill.id !== params.excludeRentId)
    .sort((a, b) => b.startDate.localeCompare(a.startDate));

  const priorBill = params.periodStartDate
    ? bills.find((bill) => bill.startDate.slice(0, 10) < params.periodStartDate!.slice(0, 10))
    : bills[0];

  if (
    priorBill &&
    (priorBill.electricityUnits != null || priorBill.gasUnits != null)
  ) {
    return {
      electricityUnits: toNumber(priorBill.electricityUnits),
      gasUnits: toNumber(priorBill.gasUnits),
      source: "prior_bill",
    };
  }

  return {
    electricityUnits:
      params.assignment.initialElectricityUnits != null
        ? toNumber(params.assignment.initialElectricityUnits)
        : 0,
    gasUnits:
      params.assignment.initialGasUnits != null
        ? toNumber(params.assignment.initialGasUnits)
        : 0,
    source: "assignment",
  };
}

/** @deprecated Use resolveUtilityBaselines */
export function resolveLiveUtilityBaselines(input: {
  assignment: {
    initialElectricityUnits?: string | number | null;
    initialGasUnits?: string | number | null;
  };
  previousBills: Array<{
    electricityUnits?: string | number | null;
    gasUnits?: string | number | null;
  }>;
}) {
  const resolved = resolveUtilityBaselines({
    assignment: input.assignment,
    monthlyBills: input.previousBills.map((bill) => ({
      startDate: "",
      ...bill,
    })),
  });
  return {
    electricityUnits: resolved.electricityUnits,
    gasUnits: resolved.gasUnits,
  };
}

export function firstDayOfMonth(reference = new Date()) {
  const year = reference.getFullYear();
  const month = String(reference.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
}

export function calcDueDate(monthlyDueDay: number, fromDateIso: string) {
  return calcDueDateFromPeriodStart(fromDateIso, monthlyDueDay);
}

export function calcRentBreakdown(input: {
  monthlyRent: number;
  electricityUnits: number;
  gasUnits: number;
  baselineElectricityUnits: number;
  baselineGasUnits: number;
  maintenance: number;
  misc: number;
  rates: BuildingUtilityRateSnapshot;
  prorataPeriod?: ProrataPeriod;
}) {
  const prorataDays =
    input.prorataPeriod != null
      ? calcInclusiveDays(input.prorataPeriod.startDateIso, input.prorataPeriod.endDateIso)
      : null;
  const effectiveMonthlyRent =
    input.prorataPeriod != null
      ? calcProrataMonthlyRent(
          input.monthlyRent,
          input.prorataPeriod.startDateIso,
          input.prorataPeriod.endDateIso,
        )
      : input.monthlyRent;
  const electricityDelta = Math.max(
    0,
    input.electricityUnits - input.baselineElectricityUnits,
  );
  const gasDelta = Math.max(0, input.gasUnits - input.baselineGasUnits);
  const electricityCharge = electricityDelta * input.rates.electricityUnitRate;
  const gasCharge = gasDelta * input.rates.gasUnitRate;
  const cleaningCharge = input.rates.cleaningCharge;
  const total =
    effectiveMonthlyRent +
    electricityCharge +
    gasCharge +
    cleaningCharge +
    input.maintenance +
    input.misc;

  return {
    monthlyRent: effectiveMonthlyRent,
    fullMonthlyRent: input.monthlyRent,
    prorataDays,
    prorataDailyRate: input.prorataPeriod != null ? input.monthlyRent / 30 : null,
    isProrata: input.prorataPeriod != null,
    electricityUnits: input.electricityUnits,
    electricityBaseline: input.baselineElectricityUnits,
    electricityDelta,
    electricityUnitRate: input.rates.electricityUnitRate,
    electricityCharge,
    gasUnits: input.gasUnits,
    gasBaseline: input.baselineGasUnits,
    gasDelta,
    gasUnitRate: input.rates.gasUnitRate,
    gasCharge,
    cleaningCharge,
    maintenance: input.maintenance,
    misc: input.misc,
    rates: input.rates,
    total,
  };
}

export function calcTotalRent(input: {
  monthlyRent: number;
  electricityUnits: number;
  gasUnits: number;
  baselineElectricityUnits: number;
  baselineGasUnits: number;
  maintenance: number;
  misc: number;
  rates: BuildingUtilityRateSnapshot;
  prorataPeriod?: ProrataPeriod;
}) {
  return calcRentBreakdown(input).total;
}

export function formatMoney(value: number) {
  return `₹${value.toFixed(2)}`;
}

export function breakdownFromRentRow(
  row: {
    id?: string;
    startDate: string;
    endDate?: string | null;
    isExitRent?: boolean;
    rent: string | number;
    electricityUnits?: string | number | null;
    gasUnits?: string | number | null;
    maintenance?: string | number | null;
    misc?: string | number | null;
    utilityBaseline?: unknown;
    utilityRateSnapshot?: unknown;
  },
  context?: {
    assignment: {
      initialElectricityUnits?: string | number | null;
      initialGasUnits?: string | number | null;
    };
    monthlyBills: Array<{
      id: string;
      startDate: string;
      electricityUnits?: string | number | null;
      gasUnits?: string | number | null;
      utilityBaseline?: unknown;
    }>;
    rates?: BuildingUtilityRateSnapshot;
  },
) {
  const baseline = context
    ? resolveUtilityBaselines({
        assignment: context.assignment,
        monthlyBills: context.monthlyBills,
        savedBaseline: row.utilityBaseline,
        periodStartDate: row.startDate,
        excludeRentId: row.id,
      })
    : parseUtilityBaseline(row.utilityBaseline);

  if (!baseline) return null;

  const rates = context?.rates ?? parseUtilityRateSnapshot(row.utilityRateSnapshot);
  if (!rates) return null;

  const startDateIso = row.startDate.slice(0, 10);
  const endDateIso = row.endDate?.slice(0, 10);
  const prorataPeriod =
    row.isExitRent && endDateIso
      ? { startDateIso, endDateIso }
      : undefined;

  return calcRentBreakdown({
    monthlyRent: toNumber(row.rent),
    electricityUnits: toNumber(row.electricityUnits),
    gasUnits: toNumber(row.gasUnits),
    baselineElectricityUnits: baseline.electricityUnits,
    baselineGasUnits: baseline.gasUnits,
    maintenance: toNumber(row.maintenance),
    misc: toNumber(row.misc),
    rates,
    prorataPeriod,
  });
}
