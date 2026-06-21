export const GST_MASTER_SEARCH_MIN_LENGTH = 7;

export const CONSTITUTION_OF_BUSINESS_OPTIONS = [
  "Proprietorship",
  "Partnership",
  "Hindu Undivided Family",
  "Private Limited Company",
  "Public Limited Company",
  "Limited Liability Partnership",
  "Society / Club / Trust / AOP",
  "Government Department",
  "Public Sector Undertaking",
  "Unlimited Company",
  "Local Authority",
  "Statutory Body",
  "Foreign Company",
  "Foreign Limited Liability Partnership",
  "Other",
] as const;

export const TAXPAYER_TYPE_OPTIONS = [
  "Regular",
  "Composition",
  "SEZ Unit",
  "SEZ Developer",
  "Casual Taxable Person",
  "Input Service Distributor",
  "Non-Resident Taxable Person",
  "UIN Holder",
  "TDS / TCS",
] as const;

export const GSTIN_STATUS_OPTIONS = [
  "Active",
  "Cancelled",
  "Suspended",
  "Provisional",
  "Inactive",
] as const;

export type ConstitutionOfBusiness = (typeof CONSTITUTION_OF_BUSINESS_OPTIONS)[number];
export type TaxpayerType = (typeof TAXPAYER_TYPE_OPTIONS)[number];
export type GstinStatus = (typeof GSTIN_STATUS_OPTIONS)[number];

/** Match portal/API values case-insensitively to a canonical dropdown option. */
export function normalizeToGstMasterOption<T extends string>(
  value: string,
  options: readonly T[],
): T | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const exact = options.find((option) => option === trimmed);
  if (exact) return exact;

  const lower = trimmed.toLowerCase();
  const caseInsensitive = options.find((option) => option.toLowerCase() === lower);
  if (caseInsensitive) return caseInsensitive;

  const compact = lower.replace(/\s+/g, "");
  const compactMatch = options.find(
    (option) => option.toLowerCase().replace(/\s+/g, "") === compact,
  );
  if (compactMatch) return compactMatch;

  return undefined;
}

export function withLegacyOption<T extends string>(
  options: readonly T[],
  currentValue: string,
): T[] {
  if (!currentValue || options.includes(currentValue as T)) {
    return [...options];
  }
  return [currentValue as T, ...options];
}
