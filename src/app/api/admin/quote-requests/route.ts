import { z } from "zod";
import { listQuoteRequests, QUOTE_REQUEST_STATUSES } from "@/lib/admin/quote-requests";
import { handleApiError, jsonOk } from "@/lib/api/response";
import { withPermission } from "@/lib/permissions";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  status: z.enum(QUOTE_REQUEST_STATUSES).optional(),
});

export const GET = withPermission(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const query = querySchema.parse({
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      status: searchParams.get("status") ?? undefined,
    });

    const result = await listQuoteRequests(query);
    return jsonOk(result);
  } catch (error) {
    return handleApiError(error);
  }
}, "quote_request", "read");
