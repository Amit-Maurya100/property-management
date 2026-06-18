import { handleApiError, jsonOk } from "@/lib/api/response";
import { getAuthenticatedPropertyContext } from "@/lib/properties/api";
import { updateBuildingSchema } from "@/lib/properties/schemas";
import {
  deleteBuilding,
  getBuilding,
  updateBuilding,
} from "@/lib/properties/buildings";
import { withPermission } from "@/lib/permissions";

type Params = { params: Promise<{ id: string }> };

export const GET = withPermission(async (_request, context) => {
  try {
    const ctx = await getAuthenticatedPropertyContext();
    const { id } = await (context as Params).params;
    return jsonOk(await getBuilding(ctx, id));
  } catch (error) {
    return handleApiError(error);
  }
}, "building", "read");

export const PATCH = withPermission(async (request, context) => {
  try {
    const ctx = await getAuthenticatedPropertyContext();
    const { id } = await (context as Params).params;
    const body = updateBuildingSchema.parse(await request.json());
    return jsonOk(await updateBuilding(ctx, id, body));
  } catch (error) {
    return handleApiError(error);
  }
}, "building", "update");

export const DELETE = withPermission(async (_request, context) => {
  try {
    const ctx = await getAuthenticatedPropertyContext();
    const { id } = await (context as Params).params;
    await deleteBuilding(ctx, id);
    return jsonOk({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}, "building", "delete");
