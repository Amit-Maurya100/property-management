import { handleApiError, jsonOk } from "@/lib/api/response";
import { getAuthenticatedGstUserId } from "@/lib/gst/api";
import { searchGstMasters } from "@/lib/gst/gst-masters";
import { gstMasterSearchQuerySchema } from "@/lib/gst/schemas";
import { withAnyPermission } from "@/lib/permissions";

export const GET = withAnyPermission(
  async (request) => {
    try {
      const params = new URL(request.url).searchParams;
      const { q } = gstMasterSearchQuerySchema.parse({ q: params.get("q") ?? "" });
      const userId = await getAuthenticatedGstUserId();
      return jsonOk(await searchGstMasters(userId, q));
    } catch (error) {
      return handleApiError(error);
    }
  },
  [
    { resource: "gst_master", action: "read" },
    { resource: "gst_b2b_sale", action: "read" },
    { resource: "gst_b2c_sale", action: "read" },
    { resource: "gst_purchase", action: "read" },
  ],
);
