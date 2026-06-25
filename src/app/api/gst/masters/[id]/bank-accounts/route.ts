import { handleApiError, jsonOk } from "@/lib/api/response";
import { getAuthenticatedGstUserId } from "@/lib/gst/api";
import {
  createGstMasterBankAccount,
  listGstMasterBankAccounts,
} from "@/lib/gst/gst-master-bank-accounts";
import { createGstMasterBankAccountSchema } from "@/lib/gst/schemas";
import { withPermission } from "@/lib/permissions";

type Params = { params: Promise<{ id: string }> };

export const GET = withPermission(async (_request, context) => {
  try {
    const userId = await getAuthenticatedGstUserId();
    const { id } = await (context as Params).params;
    return jsonOk(await listGstMasterBankAccounts(userId, id));
  } catch (error) {
    return handleApiError(error);
  }
}, "gst_master", "read");

export const POST = withPermission(async (request, context) => {
  try {
    const userId = await getAuthenticatedGstUserId();
    const { id } = await (context as Params).params;
    const body = createGstMasterBankAccountSchema.parse(await request.json());
    return jsonOk(await createGstMasterBankAccount(userId, id, body), 201);
  } catch (error) {
    return handleApiError(error);
  }
}, "gst_master", "create");
