import type { AdminQuoteRequestStatus, QuoteRequestStatus } from "@/lib/admin/quote-request-status";
import { prisma } from "@/lib/db";

export type { AdminQuoteRequestStatus, QuoteRequestStatus } from "@/lib/admin/quote-request-status";
export {
  ADMIN_QUOTE_REQUEST_STATUSES,
  QUOTE_REQUEST_STATUSES,
  quoteRequestStatusClass,
  quoteRequestStatusLabel,
} from "@/lib/admin/quote-request-status";

const quoteRequestSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  company: true,
  interest: true,
  message: true,
  status: true,
  ipAddress: true,
  createdAt: true,
} as const;

export type ListQuoteRequestsOptions = {
  page?: number;
  limit?: number;
  status?: QuoteRequestStatus;
};

export async function listQuoteRequests(options: ListQuoteRequestsOptions = {}) {
  const page = Math.max(options.page ?? 1, 1);
  const limit = Math.min(Math.max(options.limit ?? 20, 1), 100);
  const skip = (page - 1) * limit;

  const where = options.status ? { status: options.status } : {};

  const [items, total] = await Promise.all([
    prisma.quoteRequest.findMany({
      where,
      select: quoteRequestSelect,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.quoteRequest.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function updateQuoteRequestStatus(id: number, status: AdminQuoteRequestStatus) {
  const existing = await prisma.quoteRequest.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!existing) {
    throw new Error("NOT_FOUND");
  }

  return prisma.quoteRequest.update({
    where: { id },
    data: { status },
    select: quoteRequestSelect,
  });
}
