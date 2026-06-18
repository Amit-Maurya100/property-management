import { handleApiError, jsonOk } from "@/lib/api/response";
import { getAuthenticatedPropertyContext } from "@/lib/properties/api";
import { updatePropertySchema } from "@/lib/properties/schemas";
import {
  deleteProperty,
  getProperty,
  updateProperty,
} from "@/lib/properties/properties";
import { withPermission } from "@/lib/permissions";

type Params = { params: Promise<{ id: string }> };

export const GET = withPermission(async (_request, context) => {
  try {
    const ctx = await getAuthenticatedPropertyContext();
    const { id } = await (context as Params).params;
    return jsonOk(await getProperty(ctx, id));
  } catch (error) {
    return handleApiError(error);
  }
}, "property", "read");

export const PATCH = withPermission(async (request, context) => {
  try {
    const ctx = await getAuthenticatedPropertyContext();
    const { id } = await (context as Params).params;
    const body = updatePropertySchema.parse(await request.json());
    return jsonOk(await updateProperty(ctx, id, body));
  } catch (error) {
    return handleApiError(error);
  }
}, "property", "update");

export const DELETE = withPermission(async (_request, context) => {
  try {
    const ctx = await getAuthenticatedPropertyContext();
    const { id } = await (context as Params).params;
    await deleteProperty(ctx, id);
    return jsonOk({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}, "property", "delete");
