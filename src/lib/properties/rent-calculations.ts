export const ELECTRICITY_UNIT_RATE = 10;
export const GAS_UNIT_RATE = 50;

export function toNumber(value: string | number | null | undefined) {
  if (value == null || value === "") return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

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

export function resolveUtilityBaselines(params: {
  tenant: {
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
  /** When set, baseline comes from the bill immediately before this period (edit/view). */
  periodStartDate?: string;
  excludeRentId?: string;
}): UtilityBaseline & { source: "stored" | "tenant" | "prior_bill" } {
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
      params.tenant.initialElectricityUnits != null
        ? toNumber(params.tenant.initialElectricityUnits)
        : 0,
    gasUnits:
      params.tenant.initialGasUnits != null
        ? toNumber(params.tenant.initialGasUnits)
        : 0,
    source: "tenant",
  };
}

/** @deprecated Use resolveUtilityBaselines */
export function resolveLiveUtilityBaselines(input: {
  tenant: {
    initialElectricityUnits?: string | number | null;
    initialGasUnits?: string | number | null;
  };
  previousBills: Array<{
    electricityUnits?: string | number | null;
    gasUnits?: string | number | null;
  }>;
}) {
  const resolved = resolveUtilityBaselines({
    tenant: input.tenant,
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

export function calcDueDate(monthlyDueDay: number, reference = new Date()) {
  const year = reference.getFullYear();
  const month = reference.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const day = Math.min(monthlyDueDay, lastDay);
  let due = new Date(year, month, day);

  const today = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate());
  if (due < today) {
    const nextMonth = month + 1;
    const nextYear = nextMonth > 11 ? year + 1 : year;
    const nextMonthIndex = nextMonth % 12;
    const nextLastDay = new Date(nextYear, nextMonthIndex + 1, 0).getDate();
    due = new Date(nextYear, nextMonthIndex, Math.min(monthlyDueDay, nextLastDay));
  }

  return formatIsoDate(due);
}

export function isAgreementOver(
  rentTo: string | null | undefined,
  leaseTo: string | null | undefined,
) {
  if (!rentTo || !leaseTo) return false;
  return new Date(rentTo) > new Date(leaseTo);
}

export function calcRentBreakdown(input: {
  monthlyRent: number;
  electricityUnits: number;
  gasUnits: number;
  baselineElectricityUnits: number;
  baselineGasUnits: number;
  maintenance: number;
  misc: number;
}) {
  const electricityDelta = Math.max(
    0,
    input.electricityUnits - input.baselineElectricityUnits,
  );
  const gasDelta = Math.max(0, input.gasUnits - input.baselineGasUnits);
  const electricityCharge = electricityDelta * ELECTRICITY_UNIT_RATE;
  const gasCharge = gasDelta * GAS_UNIT_RATE;
  const total =
    input.monthlyRent + electricityCharge + gasCharge + input.maintenance + input.misc;

  return {
    monthlyRent: input.monthlyRent,
    electricityUnits: input.electricityUnits,
    electricityBaseline: input.baselineElectricityUnits,
    electricityDelta,
    electricityCharge,
    gasUnits: input.gasUnits,
    gasBaseline: input.baselineGasUnits,
    gasDelta,
    gasCharge,
    maintenance: input.maintenance,
    misc: input.misc,
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
    rent: string | number;
    electricityUnits?: string | number | null;
    gasUnits?: string | number | null;
    maintenance?: string | number | null;
    misc?: string | number | null;
    utilityBaseline?: unknown;
  },
  context?: {
    tenant: {
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
  },
) {
  const baseline = context
    ? resolveUtilityBaselines({
        tenant: context.tenant,
        monthlyBills: context.monthlyBills,
        savedBaseline: row.utilityBaseline,
        periodStartDate: row.startDate,
        excludeRentId: row.id,
      })
    : parseUtilityBaseline(row.utilityBaseline);

  if (!baseline) return null;

  return calcRentBreakdown({
    monthlyRent: toNumber(row.rent),
    electricityUnits: toNumber(row.electricityUnits),
    gasUnits: toNumber(row.gasUnits),
    baselineElectricityUnits: baseline.electricityUnits,
    baselineGasUnits: baseline.gasUnits,
    maintenance: toNumber(row.maintenance),
    misc: toNumber(row.misc),
  });
}
