import { handleApiError, jsonOk } from "@/lib/api/response";
import { getAuthenticatedGstUserId } from "@/lib/gst/api";
import { getActiveTaxConfiguration } from "@/lib/gst/tax-configurations";
import { withPermission } from "@/lib/permissions";

export const GET = withPermission(async (request) => {
  try {
    const userId = await getAuthenticatedGstUserId();
    const dateParam = new URL(request.url).searchParams.get("date");
    if (!dateParam) {
      throw new Error("BAD_REQUEST:date query parameter is required");
    }
    const onDate = new Date(dateParam);
    if (Number.isNaN(onDate.getTime())) {
      throw new Error("BAD_REQUEST:Invalid date");
    }
    return jsonOk(await getActiveTaxConfiguration(userId, onDate));
  } catch (error) {
    return handleApiError(error);
  }
}, "gst_tax_configuration", "read");
