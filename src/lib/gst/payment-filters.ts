import type { PaymentAccountNameValue, PaymentModeValue } from "@/lib/properties/payment-calculations";

export type GstPaymentSearchFilters = {
  accountName: string;
  mode: string;
  dateFrom: string;
  dateTo: string;
};

export const emptyGstPaymentSearch: GstPaymentSearchFilters = {
  accountName: "",
  mode: "",
  dateFrom: "",
  dateTo: "",
};

type SearchableGstPayment = {
  paidAt: string;
  mode: PaymentModeValue | string;
  accountName: PaymentAccountNameValue | string;
};

function formatDate(value: string) {
  return value.slice(0, 10);
}

export function filterGstPayments<T extends SearchableGstPayment>(
  payments: T[],
  filters: GstPaymentSearchFilters,
) {
  return payments.filter((payment) => {
    if (filters.accountName && payment.accountName !== filters.accountName) return false;
    if (filters.mode && payment.mode !== filters.mode) return false;

    const paidDate = formatDate(payment.paidAt);
    if (filters.dateFrom && paidDate < filters.dateFrom) return false;
    if (filters.dateTo && paidDate > filters.dateTo) return false;

    return true;
  });
}

export type GstInvoicePaymentSearchRow<TPayment extends SearchableGstPayment> = {
  payments: TPayment[];
  filteredPayments: TPayment[];
};

export function filterGstInvoicePaymentRows<
  TRow extends { payments: TPayment[] },
  TPayment extends SearchableGstPayment = TRow["payments"][number],
>(rows: TRow[], filters: GstPaymentSearchFilters): Array<TRow & GstInvoicePaymentSearchRow<TPayment>> {
  const active = hasActiveGstPaymentSearch(filters);
  if (!active) {
    return rows.map((row) => ({
      ...row,
      filteredPayments: row.payments,
    }));
  }

  return rows
    .map((row) => ({
      ...row,
      filteredPayments: filterGstPayments(row.payments, filters),
    }))
    .filter((row) => row.filteredPayments.length > 0);
}

export function hasActiveGstPaymentSearch(filters: GstPaymentSearchFilters) {
  return Object.values(filters).some((value) => value.trim() !== "");
}

export function countMatchingGstPayments<T extends SearchableGstPayment>(
  rows: Array<{ filteredPayments: T[] }>,
) {
  return rows.reduce((total, row) => total + row.filteredPayments.length, 0);
}
