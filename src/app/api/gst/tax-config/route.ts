import { handleApiError, jsonOk } from "@/lib/api/response";
import { getAuthenticatedGstUserId } from "@/lib/gst/api";
import {
  createTaxConfiguration,
  deleteTaxConfiguration,
  getActiveTaxConfiguration,
  listTaxConfigurations,
  updateTaxConfiguration,
} from "@/lib/gst/tax-configurations";
import {
  createTaxConfigurationSchema,
  updateTaxConfigurationSchema,
} from "@/lib/gst/schemas";
import { withPermission } from "@/lib/permissions";

export const GET = withPermission(async () => {
  try {
    const userId = await getAuthenticatedGstUserId();
    return jsonOk(await listTaxConfigurations(userId));
  } catch (error) {
    return handleApiError(error);
  }
}, "gst_tax_configuration", "read");

export const POST = withPermission(async (request) => {
  try {
    const userId = await getAuthenticatedGstUserId();
    const body = createTaxConfigurationSchema.parse(await request.json());
    return jsonOk(await createTaxConfiguration(userId, body), 201);
  } catch (error) {
    return handleApiError(error);
  }
}, "gst_tax_configuration", "create");
