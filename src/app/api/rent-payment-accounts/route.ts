import { handleApiError, jsonOk } from "@/lib/api/response";
import { getAuthenticatedPropertyContext } from "@/lib/properties/api";
import {
  createBankPaymentAccount,
  createUpiPaymentAccount,
  listRentPaymentAccounts,
} from "@/lib/properties/rent-payment-accounts";
import { createRentPaymentAccountSchema } from "@/lib/properties/schemas";
import { withPermission } from "@/lib/permissions";

export const GET = withPermission(async () => {
  try {
    const ctx = await getAuthenticatedPropertyContext();
    return jsonOk(await listRentPaymentAccounts(ctx));
  } catch (error) {
    return handleApiError(error);
  }
}, "payment", "read");

export const POST = withPermission(async (request) => {
  try {
    const ctx = await getAuthenticatedPropertyContext();
    const body = createRentPaymentAccountSchema.parse(await request.json());
    if (body.accountType === "BANK") {
      return jsonOk(await createBankPaymentAccount(ctx, body), 201);
    }
    return jsonOk(await createUpiPaymentAccount(ctx, body), 201);
  } catch (error) {
    return handleApiError(error);
  }
}, "payment", "create");
