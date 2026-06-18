import {
  createAction,
  listActions,
} from "@/lib/admin/catalogs";
import {
  createActionCatalogSchema,
} from "@/lib/admin/schemas";
import { handleApiError, jsonOk } from "@/lib/api/response";
import { withAnyPermission, withPermission } from "@/lib/permissions";

const catalogReadChecks = [
  { resource: "action", action: "read" },
  { resource: "permission", action: "create" },
  { resource: "permission", action: "update" },
];

export const GET = withAnyPermission(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("active") === "true";
    const actions = await listActions(activeOnly);
    return jsonOk(actions);
  } catch (error) {
    return handleApiError(error);
  }
}, catalogReadChecks);

export const POST = withPermission(async (request) => {
  try {
    const body = createActionCatalogSchema.parse(await request.json());
    const action = await createAction(body);
    return jsonOk(action, 201);
  } catch (error) {
    return handleApiError(error);
  }
}, "action", "create");
