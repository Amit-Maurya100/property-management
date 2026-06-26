import { handleApiError, jsonOk } from "@/lib/api/response";
import { getAuthenticatedPropertyContext } from "@/lib/properties/api";
import { getRentReport } from "@/lib/properties/rent-reports";
import { rentReportQuerySchema } from "@/lib/properties/schemas";
import { withPermission } from "@/lib/permissions";

export const GET = withPermission(async (request) => {
  try {
    const params = new URL(request.url).searchParams;
    const query = rentReportQuerySchema.parse({
      mode: params.get("mode"),
      month: params.get("month") ?? undefined,
      year: params.get("year") ?? undefined,
      quarter: params.get("quarter") ?? undefined,
      dateFrom: params.get("dateFrom") ?? undefined,
      dateTo: params.get("dateTo") ?? undefined,
      tenantId: params.get("tenantId") ?? undefined,
    });
    const ctx = await getAuthenticatedPropertyContext();
    return jsonOk(await getRentReport(ctx, query));
  } catch (error) {
    return handleApiError(error);
  }
}, "rent", "read");
