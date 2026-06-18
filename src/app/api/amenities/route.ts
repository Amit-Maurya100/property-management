import { handleApiError, jsonOk } from "@/lib/api/response";
import {
  createAmenitySchema,
  updateAmenitySchema,
} from "@/lib/properties/schemas";
import {
  createAmenity,
  deleteAmenity,
  getAmenity,
  listAmenities,
  updateAmenity,
} from "@/lib/properties/amenities";
import { withPermission } from "@/lib/permissions";

type Params = { params: Promise<{ id: string }> };

export const GET = withPermission(async () => {
  try {
    return jsonOk(await listAmenities());
  } catch (error) {
    return handleApiError(error);
  }
}, "amenity", "read");

export const POST = withPermission(async (request) => {
  try {
    const body = createAmenitySchema.parse(await request.json());
    return jsonOk(await createAmenity(body), 201);
  } catch (error) {
    return handleApiError(error);
  }
}, "amenity", "create");
