import { handleApiError, jsonOk } from "@/lib/api/response";
import { getAuthenticatedPropertyContext } from "@/lib/properties/api";
import {
  deleteBuildingUtilityRate,
  updateBuildingUtilityRate,
} from "@/lib/properties/building-utility-rates";
import { updateBuildingUtilityRateSchema } from "@/lib/properties/schemas";
import { withPermission } from "@/lib/permissions";

export const PATCH = withPermission(async (request, context) => {
  try {
    const params = await context?.params;
    if (!params?.id) throw new Error("NOT_FOUND");
    const ctx = await getAuthenticatedPropertyContext();
    const body = updateBuildingUtilityRateSchema.parse(await request.json());
    return jsonOk(await updateBuildingUtilityRate(ctx, params.id, body));
  } catch (error) {
    return handleApiError(error);
  }
}, "building", "update");

export const DELETE = withPermission(async (_request, context) => {
  try {
    const params = await context?.params;
    if (!params?.id) throw new Error("NOT_FOUND");
    const ctx = await getAuthenticatedPropertyContext();
    await deleteBuildingUtilityRate(ctx, params.id);
    return jsonOk({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}, "building", "delete");
