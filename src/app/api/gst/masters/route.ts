import { handleApiError, jsonOk } from "@/lib/api/response";
import { getAuthenticatedGstUserId } from "@/lib/gst/api";
import { createGstMaster, listGstMasters } from "@/lib/gst/gst-masters";
import { createGstMasterSchema } from "@/lib/gst/schemas";
import { withPermission } from "@/lib/permissions";

export const GET = withPermission(async () => {
  try {
    const userId = await getAuthenticatedGstUserId();
    return jsonOk(await listGstMasters(userId));
  } catch (error) {
    return handleApiError(error);
  }
}, "gst_master", "read");

export const POST = withPermission(async (request) => {
  try {
    const userId = await getAuthenticatedGstUserId();
    const body = createGstMasterSchema.parse(await request.json());
    return jsonOk(await createGstMaster(userId, body), 201);
  } catch (error) {
    return handleApiError(error);
  }
}, "gst_master", "create");
