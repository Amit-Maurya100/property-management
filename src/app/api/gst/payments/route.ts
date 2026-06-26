import { handleApiError, jsonOk } from "@/lib/api/response";
import { getAuthenticatedGstUserId } from "@/lib/gst/api";
import { createGstPayment } from "@/lib/gst/payments";
import { createGstPaymentSchema } from "@/lib/gst/schemas";
import { withPermission } from "@/lib/permissions";

export const POST = withPermission(async (request) => {
  try {
    const userId = await getAuthenticatedGstUserId();
    const body = createGstPaymentSchema.parse(await request.json());
    return jsonOk(await createGstPayment(userId, body), 201);
  } catch (error) {
    return handleApiError(error);
  }
}, "gst_payment", "create");
