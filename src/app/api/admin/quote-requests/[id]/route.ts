import { z } from "zod";
import {
  ADMIN_QUOTE_REQUEST_STATUSES,
  updateQuoteRequestStatus,
} from "@/lib/admin/quote-requests";
import { handleApiError, jsonOk } from "@/lib/api/response";
import { withPermission } from "@/lib/permissions";

type Params = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  status: z.enum(ADMIN_QUOTE_REQUEST_STATUSES),
});

export const PATCH = withPermission(async (request, context) => {
  try {
    const { id } = await (context as Params).params;
    const quoteRequestId = z.coerce.number().int().positive().parse(id);
    const body = updateSchema.parse(await request.json());
    const updated = await updateQuoteRequestStatus(quoteRequestId, body.status);
    return jsonOk(updated);
  } catch (error) {
    return handleApiError(error);
  }
}, "quote_request", "update");
