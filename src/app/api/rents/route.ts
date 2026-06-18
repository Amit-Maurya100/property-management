import { handleApiError, jsonOk } from "@/lib/api/response";
import { getAuthenticatedPropertyContext, parseFilterBigInt } from "@/lib/properties/api";
import { createRentSchema, updateRentSchema } from "@/lib/properties/schemas";
import {
  createRent,
  deleteRent,
  listRents,
  updateRent,
} from "@/lib/properties/rents";
import { withPermission } from "@/lib/permissions";

type Params = { params: Promise<{ id: string }> };

export const GET = withPermission(async (request) => {
  try {
    const ctx = await getAuthenticatedPropertyContext();
    const { searchParams } = new URL(request.url);
    const rents = await listRents(ctx, {
      tenantId: parseFilterBigInt(searchParams.get("tenantId")),
      unitId: parseFilterBigInt(searchParams.get("unitId")),
    });
    return jsonOk(rents);
  } catch (error) {
    return handleApiError(error);
  }
}, "rent", "read");

export const POST = withPermission(async (request) => {
  try {
    const ctx = await getAuthenticatedPropertyContext();
    const body = createRentSchema.parse(await request.json());
    return jsonOk(await createRent(ctx, body), 201);
  } catch (error) {
    return handleApiError(error);
  }
}, "rent", "create");
