import { handleApiError, jsonOk } from "@/lib/api/response";
import { getAuthenticatedGstUserId } from "@/lib/gst/api";
import { deleteGstMaster, updateGstMaster } from "@/lib/gst/gst-masters";
import { updateGstMasterSchema } from "@/lib/gst/schemas";
import { withPermission } from "@/lib/permissions";

export const PATCH = withPermission(async (request, context) => {
  try {
    const params = await context?.params;
    if (!params?.id) throw new Error("NOT_FOUND");
    const userId = await getAuthenticatedGstUserId();
    const body = updateGstMasterSchema.parse(await request.json());
    return jsonOk(await updateGstMaster(userId, params.id, body));
  } catch (error) {
    return handleApiError(error);
  }
}, "gst_master", "update");

export const DELETE = withPermission(async (_request, context) => {
  try {
    const params = await context?.params;
    if (!params?.id) throw new Error("NOT_FOUND");
    const userId = await getAuthenticatedGstUserId();
    await deleteGstMaster(userId, params.id);
    return jsonOk({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}, "gst_master", "delete");
