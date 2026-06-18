import { handleApiError, jsonOk } from "@/lib/api/response";
import { getAuthenticatedPropertyContext } from "@/lib/properties/api";
import { updateRoomSchema } from "@/lib/properties/schemas";
import { deleteRoom, getRoom, updateRoom } from "@/lib/properties/rooms";
import { withPermission } from "@/lib/permissions";

type Params = { params: Promise<{ id: string }> };

export const GET = withPermission(async (_request, context) => {
  try {
    const ctx = await getAuthenticatedPropertyContext();
    const { id } = await (context as Params).params;
    return jsonOk(await getRoom(ctx, id));
  } catch (error) {
    return handleApiError(error);
  }
}, "room", "read");

export const PATCH = withPermission(async (request, context) => {
  try {
    const ctx = await getAuthenticatedPropertyContext();
    const { id } = await (context as Params).params;
    const body = updateRoomSchema.parse(await request.json());
    return jsonOk(await updateRoom(ctx, id, body));
  } catch (error) {
    return handleApiError(error);
  }
}, "room", "update");

export const DELETE = withPermission(async (_request, context) => {
  try {
    const ctx = await getAuthenticatedPropertyContext();
    const { id } = await (context as Params).params;
    await deleteRoom(ctx, id);
    return jsonOk({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}, "room", "delete");
