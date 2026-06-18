import {
  deleteResource,
  getResource,
  updateResource,
} from "@/lib/admin/catalogs";
import { updateCatalogSchema } from "@/lib/admin/schemas";
import { handleApiError, jsonOk } from "@/lib/api/response";
import { withPermission } from "@/lib/permissions";

type Params = { params: Promise<{ id: string }> };

export const GET = withPermission(async (_request, context) => {
  try {
    const { id } = await (context as Params).params;
    const resource = await getResource(id);
    return jsonOk(resource);
  } catch (error) {
    return handleApiError(error);
  }
}, "resource", "read");

export const PATCH = withPermission(async (request, context) => {
  try {
    const { id } = await (context as Params).params;
    const body = updateCatalogSchema.parse(await request.json());
    const resource = await updateResource(id, body);
    return jsonOk(resource);
  } catch (error) {
    return handleApiError(error);
  }
}, "resource", "update");

export const DELETE = withPermission(async (_request, context) => {
  try {
    const { id } = await (context as Params).params;
    await deleteResource(id);
    return jsonOk({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}, "resource", "delete");
