import { handleApiError, jsonOk } from "@/lib/api/response";
import { getAuthenticatedPropertyContext } from "@/lib/properties/api";
import { deletePayment } from "@/lib/properties/payments";
import { withPermission } from "@/lib/permissions";

type Params = { params: Promise<{ id: string }> };

export const DELETE = withPermission(async (_request, context) => {
  try {
    const ctx = await getAuthenticatedPropertyContext();
    const { id } = await (context as Params).params;
    await deletePayment(ctx, id);
    return jsonOk({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}, "payment", "delete");
