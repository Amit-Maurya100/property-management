import { handleApiError, jsonOk } from "@/lib/api/response";
import { updateAmenitySchema } from "@/lib/properties/schemas";
import { deleteAmenity, getAmenity, updateAmenity } from "@/lib/properties/amenities";
import { withPermission } from "@/lib/permissions";

type Params = { params: Promise<{ id: string }> };

export const GET = withPermission(async (_request, context) => {
  try {
    const { id } = await (context as Params).params;
    return jsonOk(await getAmenity(id));
  } catch (error) {
    return handleApiError(error);
  }
}, "amenity", "read");

export const PATCH = withPermission(async (request, context) => {
  try {
    const { id } = await (context as Params).params;
    const body = updateAmenitySchema.parse(await request.json());
    return jsonOk(await updateAmenity(id, body));
  } catch (error) {
    return handleApiError(error);
  }
}, "amenity", "update");

export const DELETE = withPermission(async (_request, context) => {
  try {
    const { id } = await (context as Params).params;
    await deleteAmenity(id);
    return jsonOk({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}, "amenity", "delete");
