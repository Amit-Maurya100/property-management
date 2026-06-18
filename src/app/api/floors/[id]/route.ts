import { handleApiError, jsonOk } from "@/lib/api/response";
import { getAuthenticatedPropertyContext } from "@/lib/properties/api";
import { updateFloorSchema } from "@/lib/properties/schemas";
import { deleteFloor, getFloor, updateFloor } from "@/lib/properties/floors";
import { withPermission } from "@/lib/permissions";

type Params = { params: Promise<{ id: string }> };

export const GET = withPermission(async (_request, context) => {
  try {
    const ctx = await getAuthenticatedPropertyContext();
    const { id } = await (context as Params).params;
    return jsonOk(await getFloor(ctx, id));
  } catch (error) {
    return handleApiError(error);
  }
}, "floor", "read");

export const PATCH = withPermission(async (request, context) => {
  try {
    const ctx = await getAuthenticatedPropertyContext();
    const { id } = await (context as Params).params;
    const body = updateFloorSchema.parse(await request.json());
    return jsonOk(await updateFloor(ctx, id, body));
  } catch (error) {
    return handleApiError(error);
  }
}, "floor", "update");

export const DELETE = withPermission(async (_request, context) => {
  try {
    const ctx = await getAuthenticatedPropertyContext();
    const { id } = await (context as Params).params;
    await deleteFloor(ctx, id);
    return jsonOk({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}, "floor", "delete");
