import { handleApiError, jsonOk } from "@/lib/api/response";
import { getAuthenticatedPropertyContext } from "@/lib/properties/api";
import {
  deleteRentPaymentAccount,
  updateRentPaymentAccount,
} from "@/lib/properties/rent-payment-accounts";
import { updateRentPaymentAccountSchema } from "@/lib/properties/schemas";
import { withPermission } from "@/lib/permissions";

type Params = { params: Promise<{ id: string }> };

export const PATCH = withPermission(async (request, context) => {
  try {
    const ctx = await getAuthenticatedPropertyContext();
    const { id } = await (context as Params).params;
    const body = updateRentPaymentAccountSchema.parse(await request.json());
    return jsonOk(await updateRentPaymentAccount(ctx, id, body));
  } catch (error) {
    return handleApiError(error);
  }
}, "payment", "update");

export const DELETE = withPermission(async (_request, context) => {
  try {
    const ctx = await getAuthenticatedPropertyContext();
    const { id } = await (context as Params).params;
    await deleteRentPaymentAccount(ctx, id);
    return jsonOk({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}, "payment", "delete");
