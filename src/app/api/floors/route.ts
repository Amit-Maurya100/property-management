import { handleApiError, jsonOk } from "@/lib/api/response";
import { getAuthenticatedPropertyContext, parseFilterBigInt } from "@/lib/properties/api";
import { createFloorSchema, updateFloorSchema } from "@/lib/properties/schemas";
import {
  createFloor,
  deleteFloor,
  getFloor,
  listFloors,
  updateFloor,
} from "@/lib/properties/floors";
import { withPermission } from "@/lib/permissions";

type Params = { params: Promise<{ id: string }> };

export const GET = withPermission(async (request) => {
  try {
    const ctx = await getAuthenticatedPropertyContext();
    const { searchParams } = new URL(request.url);
    const floors = await listFloors(ctx, {
      buildingId: parseFilterBigInt(searchParams.get("buildingId")),
      propertyId: parseFilterBigInt(searchParams.get("propertyId")),
    });
    return jsonOk(floors);
  } catch (error) {
    return handleApiError(error);
  }
}, "floor", "read");

export const POST = withPermission(async (request) => {
  try {
    const ctx = await getAuthenticatedPropertyContext();
    const body = createFloorSchema.parse(await request.json());
    return jsonOk(await createFloor(ctx, body), 201);
  } catch (error) {
    return handleApiError(error);
  }
}, "floor", "create");
