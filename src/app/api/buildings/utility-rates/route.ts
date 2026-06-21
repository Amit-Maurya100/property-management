import { handleApiError, jsonOk } from "@/lib/api/response";
import { getAuthenticatedPropertyContext, parseFilterBigInt } from "@/lib/properties/api";
import {
  createBuildingUtilityRate,
  listBuildingUtilityRates,
} from "@/lib/properties/building-utility-rates";
import { createBuildingUtilityRateSchema } from "@/lib/properties/schemas";
import { withPermission } from "@/lib/permissions";

export const GET = withPermission(async (request) => {
  try {
    const ctx = await getAuthenticatedPropertyContext();
    const buildingId = parseFilterBigInt(new URL(request.url).searchParams.get("buildingId"));
    return jsonOk(await listBuildingUtilityRates(ctx, { buildingId }));
  } catch (error) {
    return handleApiError(error);
  }
}, "building", "read");

export const POST = withPermission(async (request) => {
  try {
    const ctx = await getAuthenticatedPropertyContext();
    const body = createBuildingUtilityRateSchema.parse(await request.json());
    return jsonOk(await createBuildingUtilityRate(ctx, body), 201);
  } catch (error) {
    return handleApiError(error);
  }
}, "building", "create");
