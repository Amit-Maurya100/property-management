import { handleApiError } from "@/lib/api/response";
import { getAuthenticatedGstUserId } from "@/lib/gst/api";
import { buildGstReportWorkbook, gstReportExportFilename } from "@/lib/gst/report-export";
import { getGstReportExportData } from "@/lib/gst/reports";
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
    const data = await getGstReportExportData(userId, query);
    const buffer = await buildGstReportWorkbook(data);
    const filename = gstReportExportFilename(data);

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}, "gst_report", "read");
