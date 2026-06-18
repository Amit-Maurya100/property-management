import { handleApiError, jsonOk } from "@/lib/api/response";
import { getAuthenticatedPropertyContext } from "@/lib/properties/api";
import { updateBedSchema } from "@/lib/properties/schemas";
import { deleteBed, getBed, updateBed } from "@/lib/properties/beds";
import { withPermission } from "@/lib/permissions";

type Params = { params: Promise<{ id: string }> };

export const GET = withPermission(async (_request, context) => {
  try {
    const ctx = await getAuthenticatedPropertyContext();
    const { id } = await (context as Params).params;
    return jsonOk(await getBed(ctx, id));
  } catch (error) {
    return handleApiError(error);
  }
}, "bed", "read");

export const PATCH = withPermission(async (request, context) => {
  try {
    const ctx = await getAuthenticatedPropertyContext();
    const { id } = await (context as Params).params;
    const body = updateBedSchema.parse(await request.json());
    return jsonOk(await updateBed(ctx, id, body));
  } catch (error) {
    return handleApiError(error);
  }
}, "bed", "update");

export const DELETE = withPermission(async (_request, context) => {
  try {
    const ctx = await getAuthenticatedPropertyContext();
    const { id } = await (context as Params).params;
    await deleteBed(ctx, id);
    return jsonOk({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}, "bed", "delete");
