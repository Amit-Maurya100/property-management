import {
  createResource,
  listResources,
} from "@/lib/admin/catalogs";
import { createCatalogSchema } from "@/lib/admin/schemas";
import { handleApiError, jsonOk } from "@/lib/api/response";
import { withAnyPermission, withPermission } from "@/lib/permissions";

const catalogReadChecks = [
  { resource: "resource", action: "read" },
  { resource: "permission", action: "create" },
  { resource: "permission", action: "update" },
];

export const GET = withAnyPermission(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("active") === "true";
    const resources = await listResources(activeOnly);
    return jsonOk(resources);
  } catch (error) {
    return handleApiError(error);
  }
}, catalogReadChecks);

export const POST = withPermission(async (request) => {
  try {
    const body = createCatalogSchema.parse(await request.json());
    const resource = await createResource(body);
    return jsonOk(resource, 201);
  } catch (error) {
    return handleApiError(error);
  }
}, "resource", "create");
