import { handleApiError, jsonOk } from "@/lib/api/response";
import { getAuthenticatedGstUserId } from "@/lib/gst/api";
import { deleteGstPayment } from "@/lib/gst/payments";
import { withPermission } from "@/lib/permissions";

type Params = { params: Promise<{ id: string }> };

export const DELETE = withPermission(async (_request, context) => {
  try {
    const userId = await getAuthenticatedGstUserId();
    const { id } = await (context as Params).params;
    return jsonOk(await deleteGstPayment(userId, id));
  } catch (error) {
    return handleApiError(error);
  }
}, "gst_payment", "delete");
