import { handleApiError, jsonOk } from "@/lib/api/response";
import { getAuthenticatedPropertyContext } from "@/lib/properties/api";
import { getRentReminderPreview, sendRentReminder } from "@/lib/properties/rents";
import { withPermission } from "@/lib/permissions";

type Params = { params: Promise<{ id: string }> };

export const GET = withPermission(async (_request, context) => {
  try {
    const ctx = await getAuthenticatedPropertyContext();
    const { id } = await (context as Params).params;
    return jsonOk(await getRentReminderPreview(ctx, id));
  } catch (error) {
    return handleApiError(error);
  }
}, "rent", "read");

export const POST = withPermission(async (_request, context) => {
  try {
    const ctx = await getAuthenticatedPropertyContext();
    const { id } = await (context as Params).params;
    return jsonOk(await sendRentReminder(ctx, id));
  } catch (error) {
    return handleApiError(error);
  }
}, "rent", "update");
