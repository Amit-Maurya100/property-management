import { handleApiError, jsonOk } from "@/lib/api/response";
import { getAuthenticatedPropertyContext } from "@/lib/properties/api";
import { createTenantSchema, updateTenantSchema } from "@/lib/properties/schemas";
import {
  createTenant,
  deleteTenant,
  listTenants,
  updateTenant,
} from "@/lib/properties/tenants";
import { withPermission } from "@/lib/permissions";

type Params = { params: Promise<{ id: string }> };

export const GET = withPermission(async () => {
  try {
    const ctx = await getAuthenticatedPropertyContext();
    return jsonOk(await listTenants(ctx));
  } catch (error) {
    return handleApiError(error);
  }
}, "tenant", "read");

export const POST = withPermission(async (request) => {
  try {
    const ctx = await getAuthenticatedPropertyContext();
    const body = createTenantSchema.parse(await request.json());
    return jsonOk(
      await createTenant(ctx, {
        ...body,
        email: body.email || undefined,
      }),
      201,
    );
  } catch (error) {
    return handleApiError(error);
  }
}, "tenant", "create");
