import { handleApiError, jsonOk } from "@/lib/api/response";
import { getAuthenticatedPropertyContext, parseFilterBigInt } from "@/lib/properties/api";
import { getActiveBuildingUtilityRatesForUnit } from "@/lib/properties/building-utility-rates";
import { parseIsoDateLocal } from "@/lib/properties/rent-calculations";
import { withPermission } from "@/lib/permissions";
import { z } from "zod";

const activeUtilityRatesQuerySchema = z.object({
  unitId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const GET = withPermission(async (request) => {
  try {
    const params = new URL(request.url).searchParams;
    const query = activeUtilityRatesQuerySchema.parse({
      unitId: params.get("unitId"),
      date: params.get("date"),
    });
    const ctx = await getAuthenticatedPropertyContext();
    const unitId = parseFilterBigInt(query.unitId);
    if (!unitId) throw new Error("BAD_REQUEST:unitId is required");

    return jsonOk(
      await getActiveBuildingUtilityRatesForUnit(ctx, unitId, parseIsoDateLocal(query.date)),
    );
  } catch (error) {
    return handleApiError(error);
  }
}, "rent", "read");
