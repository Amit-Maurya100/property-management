import { handleApiError, jsonOk } from "@/lib/api/response";
import { getAuthenticatedGstUserId } from "@/lib/gst/api";
import { updateTaxConfiguration, deleteTaxConfiguration } from "@/lib/gst/tax-configurations";
import { updateTaxConfigurationSchema } from "@/lib/gst/schemas";
import { withPermission } from "@/lib/permissions";

export const PATCH = withPermission(async (request, context) => {
  try {
    const params = await context?.params;
    if (!params?.id) throw new Error("NOT_FOUND");
    const userId = await getAuthenticatedGstUserId();
    const body = updateTaxConfigurationSchema.parse(await request.json());
    return jsonOk(await updateTaxConfiguration(userId, params.id, body));
  } catch (error) {
    return handleApiError(error);
  }
}, "gst_tax_configuration", "update");

export const DELETE = withPermission(async (_request, context) => {
  try {
    const params = await context?.params;
    if (!params?.id) throw new Error("NOT_FOUND");
    const userId = await getAuthenticatedGstUserId();
    await deleteTaxConfiguration(userId, params.id);
    return jsonOk({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}, "gst_tax_configuration", "delete");
