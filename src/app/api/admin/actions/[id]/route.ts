import { deleteAction, getAction, updateAction } from "@/lib/admin/catalogs";
import { updateActionCatalogSchema } from "@/lib/admin/schemas";
import { handleApiError, jsonOk } from "@/lib/api/response";
import { withPermission } from "@/lib/permissions";

type Params = { params: Promise<{ id: string }> };

export const GET = withPermission(async (_request, context) => {
  try {
    const { id } = await (context as Params).params;
    const action = await getAction(id);
    return jsonOk(action);
  } catch (error) {
    return handleApiError(error);
  }
}, "action", "read");

export const PATCH = withPermission(async (request, context) => {
  try {
    const { id } = await (context as Params).params;
    const body = updateActionCatalogSchema.parse(await request.json());
    const action = await updateAction(id, body);
    return jsonOk(action);
  } catch (error) {
    return handleApiError(error);
  }
}, "action", "update");

export const DELETE = withPermission(async (_request, context) => {
  try {
    const { id } = await (context as Params).params;
    await deleteAction(id);
    return jsonOk({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}, "action", "delete");
