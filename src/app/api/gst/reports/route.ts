import { handleApiError, jsonOk } from "@/lib/api/response";
import { getAuthenticatedGstUserId } from "@/lib/gst/api";
import { getGstReport } from "@/lib/gst/reports";
import { gstReportQuerySchema } from "@/lib/gst/schemas";
import { withPermission } from "@/lib/permissions";

export const GET = withPermission(async (request) => {
  try {
    const params = new URL(request.url).searchParams;
    const query = gstReportQuerySchema.parse({
      mode: params.get("mode"),
      month: params.get("month") ?? undefined,
      year: params.get("year") ?? undefined,
      quarter: params.get("quarter") ?? undefined,
      dateFrom: params.get("dateFrom") ?? undefined,
      dateTo: params.get("dateTo") ?? undefined,
    });
    const userId = await getAuthenticatedGstUserId();
    return jsonOk(await getGstReport(userId, query));
  } catch (error) {
    return handleApiError(error);
  }
}, "gst_report", "read");
