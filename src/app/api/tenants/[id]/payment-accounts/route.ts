import { handleApiError, jsonOk } from "@/lib/api/response";
import { parseId } from "@/lib/ids";
import { getAuthenticatedPropertyContext } from "@/lib/properties/api";
import {
  getTenantPaymentAccountAssignment,
  setTenantPaymentAccounts,
} from "@/lib/properties/rent-payment-accounts";
import { setTenantPaymentAccountsSchema } from "@/lib/properties/schemas";
import { withPermission } from "@/lib/permissions";

type Params = { params: Promise<{ id: string }> };

export const GET = withPermission(async (_request, context) => {
  try {
    const ctx = await getAuthenticatedPropertyContext();
    const { id } = await (context as Params).params;
    return jsonOk(await getTenantPaymentAccountAssignment(ctx, id));
  } catch (error) {
    return handleApiError(error);
  }
}, "tenant", "read");

export const PUT = withPermission(async (request, context) => {
  try {
    const ctx = await getAuthenticatedPropertyContext();
    const { id } = await (context as Params).params;
    const body = setTenantPaymentAccountsSchema.parse(await request.json());
    const accountIds = body.accountIds.map((value) => parseId(value));
    return jsonOk(await setTenantPaymentAccounts(ctx, id, accountIds));
  } catch (error) {
    return handleApiError(error);
  }
}, "tenant", "update");
