import { createPermission, listPermissions } from "@/lib/admin/permissions";
import { createPermissionSchema } from "@/lib/admin/schemas";
import { handleApiError, jsonOk } from "@/lib/api/response";
import { withPermission } from "@/lib/permissions";

export const GET = withPermission(async () => {
  try {
    const permissions = await listPermissions();
    return jsonOk(permissions);
  } catch (error) {
    return handleApiError(error);
  }
}, "permission", "read");

export const POST = withPermission(async (request) => {
  try {
    const body = createPermissionSchema.parse(await request.json());
    const permission = await createPermission(body);
    return jsonOk(permission, 201);
  } catch (error) {
    return handleApiError(error);
  }
}, "permission", "create");
