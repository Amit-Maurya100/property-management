import { handleApiError, jsonOk } from "@/lib/api/response";
import { getAuthenticatedPropertyContext } from "@/lib/properties/api";
import { tenantExitSchema } from "@/lib/properties/schemas";
import { recordTenantExit } from "@/lib/properties/tenant-exit";
import { withPermission } from "@/lib/permissions";

type Params = { params: Promise<{ id: string }> };

export const POST = withPermission(async (request, context) => {
  try {
    const ctx = await getAuthenticatedPropertyContext();
    const { id } = await (context as Params).params;
    const body = tenantExitSchema.parse(await request.json());
    return jsonOk(await recordTenantExit(ctx, id, body), 201);
  } catch (error) {
    return handleApiError(error);
  }
}, "rent", "create");
