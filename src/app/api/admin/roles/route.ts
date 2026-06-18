import { createRole, listRoles } from "@/lib/admin/roles";
import { createRoleSchema } from "@/lib/admin/schemas";
import { handleApiError, jsonOk } from "@/lib/api/response";
import { withPermission } from "@/lib/permissions";

export const GET = withPermission(async () => {
  try {
    const roles = await listRoles();
    return jsonOk(roles);
  } catch (error) {
    return handleApiError(error);
  }
}, "role", "read");

export const POST = withPermission(async (request) => {
  try {
    const body = createRoleSchema.parse(await request.json());
    const role = await createRole(body);
    return jsonOk(role, 201);
  } catch (error) {
    return handleApiError(error);
  }
}, "role", "create");
