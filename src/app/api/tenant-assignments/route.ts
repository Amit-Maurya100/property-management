import { handleApiError, jsonOk } from "@/lib/api/response";
import { getAuthenticatedPropertyContext, parseFilterBigInt } from "@/lib/properties/api";
import { createTenantAssignmentSchema } from "@/lib/properties/schemas";
import {
  createTenantAssignment,
  listTenantAssignments,
} from "@/lib/properties/tenant-assignments";
import { withPermission } from "@/lib/permissions";

export const GET = withPermission(async (request) => {
  try {
    const ctx = await getAuthenticatedPropertyContext();
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("activeOnly") === "true";
    return jsonOk(
      await listTenantAssignments(ctx, {
        tenantId: parseFilterBigInt(searchParams.get("tenantId")),
        unitId: parseFilterBigInt(searchParams.get("unitId")),
        activeOnly,
      }),
    );
  } catch (error) {
    return handleApiError(error);
  }
}, "tenant", "read");

export const POST = withPermission(async (request) => {
  try {
    const ctx = await getAuthenticatedPropertyContext();
    const body = createTenantAssignmentSchema.parse(await request.json());
    return jsonOk(await createTenantAssignment(ctx, body), 201);
  } catch (error) {
    return handleApiError(error);
  }
}, "tenant", "create");
