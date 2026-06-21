import { handleApiError, jsonOk } from "@/lib/api/response";
import { getAuthenticatedPropertyContext, parseFilterBigInt } from "@/lib/properties/api";
import { createPaymentSchema } from "@/lib/properties/schemas";
import { createPayment } from "@/lib/properties/payments";
import { withPermission } from "@/lib/permissions";

export const POST = withPermission(async (request) => {
  try {
    const ctx = await getAuthenticatedPropertyContext();
    const body = createPaymentSchema.parse(await request.json());
    return jsonOk(await createPayment(ctx, body), 201);
  } catch (error) {
    return handleApiError(error);
  }
}, "payment", "create");
