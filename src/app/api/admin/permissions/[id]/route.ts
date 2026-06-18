import { deletePermission, getPermission, updatePermission } from "@/lib/admin/permissions";
import { updatePermissionSchema } from "@/lib/admin/schemas";
import { handleApiError, jsonOk } from "@/lib/api/response";
import { withPermission } from "@/lib/permissions";

type Params = { params: Promise<{ id: string }> };

export const GET = withPermission(async (_request, context) => {
  try {
    const { id } = await (context as Params).params;
    const permission = await getPermission(id);
    return jsonOk(permission);
  } catch (error) {
    return handleApiError(error);
  }
}, "permission", "read");

export const PATCH = withPermission(async (request, context) => {
  try {
    const { id } = await (context as Params).params;
    const body = updatePermissionSchema.parse(await request.json());
    const permission = await updatePermission(id, body);
    return jsonOk(permission);
  } catch (error) {
    return handleApiError(error);
  }
}, "permission", "update");

export const DELETE = withPermission(async (_request, context) => {
  try {
    const { id } = await (context as Params).params;
    await deletePermission(id);
    return jsonOk({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}, "permission", "delete");
