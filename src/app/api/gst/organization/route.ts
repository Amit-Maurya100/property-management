import { handleApiError, jsonOk } from "@/lib/api/response";
import { getAuthenticatedGstUserId } from "@/lib/gst/api";
import {
  createOrganization,
  getOrganizationForUser,
  updateOrganization,
} from "@/lib/gst/organizations";
import { createOrganizationSchema, updateOrganizationSchema } from "@/lib/gst/schemas";
import { withPermission } from "@/lib/permissions";

export const GET = withPermission(async () => {
  try {
    const userId = await getAuthenticatedGstUserId();
    return jsonOk(await getOrganizationForUser(userId));
  } catch (error) {
    return handleApiError(error);
  }
}, "gst_organization", "read");

export const POST = withPermission(async (request) => {
  try {
    const userId = await getAuthenticatedGstUserId();
    const body = createOrganizationSchema.parse(await request.json());
    return jsonOk(await createOrganization(userId, body), 201);
  } catch (error) {
    return handleApiError(error);
  }
}, "gst_organization", "create");

export const PATCH = withPermission(async (request) => {
  try {
    const userId = await getAuthenticatedGstUserId();
    const body = updateOrganizationSchema.parse(await request.json());
    return jsonOk(await updateOrganization(userId, body));
  } catch (error) {
    return handleApiError(error);
  }
}, "gst_organization", "update");
