import { handleApiError, jsonOk } from "@/lib/api/response";
import { getAuthenticatedPropertyContext, parseFilterBigInt } from "@/lib/properties/api";
import { createUnitSchema, updateUnitSchema } from "@/lib/properties/schemas";
import {
  createUnit,
  deleteUnit,
  getUnit,
  listUnits,
  updateUnit,
} from "@/lib/properties/units";
import { withPermission } from "@/lib/permissions";

type Params = { params: Promise<{ id: string }> };

export const GET = withPermission(async (request) => {
  try {
    const ctx = await getAuthenticatedPropertyContext();
    const { searchParams } = new URL(request.url);
    const units = await listUnits(ctx, {
      floorId: parseFilterBigInt(searchParams.get("floorId")),
      buildingId: parseFilterBigInt(searchParams.get("buildingId")),
      propertyId: parseFilterBigInt(searchParams.get("propertyId")),
    });
    return jsonOk(units);
  } catch (error) {
    return handleApiError(error);
  }
}, "unit", "read");

export const POST = withPermission(async (request) => {
  try {
    const ctx = await getAuthenticatedPropertyContext();
    const body = createUnitSchema.parse(await request.json());
    return jsonOk(await createUnit(ctx, body), 201);
  } catch (error) {
    return handleApiError(error);
  }
}, "unit", "create");
