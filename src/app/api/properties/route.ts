import { handleApiError, jsonOk } from "@/lib/api/response";
import { getAuthenticatedPropertyContext } from "@/lib/properties/api";
import {
  createPropertySchema,
  updatePropertySchema,
} from "@/lib/properties/schemas";
import {
  createProperty,
  deleteProperty,
  listProperties,
  updateProperty,
} from "@/lib/properties/properties";
import { withPermission } from "@/lib/permissions";

export const GET = withPermission(async () => {
  try {
    const ctx = await getAuthenticatedPropertyContext();
    const properties = await listProperties(ctx);
    return jsonOk(properties);
  } catch (error) {
    return handleApiError(error);
  }
}, "property", "read");

export const POST = withPermission(async (request) => {
  try {
    const ctx = await getAuthenticatedPropertyContext();
    const body = createPropertySchema.parse(await request.json());
    const property = await createProperty(ctx, body);
    return jsonOk(property, 201);
  } catch (error) {
    return handleApiError(error);
  }
}, "property", "create");
