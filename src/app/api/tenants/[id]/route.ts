import { handleApiError, jsonOk } from "@/lib/api/response";
import { getAuthenticatedPropertyContext } from "@/lib/properties/api";
import { updateTenantSchema } from "@/lib/properties/schemas";
import { deleteTenant, getTenant, updateTenant } from "@/lib/properties/tenants";
import { withPermission } from "@/lib/permissions";

type Params = { params: Promise<{ id: string }> };

export const GET = withPermission(async (_request, context) => {
  try {
    const ctx = await getAuthenticatedPropertyContext();
    const { id } = await (context as Params).params;
    return jsonOk(await getTenant(ctx, id));
  } catch (error) {
    return handleApiError(error);
  }
}, "tenant", "read");

export const PATCH = withPermission(async (request, context) => {
  try {
    const ctx = await getAuthenticatedPropertyContext();
    const { id } = await (context as Params).params;
    const body = updateTenantSchema.parse(await request.json());
    return jsonOk(await updateTenant(ctx, id, body));
  } catch (error) {
    return handleApiError(error);
  }
}, "tenant", "update");

export const DELETE = withPermission(async (_request, context) => {
  try {
    const ctx = await getAuthenticatedPropertyContext();
    const { id } = await (context as Params).params;
    await deleteTenant(ctx, id);
    return jsonOk({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}, "tenant", "delete");
