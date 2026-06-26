import { handleApiError, jsonOk } from "@/lib/api/response";
import { getAuthenticatedGstUserId } from "@/lib/gst/api";
import { listGstInvoicePayments } from "@/lib/gst/payments";
import { gstInvoiceTypeEnum } from "@/lib/gst/schemas";
import { withPermission } from "@/lib/permissions";

export const GET = withPermission(async (request) => {
  try {
    const params = new URL(request.url).searchParams;
    const typeParam = params.get("type");
    const invoiceType = typeParam ? gstInvoiceTypeEnum.parse(typeParam) : undefined;
    const status = params.get("status") === "all" ? "all" : "open";
    const userId = await getAuthenticatedGstUserId();
    return jsonOk(await listGstInvoicePayments(userId, { invoiceType, status }));
  } catch (error) {
    return handleApiError(error);
  }
}, "gst_payment", "read");
