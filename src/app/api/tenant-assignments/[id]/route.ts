import { handleApiError, jsonOk } from "@/lib/api/response";
import { getAuthenticatedPropertyContext } from "@/lib/properties/api";
import { updateTenantAssignmentSchema } from "@/lib/properties/schemas";
import {
  deleteTenantAssignment,
  getTenantAssignment,
  updateTenantAssignment,
} from "@/lib/properties/tenant-assignments";
import { withPermission } from "@/lib/permissions";

type Params = { params: Promise<{ id: string }> };

export const GET = withPermission(async (_request, context) => {
  try {
    const ctx = await getAuthenticatedPropertyContext();
    const { id } = await (context as Params).params;
    return jsonOk(await getTenantAssignment(ctx, id));
  } catch (error) {
    return handleApiError(error);
  }
}, "tenant", "read");

export const PATCH = withPermission(async (request, context) => {
  try {
    const ctx = await getAuthenticatedPropertyContext();
    const { id } = await (context as Params).params;
    const body = updateTenantAssignmentSchema.parse(await request.json());
    return jsonOk(await updateTenantAssignment(ctx, id, body));
  } catch (error) {
    return handleApiError(error);
  }
}, "tenant", "update");

export const DELETE = withPermission(async (_request, context) => {
  try {
    const ctx = await getAuthenticatedPropertyContext();
    const { id } = await (context as Params).params;
    await deleteTenantAssignment(ctx, id);
    return jsonOk({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}, "tenant", "delete");
