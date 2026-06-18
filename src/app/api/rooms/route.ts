import { handleApiError, jsonOk } from "@/lib/api/response";
import { getAuthenticatedPropertyContext, parseFilterBigInt } from "@/lib/properties/api";
import { createRoomSchema, updateRoomSchema } from "@/lib/properties/schemas";
import {
  createRoom,
  deleteRoom,
  getRoom,
  listRooms,
  updateRoom,
} from "@/lib/properties/rooms";
import { withPermission } from "@/lib/permissions";

type Params = { params: Promise<{ id: string }> };

export const GET = withPermission(async (request) => {
  try {
    const ctx = await getAuthenticatedPropertyContext();
    const { searchParams } = new URL(request.url);
    const rooms = await listRooms(ctx, {
      unitId: parseFilterBigInt(searchParams.get("unitId")),
      floorId: parseFilterBigInt(searchParams.get("floorId")),
      propertyId: parseFilterBigInt(searchParams.get("propertyId")),
    });
    return jsonOk(rooms);
  } catch (error) {
    return handleApiError(error);
  }
}, "room", "read");

export const POST = withPermission(async (request) => {
  try {
    const ctx = await getAuthenticatedPropertyContext();
    const body = createRoomSchema.parse(await request.json());
    return jsonOk(await createRoom(ctx, body), 201);
  } catch (error) {
    return handleApiError(error);
  }
}, "room", "create");
