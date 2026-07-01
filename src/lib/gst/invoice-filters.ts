export type GstInvoiceSearchFilters = {
  invoiceNumber: string;
  dateFrom: string;
  dateTo: string;
  customer: string;
  gstNumber: string;
  taxableValue: string;
  paymentStatus: string;
  filingStatus: string;
};

export const emptyGstInvoiceSearch: GstInvoiceSearchFilters = {
  invoiceNumber: "",
  dateFrom: "",
  dateTo: "",
  customer: "",
  gstNumber: "",
  taxableValue: "",
  paymentStatus: "",
  filingStatus: "",
};

type SearchableInvoice = {
  invoiceNumber: string;
  invoiceDate: string;
  gstNumber?: string | null;
  tradeName?: string | null;
  customerName?: string | null;
  customerAddress?: string | null;
  taxableValue: string | number;
  paymentStatus: string;
  filingStatus: string;
};

function formatDate(value: string) {
  return value.slice(0, 10);
}

function includesText(haystack: string | null | undefined, needle: string) {
  if (!needle.trim()) return true;
  return (haystack ?? "").toLowerCase().includes(needle.trim().toLowerCase());
}

export function filterGstInvoices<T extends SearchableInvoice>(
  rows: T[],
  filters: GstInvoiceSearchFilters,
  options: { includeCustomerSearch?: boolean; includeTradeNameSearch?: boolean } = {},
) {
  const includeCustomer = options.includeCustomerSearch ?? false;
  const includeTradeName = options.includeTradeNameSearch ?? false;

  return rows.filter((row) => {
    if (!includesText(row.invoiceNumber, filters.invoiceNumber)) return false;

    const rowDate = formatDate(row.invoiceDate);
    if (filters.dateFrom && rowDate < filters.dateFrom) return false;
    if (filters.dateTo && rowDate > filters.dateTo) return false;

    if (!includesText(row.gstNumber, filters.gstNumber)) return false;

    if (includeTradeName && filters.customer.trim()) {
      const partyHaystack = `${row.tradeName ?? ""} ${row.gstNumber ?? ""}`;
      if (!includesText(partyHaystack, filters.customer)) return false;
    }

    if (includeCustomer && filters.customer.trim()) {
      const customerHaystack = `${row.customerName ?? ""} ${row.customerAddress ?? ""} ${row.tradeName ?? ""}`;
      if (!includesText(customerHaystack, filters.customer)) return false;
    }

    if (filters.taxableValue.trim()) {
      const taxableText = String(row.taxableValue);
      if (!taxableText.includes(filters.taxableValue.trim())) return false;
    }

    if (filters.paymentStatus && row.paymentStatus !== filters.paymentStatus) return false;
    if (filters.filingStatus && row.filingStatus !== filters.filingStatus) return false;

    return true;
  });
}

export function hasActiveGstInvoiceSearch(filters: GstInvoiceSearchFilters) {
  return Object.values(filters).some((value) => value.trim() !== "");
}
