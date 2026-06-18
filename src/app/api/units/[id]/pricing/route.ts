import { handleApiError, jsonOk } from "@/lib/api/response";
import { getAuthenticatedPropertyContext } from "@/lib/properties/api";
import {
  createAvailabilitySchema,
  createPricingSchema,
  updateAvailabilitySchema,
} from "@/lib/properties/schemas";
import {
  createAvailability,
  listAvailability,
  updateAvailability,
} from "@/lib/properties/availability";
import { createPricing, listPricing } from "@/lib/properties/pricing";
import { withPermission } from "@/lib/permissions";

type Params = { params: Promise<{ id: string }> };

export const GET = withPermission(async (request, context) => {
  try {
    const ctx = await getAuthenticatedPropertyContext();
    const { id } = await (context as Params).params;
    const { searchParams } = new URL(request.url);
    if (searchParams.get("type") === "availability") {
      return jsonOk(await listAvailability(ctx, id));
    }
    return jsonOk(await listPricing(ctx, id));
  } catch (error) {
    return handleApiError(error);
  }
}, "unit", "read");

export const POST = withPermission(async (request, context) => {
  try {
    const ctx = await getAuthenticatedPropertyContext();
    const { id } = await (context as Params).params;
    const payload = await request.json();
    if (payload.type === "availability") {
      const body = createAvailabilitySchema.parse(payload.data);
      return jsonOk(await createAvailability(ctx, id, body), 201);
    }
    const body = createPricingSchema.parse(payload.data ?? payload);
    return jsonOk(await createPricing(ctx, id, body), 201);
  } catch (error) {
    return handleApiError(error);
  }
}, "unit", "update");
