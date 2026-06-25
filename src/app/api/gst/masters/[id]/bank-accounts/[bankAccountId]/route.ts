import { handleApiError, jsonOk } from "@/lib/api/response";
import { getAuthenticatedGstUserId } from "@/lib/gst/api";
import {
  deleteGstMasterBankAccount,
  updateGstMasterBankAccount,
} from "@/lib/gst/gst-master-bank-accounts";
import { updateGstMasterBankAccountSchema } from "@/lib/gst/schemas";
import { withPermission } from "@/lib/permissions";

type Params = { params: Promise<{ id: string; bankAccountId: string }> };

export const PATCH = withPermission(async (request, context) => {
  try {
    const userId = await getAuthenticatedGstUserId();
    const { id, bankAccountId } = await (context as Params).params;
    const body = updateGstMasterBankAccountSchema.parse(await request.json());
    return jsonOk(await updateGstMasterBankAccount(userId, id, bankAccountId, body));
  } catch (error) {
    return handleApiError(error);
  }
}, "gst_master", "update");

export const DELETE = withPermission(async (_request, context) => {
  try {
    const userId = await getAuthenticatedGstUserId();
    const { id, bankAccountId } = await (context as Params).params;
    await deleteGstMasterBankAccount(userId, id, bankAccountId);
    return jsonOk({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}, "gst_master", "delete");
