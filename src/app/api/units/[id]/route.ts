import { handleApiError, jsonOk } from "@/lib/api/response";
import { getAuthenticatedPropertyContext } from "@/lib/properties/api";
import { updateUnitSchema } from "@/lib/properties/schemas";
import { deleteUnit, getUnit, updateUnit } from "@/lib/properties/units";
import { withPermission } from "@/lib/permissions";

type Params = { params: Promise<{ id: string }> };

export const GET = withPermission(async (_request, context) => {
  try {
    const ctx = await getAuthenticatedPropertyContext();
    const { id } = await (context as Params).params;
    return jsonOk(await getUnit(ctx, id));
  } catch (error) {
    return handleApiError(error);
  }
}, "unit", "read");

export const PATCH = withPermission(async (request, context) => {
  try {
    const ctx = await getAuthenticatedPropertyContext();
    const { id } = await (context as Params).params;
    const body = updateUnitSchema.parse(await request.json());
    return jsonOk(await updateUnit(ctx, id, body));
  } catch (error) {
    return handleApiError(error);
  }
}, "unit", "update");

export const DELETE = withPermission(async (_request, context) => {
  try {
    const ctx = await getAuthenticatedPropertyContext();
    const { id } = await (context as Params).params;
    await deleteUnit(ctx, id);
    return jsonOk({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}, "unit", "delete");
