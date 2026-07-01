export const QUOTE_REQUEST_STATUSES = ["NEW", "CONTACTED", "LOST", "CONVERTED"] as const;
export type QuoteRequestStatus = (typeof QUOTE_REQUEST_STATUSES)[number];

export const ADMIN_QUOTE_REQUEST_STATUSES = ["CONTACTED", "LOST", "CONVERTED"] as const;
export type AdminQuoteRequestStatus = (typeof ADMIN_QUOTE_REQUEST_STATUSES)[number];

export function quoteRequestStatusLabel(status: string) {
  if (status === "CONTACTED") return "Contacted";
  if (status === "LOST") return "Lost";
  if (status === "CONVERTED") return "Converted";
  return "New";
}

export function quoteRequestStatusClass(status: string) {
  if (status === "CONTACTED") return "text-sky-400";
  if (status === "LOST") return "text-red-400";
  if (status === "CONVERTED") return "text-emerald-400";
  return "text-amber-300";
}
