import { handleApiError, jsonOk } from "@/lib/api/response";
import { getAuthenticatedPropertyContext, parseFilterBigInt } from "@/lib/properties/api";
import { listRentPayments } from "@/lib/properties/payments";
import { withPermission } from "@/lib/permissions";

export const GET = withPermission(async (request) => {
  try {
    const ctx = await getAuthenticatedPropertyContext();
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status");
    const status = statusParam === "all" ? "all" : "open";

    return jsonOk(
      await listRentPayments(ctx, {
        tenantId: parseFilterBigInt(searchParams.get("tenantId")),
        status,
      }),
    );
  } catch (error) {
    return handleApiError(error);
  }
}, "payment", "read");
