import { handleApiError, jsonOk } from "@/lib/api/response";
import { getAuthenticatedPropertyContext } from "@/lib/properties/api";
import { updateAvailabilitySchema } from "@/lib/properties/schemas";
import { deleteAvailability, updateAvailability } from "@/lib/properties/availability";
import { deletePricing } from "@/lib/properties/pricing";
import { withPermission } from "@/lib/permissions";

type Params = { params: Promise<{ id: string; recordId: string }> };

export const PATCH = withPermission(async (request, context) => {
  try {
    const ctx = await getAuthenticatedPropertyContext();
    const { recordId } = await (context as Params).params;
    const body = updateAvailabilitySchema.parse(await request.json());
    return jsonOk(await updateAvailability(ctx, recordId, body));
  } catch (error) {
    return handleApiError(error);
  }
}, "unit", "update");

export const DELETE = withPermission(async (request, context) => {
  try {
    const ctx = await getAuthenticatedPropertyContext();
    const { recordId } = await (context as Params).params;
    const { searchParams } = new URL(request.url);
    if (searchParams.get("type") === "availability") {
      await deleteAvailability(ctx, recordId);
    } else {
      await deletePricing(ctx, recordId);
    }
    return jsonOk({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}, "unit", "update");
