import { deleteRole, getRole, updateRole } from "@/lib/admin/roles";
import { updateRoleSchema } from "@/lib/admin/schemas";
import { handleApiError, jsonOk } from "@/lib/api/response";
import { withPermission } from "@/lib/permissions";

type Params = { params: Promise<{ id: string }> };

export const GET = withPermission(async (_request, context) => {
  try {
    const { id } = await (context as Params).params;
    const role = await getRole(id);
    return jsonOk(role);
  } catch (error) {
    return handleApiError(error);
  }
}, "role", "read");

export const PATCH = withPermission(async (request, context) => {
  try {
    const { id } = await (context as Params).params;
    const body = updateRoleSchema.parse(await request.json());
    const role = await updateRole(id, body);
    return jsonOk(role);
  } catch (error) {
    return handleApiError(error);
  }
}, "role", "update");

export const DELETE = withPermission(async (_request, context) => {
  try {
    const { id } = await (context as Params).params;
    await deleteRole(id);
    return jsonOk({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}, "role", "delete");
