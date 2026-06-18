import { handleApiError, jsonOk } from "@/lib/api/response";
import { getAuthenticatedPropertyContext, parseFilterBigInt } from "@/lib/properties/api";
import { createBedSchema, updateBedSchema } from "@/lib/properties/schemas";
import {
  createBed,
  deleteBed,
  getBed,
  listBeds,
  updateBed,
} from "@/lib/properties/beds";
import { withPermission } from "@/lib/permissions";

type Params = { params: Promise<{ id: string }> };

export const GET = withPermission(async (request) => {
  try {
    const ctx = await getAuthenticatedPropertyContext();
    const { searchParams } = new URL(request.url);
    const beds = await listBeds(ctx, {
      roomId: parseFilterBigInt(searchParams.get("roomId")),
      unitId: parseFilterBigInt(searchParams.get("unitId")),
      propertyId: parseFilterBigInt(searchParams.get("propertyId")),
    });
    return jsonOk(beds);
  } catch (error) {
    return handleApiError(error);
  }
}, "bed", "read");

export const POST = withPermission(async (request) => {
  try {
    const ctx = await getAuthenticatedPropertyContext();
    const body = createBedSchema.parse(await request.json());
    return jsonOk(await createBed(ctx, body), 201);
  } catch (error) {
    return handleApiError(error);
  }
}, "bed", "create");
