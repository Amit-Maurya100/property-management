import { handleApiError, jsonOk } from "@/lib/api/response";
import { getAuthenticatedPropertyContext, parseFilterBigInt } from "@/lib/properties/api";
import {
  createBuildingSchema,
  updateBuildingSchema,
} from "@/lib/properties/schemas";
import {
  createBuilding,
  deleteBuilding,
  getBuilding,
  listBuildings,
  updateBuilding,
} from "@/lib/properties/buildings";
import { withPermission } from "@/lib/permissions";

type Params = { params: Promise<{ id: string }> };

export const GET = withPermission(async (request) => {
  try {
    const ctx = await getAuthenticatedPropertyContext();
    const { searchParams } = new URL(request.url);
    const buildings = await listBuildings(ctx, {
      propertyId: parseFilterBigInt(searchParams.get("propertyId")),
    });
    return jsonOk(buildings);
  } catch (error) {
    return handleApiError(error);
  }
}, "building", "read");

export const POST = withPermission(async (request) => {
  try {
    const ctx = await getAuthenticatedPropertyContext();
    const body = createBuildingSchema.parse(await request.json());
    const building = await createBuilding(ctx, body);
    return jsonOk(building, 201);
  } catch (error) {
    return handleApiError(error);
  }
}, "building", "create");
